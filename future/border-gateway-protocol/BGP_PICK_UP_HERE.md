# BGP and OSPF Configuration Review - 2026-04-20

## Overview
We're examining the BGP and OSPF routing configuration in the `final/` directory. The network simulates:
- **AS100 (Comcast)**: ISP network, leaf network (eyeballs)
- **AS200 (Zayo)**: Transit network with routers Z5, Z6, Z7, Z8 - uses OSPF internally and BGP for external peering
- **AS400 (AWS/Telia/Netnod/etc)**: Customer network with routers A4, N2, T5, T6, I2, etc. - uses OSPF internally and BGP for external peering

Border routers run both BGP (to peer across ASes) and OSPF (for internal distribution). The 2.0.0.0/8 network belongs to AS200, while AS400 uses various other networks (3.x, 4.x, 101.x, etc.).

## Questions Explored

### 1. Why Doesn't BGP Have Interface Statements?

**Answer:** BGP establishes point-to-point TCP connections to specific neighbor IPs. Example from router-a4.conf:
```
protocol bgp bgp_z7 {
  local as 400;
  neighbor 2.4.0.7 as 200;
  source address 2.4.0.4;
  ...
}
```

BIRD automatically determines which interface has IP 2.4.0.4 and uses it. No interface statement needed.

**Why OSPF needs interfaces:** OSPF multicasts hello packets on network segments to discover neighbors. BGP just needs to know the neighbor's IP address for TCP connection.

### 2. The OSPF Export Filter

From router-a4.conf line 29:
```
export where net !~ [ 2.0.0.0/8+ ] || source = RTS_BGP;
```

