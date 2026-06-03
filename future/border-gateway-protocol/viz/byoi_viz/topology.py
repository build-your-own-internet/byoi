"""Build the network topology that the visualizer draws.

Ground truth for *wiring* comes from Docker itself (`docker network inspect`):
every BYOI bridge network is one L2 broadcast segment, and its connected
containers + their IPs give us the physical graph. We then enrich it with
routing semantics from the BIRD configs (AS numbers, eBGP/iBGP/OSPF edges).

Org grouping (the colored "cloud" boxes in the network map) is taken from the
router's name letter -- router-z7 -> z -> Zayo -- which is how the BYOI naming
scheme encodes membership. AS membership (the dashed boundary) comes from the
config's `local as`.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .configparse import RouterConfig, parse_router_dir

# Router-name letter -> (org key, human label, AS number, brand color).
ORG_BY_LETTER = {
    "c": ("comcast", "Comcast", 100, "#7b1fa2"),
    "z": ("zayo", "Zayo Group", 200, "#f9a825"),
    "t": ("telia", "Telia Carrier", 400, "#00897b"),
    "a": ("aws", "Amazon Web Services", 400, "#ff8f00"),
    "n": ("netnod", "Netnod", 400, "#5d4037"),
    "i": ("isc", "ISC", 400, "#1565c0"),
    "v": ("verisign", "Verisign", 400, "#c62828"),
    "g": ("google", "Google Cloud", 400, "#2e7d32"),
    "s": ("supercorp", "SuperCorp", 400, "#455a64"),
    "r": ("ripe", "RIPE NCC", 400, "#6a1b9a"),
}
# IP first octet -> org key (for labeling segments by which org owns the prefix).
ORG_BY_OCTET = {
    1: "comcast", 2: "zayo", 3: "telia", 4: "aws", 8: "google", 9: "supercorp",
    100: "isc", 101: "netnod", 102: "verisign", 103: "ripe",
}

NET_PREFIX = "build-your-own-internet-"
ROUTER_PREFIX = NET_PREFIX + "router-"


def _docker_json(args: list[str]) -> list | dict:
    out = subprocess.run(
        ["docker", *args], check=True, capture_output=True, text=True
    ).stdout
    return json.loads(out)


def list_router_containers() -> list[str]:
    """Return container names for running BYOI routers."""
    out = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}", "--filter", f"name={ROUTER_PREFIX}"],
        check=True, capture_output=True, text=True,
    ).stdout
    return sorted(n for n in out.split() if n.startswith(ROUTER_PREFIX))


def short_router(container: str) -> str:
    """build-your-own-internet-router-z7 -> router-z7."""
    return container[len(NET_PREFIX):]


def org_for_router(router: str) -> tuple[str, str, int, str]:
    letter = router.split("-")[-1][0]  # 'z' from router-z7
    return ORG_BY_LETTER.get(letter, ("unknown", "Unknown", 0, "#999999"))


def build_topology(routers_dir: Path) -> dict:
    cfgs = parse_router_dir(routers_dir)
    networks = _docker_json(["network", "ls", "--format", "{{.Name}}"]) if False else None

    # Enumerate BYOI networks and inspect them in one call.
    net_names = subprocess.run(
        ["docker", "network", "ls", "--format", "{{.Name}}", "--filter", f"name={NET_PREFIX}"],
        check=True, capture_output=True, text=True,
    ).stdout.split()
    insp = _docker_json(["network", "inspect", *net_names]) if net_names else []

    routers = list_router_containers()
    router_set = {short_router(c) for c in routers}

    nodes: dict[str, dict] = {}
    for c in routers:
        r = short_router(c)
        org_key, org_label, asn, color = org_for_router(r)
        cfg: RouterConfig | None = cfgs.get(r)
        nodes[r] = {
            "id": r,
            "label": r.split("-")[-1].upper(),  # Z7
            "org": org_key,
            "org_label": org_label,
            # AS is seeded only from an explicit `local as` here; routers without
            # one (OSPF-only, default config) get their AS inferred below.
            "as": (cfg.local_as if cfg and cfg.local_as else None),
            "color": color,
            "ips": [],
        }

    segments: list[dict] = []
    ip_to_router: dict[str, str] = {}
    for net in insp:
        subnet = ""
        ipam = net.get("IPAM", {}).get("Config") or []
        if ipam:
            subnet = ipam[0].get("Subnet", "")
        members: list[list[str]] = []
        for cid, c in (net.get("Containers") or {}).items():
            name = c.get("Name", "")
            # network inspect returns the full container_name; normalize it.
            r = short_router(name) if name.startswith(NET_PREFIX) else name
            ip = (c.get("IPv4Address") or "").split("/")[0]
            if r in nodes and ip:
                nodes[r]["ips"].append(ip)
                ip_to_router[ip] = r
            members.append([r, ip])
        octet = int(subnet.split(".")[0]) if subnet else 0
        segments.append({
            "id": net["Name"][len(NET_PREFIX):] if net["Name"].startswith(NET_PREFIX) else net["Name"],
            "subnet": subnet,
            "owner_org": ORG_BY_OCTET.get(octet, "unknown"),
            "members": members,
        })

    for n in nodes.values():
        n["ips"].sort()

    # Routing edges from configs: BGP sessions (resolve neighbor IP -> router).
    links: list[dict] = []
    seen: set[tuple] = set()
    for r, cfg in cfgs.items():
        if r not in nodes:
            continue
        for sess in cfg.bgp.values():
            peer = ip_to_router.get(sess.neighbor_ip)
            if not peer or peer not in nodes:
                continue
            key = tuple(sorted([r, peer])) + (sess.kind,)
            if key in seen:
                continue
            seen.add(key)
            links.append({
                "source": r, "target": peer,
                "relation": sess.kind,  # ebgp | ibgp
            })

    # OSPF adjacencies come straight from the routers: `show ospf neighbors`
    # lists each neighbor's interface IP, which we map back to a router. This is
    # authoritative (an adjacency that actually formed), unlike guessing from
    # shared segments -- many shared segments are BGP-peering-only.
    from . import birdc
    for c in routers:
        r = short_router(c)
        out = subprocess.run(
            ["docker", "exec", c, "birdc", "show", "ospf", "neighbors"],
            capture_output=True, text=True,
        ).stdout
        for neighbor_ip, _iface in birdc.parse_ospf_neighbors(out):
            peer = ip_to_router.get(neighbor_ip)
            if not peer or peer not in nodes:
                continue
            key = tuple(sorted([r, peer])) + ("ospf",)
            if key in seen:
                continue
            seen.add(key)
            links.append({"source": r, "target": peer, "relation": "ospf"})

    # Infer AS membership for routers that don't declare `local as` (the
    # OSPF-only, default-config routers). OSPF never crosses an AS boundary, so
    # a router shares its AS with everything it's OSPF-adjacent to. We seed from
    # the routers that DO declare an AS and flood that label across OSPF edges.
    # Because OSPF adjacencies are read live, this tracks AS changes on its own:
    # when an org is peeled into its own AS, its cross-AS links stop being OSPF
    # and the flood follows the new boundary -- no map edits needed.
    ospf_adj: dict[str, set[str]] = {r: set() for r in nodes}
    for l in links:
        if l["relation"] == "ospf":
            ospf_adj[l["source"]].add(l["target"])
            ospf_adj[l["target"]].add(l["source"])

    as_of = {r: n["as"] for r, n in nodes.items() if n["as"] is not None}
    changed = True
    while changed:  # propagate until no unknown router can learn an AS
        changed = False
        for r in nodes:
            if r in as_of:
                continue
            for nb in ospf_adj[r]:
                if nb in as_of:
                    as_of[r] = as_of[nb]
                    changed = True
                    break

    # Finalize. A router with neither an explicit AS nor any OSPF neighbor (a
    # true island) falls back to the name-letter guess as a last resort.
    for r, n in nodes.items():
        n["as"] = as_of.get(r) or org_for_router(r)[2]

    as_groups: dict[str, list[str]] = {}
    org_groups: dict[str, list[str]] = {}
    for n in nodes.values():
        as_groups.setdefault(str(n["as"]), []).append(n["id"])
        org_groups.setdefault(n["org"], []).append(n["id"])

    return {
        "nodes": list(nodes.values()),
        "segments": segments,
        "links": links,
        "as_groups": as_groups,
        "org_groups": org_groups,
        "orgs": {k: {"label": v[1], "as": v[2], "color": v[3]}
                 for k, v in ORG_BY_LETTER.items()},
        "ip_to_router": ip_to_router,
    }


if __name__ == "__main__":
    import sys
    d = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("final/routers")
    topo = build_topology(d)
    print(f"nodes={len(topo['nodes'])} segments={len(topo['segments'])} "
          f"links={len(topo['links'])}")
    print("AS groups:", {k: len(v) for k, v in topo["as_groups"].items()})
    print("Org groups:", {k: len(v) for k, v in topo["org_groups"].items()})
    for l in topo["links"]:
        print(f"  {l['source']} --{l['relation']}-- {l['target']}")