**What it means:**
- `net !~ [ 2.0.0.0/8+ ]` = "networks that do NOT match 2.0.0.0/8" (AS400's own networks)
- `||` = OR
- `source = RTS_BGP` = "routes that were learned from BGP"

**Translation:** "Advertise into OSPF any route that is NOT in 2.0/8 (our internal networks), OR any route that came from BGP (even if it IS in 2.0/8)."

**Purpose:** 
- Advertise AS400's own networks (3.x, 4.x, 101.x, etc.) into OSPF ✓
- Advertise BGP-learned AS200 networks (2.x) into OSPF ✓
- Block OSPF-learned AS200 networks from being re-advertised ✗

### 3. Route Advertisement Path: 2.6.7.0/24 from Z7 to AS400

**Step 1: Network exists on Z7**
- Z7 has interface "n2-6-7" (2.6.7.0/24) in OSPF
- `protocol direct` automatically installs directly-connected networks into BIRD's routing table

**Step 2: Z7 advertises to A4 via BGP**
- Z7's BGP config exports: `export where net ~ [ 2.0.0.0/8+ ];`
- Matches 2.6.7.0/24 ✓
- BGP UPDATE sent to A4
- `next hop self` sets next hop to Z7's BGP peer IP (2.4.0.7)

**Step 3: A4 receives via BGP**
- A4's BGP config: `import all` accepts the route
- Route installed in BIRD's routing table with `source = RTS_BGP`
- `next hop self` prepares for redistribution (will use A4's OSPF-visible IP)

**Step 4: A4 redistributes into OSPF**
- A4's OSPF export filter: `export where net !~ [ 2.0.0.0/8+ ] || source = RTS_BGP;`
- 2.6.7.0/24 matches 2.0/8 (first condition FALSE)
- BUT `source = RTS_BGP` is TRUE ✓
- A4 generates OSPF LSA with next hop = **4.1.0.4** (A4's IP on the OSPF network n4-1)
  - NOT 2.4.0.4! That's only used for BGP peering and is unreachable via OSPF

**Step 5: OSPF propagates**
- LSA floods through AS400's OSPF Area 0
- All routers learn: "To reach 2.6.7.0/24, send to A4 at 4.1.0.4"
- Router N2, T5, T6, I2, etc. all install the route

## Key Concepts Clarified

### "Protocol Direct"
Lines 12-14 in all configs:
```
protocol direct {
  interface "*";
}
```
Automatically installs directly-connected network prefixes into BIRD's routing table when interfaces come up.

### "Import All" in BGP
```
import all;
```
Means: "Install all routes received from this BGP peer into BIRD's routing table." It's a filter controlling what gets installed locally.

### "Next Hop Self" in BGP
```
next hop self;
```
Changes the BGP next hop attribute to the router's own IP. Critical for iBGP or when redistributing into IGPs, so internal routers know where to send traffic (to the border router, not to the external peer's unreachable IP).

### Next Hop in OSPF LSAs
When a border router advertises an external route into OSPF, the next hop MUST be an IP address reachable via OSPF. For A4, that's its IP on the n4-1 interface (e.g., 4.1.0.4), NOT its BGP peering IP (2.4.0.4).

## OPEN QUESTIONS

### Question 1: Loop Prevention Scenario

**Walk through a concrete scenario showing why `net !~ 2.0.0.0/8` prevents a routing loop.**

Hypothesis:
1. A4 learns 2.6.7.0/24 from Z7 via BGP
2. A4 advertises it into OSPF (source = RTS_BGP allows this)
3. N2 learns 2.6.7.0/24 from A4 via OSPF
4. N2's route now has source = RTS_OSPF (not RTS_BGP)
5. N2 evaluates export filter: 
   - `net !~ [ 2.0.0.0/8+ ]` is FALSE (2.6.7.0/24 IS in 2.0/8)
   - `source = RTS_BGP` is FALSE (source is RTS_OSPF)
   - Route NOT advertised back into OSPF ✓

But we need to understand: **Where would the loop occur without this filter?** Would N2 advertise back to A4? Would multiple border routers create a loop? What exact sequence of advertisements creates the problem?

### Question 2: AS200 BGP Export Policy Bug

Z7's export to AS400 (line 63):
```
export where net ~ [ 2.0.0.0/8+ ];
```

**Problem:** This ONLY advertises AS200's own networks (2.0/8). If AS200 is a transit network, shouldn't it advertise ALL routes it knows (e.g., 1.0/8 from AS100)?

**Expected behavior:** AS200 should advertise all routes it can reach, not just its own. The export filter should probably be:
```
export where net !~ [ 4.0.0.0/8+ ];  # Export everything except AS400's own networks
```

Or more generally:
```
export all;  # Export everything, let the peer filter
```

**TODO:** Review all AS200 border routers (Z5, Z6, Z7, Z8) and fix export policies for transit behavior.

### Question 3: OSPF-Learned Route Propagation

**Scenario:** Suppose there's an internal OSPF-only router (no specific config file, using shared config). How does it learn about 2.0/8 routes?

**Answer:** Once A4 advertises a BGP-learned route into OSPF, it becomes an OSPF External LSA. These LSAs flood automatically throughout the OSPF area. Internal routers receive the LSA, install the route, and forward traffic to the advertising router (A4). They don't need to re-advertise because OSPF's link-state protocol handles flooding.

**But the question asked:** "If T5 learns about 2/8 from OSPF (not from its own BGP session), how does it tell other routers about 2/8 if it can't advertise OSPF-learned 2/8 routes?"

**Answer:** T5 doesn't need to! OSPF flooding handles distribution. When A4 originates an External LSA for 2.6.7.0/24:
1. A4 floods LSA to all OSPF neighbors (including T5)
2. T5 receives LSA, installs route, forwards LSA to ITS neighbors
3. LSA propagates throughout Area 0
4. Every router gets the LSA directly via flooding, not via T5's export filter

The export filter controls what routes THIS router ORIGINATES into OSPF, not what LSAs it FORWARDS.

**TODO:** Verify this understanding - does BIRD's OSPF implementation forward all LSAs regardless of export filters, or do export filters affect LSA flooding?

## Configuration Files Examined

- `final/routers/router-a4.conf` - AS400 border router (BGP + OSPF)
- `final/routers/router-z7.conf` - AS200 border router (BGP + OSPF)
- `final/routers/router-n2.conf` - AS400 border router (BGP + OSPF)
- `final/routers/router-t5.conf` - AS400 border router (BGP + OSPF)
- `final/routers/router-i2.conf` - AS400 border router (BGP + OSPF)

Note: Some routers may use a shared default configuration file if they don't have a specific config.

## Next Steps

1. **Fix AS200 BGP export policies** - Z7 (and likely Z5, Z6, Z8) should advertise transit routes, not just 2.0/8
2. **Clarify loop prevention** - Walk through the exact sequence that would create a loop without the filter
3. **Verify OSPF LSA forwarding** - Confirm that export filters don't affect LSA flooding
4. **Test the configuration** - Use `docker-compose up` and verify routing tables show expected paths
5. **Check shared router config** - Examine the default config used by routers without specific files

## TODO List

- Peel off google
- Peel off netnod
- Peel off Supercorp
- Peel off verisign, isc, amazon
- UPDATE OUR RIP CHAPTER CUZ UBUNTU 26.04
- Pin our Ubuntu releases otherwise stuff will rot
- Dockerfile too?

Problems/validation:
- verify that, for each and every router: it has the routes it should know about and no others.
- does BYOI validate pass rn?
- 



## Useful Commands for Testing

```bash
# Show routes learned by a router
docker exec router-a4 birdc show route

# Show BGP sessions
docker exec router-a4 birdc show protocols

# Show OSPF neighbors
docker exec router-a4 birdc show ospf neighbors

# Show specific route details
docker exec router-a4 birdc show route for 2.6.7.0/24 all
```
