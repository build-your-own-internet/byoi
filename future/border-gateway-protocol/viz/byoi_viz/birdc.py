"""Parse BIRD 3 `birdc` output.

We care about two commands:

  * ``show route all``  -> the RIB: one or more *paths* per prefix, each with a
    providing protocol, a best-path marker, a next hop / interface, and protocol
    attributes (BGP.as_path, OSPF type & metrics).
  * ``show protocols``  -> session table: protocol name, kind, state, uptime.

`birdc` output is line-oriented, not JSON, so we parse text. Bird 3.2 prints a
route block like this (attribute lines are tab-indented)::

    8.1.0.0/16           unicast [ibgp_z7 19:11:04.657] * (100) [AS400i]
            via 2.6.7.7 on n2-6-7
            source: BGP
            bgp_path: 400
            bgp_next_hop: 2.6.7.7
            bgp_local_pref: 100
    2.6.7.0/24           unicast [ospf1 19:11:05.232] * E2 (150/40/10000) [2.8.0.3]
            via 3.7.8.8 on eth2
            source: OSPF-E2
            ospf_metric1: 40
            ospf_metric2: 10000

The authoritative type is the ``source:`` line (BGP / OSPF / OSPF-E2 / device /
static). A subsequent path for the *same* prefix omits the leading prefix (just
whitespace), so we carry the last prefix forward. Directly-attached routes use
``dev <iface>`` instead of ``via <nh> on <iface>``.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Header line of a path. Prefix is optional (continuation paths omit it).
_PATH_HDR = re.compile(
    r"^(?P<prefix>\d+\.\d+\.\d+\.\d+/\d+)?\s+"
    r"(?P<kind>unicast|blackhole|unreachable|prohibited)\s+"
    r"\[(?P<proto>\S+)\s+(?P<since>[\d:.]+)(?:\s+from\s+(?P<from>\S+))?\]\s*"
    r"(?P<best>\*)?\s*"
    r"(?P<ext>E1|E2)?\s*"
    r"(?:\((?P<metric>[^)]*)\))?"
)
_VIA = re.compile(r"^\s+via\s+(?P<nh>\S+)\s+on\s+(?P<iface>\S+)")
_VIA_DEV = re.compile(r"^\s+dev\s+(?P<iface>\S+)")  # directly-attached
_SOURCE = re.compile(r"^\s+source:\s+(?P<src>\S+)")
_ASPATH = re.compile(r"^\s+bgp_path:\s+(?P<path>.*?)\s*$")
_BGP_NH = re.compile(r"^\s+bgp_next_hop:\s+(?P<nh>\S+)")
_LOCALPREF = re.compile(r"^\s+bgp_local_pref:\s+(?P<lp>\d+)")
_OSPF_M1 = re.compile(r"^\s+ospf_metric1:\s+(?P<m>\d+)")
_OSPF_M2 = re.compile(r"^\s+ospf_metric2:\s+(?P<m>\d+)")


@dataclass
class Route:
    prefix: str
    proto: str  # providing protocol name, e.g. "bgp_c3", "ospf1", "ibgp_z6"
    base_type: str = ""  # "BGP" | "OSPF" | "OSPF-E2" | "device" | "static" ...
    best: bool = False
    nexthop: str | None = None
    iface: str | None = None
    as_path: str | None = None
    local_pref: int | None = None
    metric1: int | None = None
    metric2: int | None = None
    since: str | None = None

    def proto_class(self, bgp_kind: dict[str, str] | None = None) -> str:
        """Color/category key. bgp_kind maps proto name -> 'ebgp'|'ibgp'."""
        t = self.base_type
        if t.startswith("OSPF-E2"):
            return "OSPF-E2"
        if t.startswith("OSPF-E1"):
            return "OSPF-E1"
        if t.startswith("OSPF"):
            return "OSPF"
        if t == "BGP":
            kind = (bgp_kind or {}).get(self.proto)
            if kind == "ibgp":
                return "iBGP"
            if kind == "ebgp":
                return "eBGP"
            # Fall back to a name heuristic when no config map is supplied.
            return "iBGP" if self.proto.startswith("ibgp") else "eBGP"
        if t in ("device", "direct", "inherit"):
            return "direct"
        if t == "static":
            return "static"
        return t or "other"


def parse_routes(text: str) -> list[Route]:
    routes: list[Route] = []
    cur: Route | None = None
    last_prefix: str | None = None

    for line in text.splitlines():
        m = _PATH_HDR.match(line)
        if m:
            prefix = m.group("prefix") or last_prefix
            last_prefix = prefix
            cur = Route(
                prefix=prefix or "?",
                proto=m.group("proto"),
                best=bool(m.group("best")),
                since=m.group("since"),
            )
            ext = m.group("ext")
            if ext:  # E1/E2 appears on the header before Type: confirms it
                cur.base_type = f"OSPF-{ext}"
            routes.append(cur)
            continue
        if cur is None:
            continue
        vm = _VIA.match(line)
        if vm:
            cur.nexthop = vm.group("nh")
            cur.iface = vm.group("iface")
            continue
        dm = _VIA_DEV.match(line)
        if dm and cur.iface is None:
            cur.iface = dm.group("iface")
            continue
        sm = _SOURCE.match(line)
        if sm:
            # Authoritative type: BGP / OSPF / OSPF-E2 / OSPF-E1 / device / static.
            cur.base_type = sm.group("src")
            continue
        m1 = _OSPF_M1.match(line)
        if m1:
            cur.metric1 = int(m1.group("m"))
            continue
        m2 = _OSPF_M2.match(line)
        if m2:
            cur.metric2 = int(m2.group("m"))
            continue
        am = _ASPATH.match(line)
        if am:
            cur.as_path = am.group("path").strip()
            continue
        bm = _BGP_NH.match(line)
        if bm and cur.nexthop is None:
            cur.nexthop = bm.group("nh")
            continue
        lm = _LOCALPREF.match(line)
        if lm:
            cur.local_pref = int(lm.group("lp"))
            continue

    return routes


# ---- show protocols -------------------------------------------------------

_PROTO_ROW = re.compile(
    r"^(?P<name>\S+)\s+(?P<proto>BGP|OSPF|Direct|Kernel|Device|Static|RPKI)\s+"
    r"(?P<table>\S+)\s+(?P<state>up|down|start)\s+(?P<since>\S+(?:\s+\S+)?)\s*(?P<info>.*)$"
)


@dataclass
class ProtoState:
    name: str
    proto: str
    state: str  # up/down/start
    since: str
    info: str = ""


def parse_protocols(text: str) -> list[ProtoState]:
    out: list[ProtoState] = []
    for line in text.splitlines():
        if line.startswith("Name") or not line.strip():
            continue
        m = _PROTO_ROW.match(line)
        if not m:
            continue
        out.append(
            ProtoState(
                name=m.group("name"),
                proto=m.group("proto"),
                state=m.group("state"),
                since=m.group("since").strip(),
                info=m.group("info").strip(),
            )
        )
    return out


# ---- show ospf neighbors --------------------------------------------------

_IP = re.compile(r"\b(\d+\.\d+\.\d+\.\d+)\b")


def parse_ospf_neighbors(text: str) -> list[tuple[str, str]]:
    """Return [(neighbor_router_ip, iface), ...] from `show ospf neighbors`.

    The last column ("Router IP") is the neighbor's interface address, which we
    can map back to a router. Only rows in a Full state represent a usable
    adjacency, but we accept any row that has the columns.
    """
    out: list[tuple[str, str]] = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("Router ID") or s.endswith(":") or "ready" in s:
            continue
        ips = _IP.findall(s)
        if len(ips) < 2:
            continue
        toks = s.split()
        # Layout: <RouterID> <Pri> <State> <DTime> <Interface> <RouterIP>
        iface = toks[-2] if len(toks) >= 2 else ""
        neighbor_ip = ips[-1]
        out.append((neighbor_ip, iface))
    return out


if __name__ == "__main__":
    import sys

    data = sys.stdin.read()
    print("=== routes ===")
    for r in parse_routes(data):
        star = "*" if r.best else " "
        print(f"{star} {r.prefix:20} {r.proto_class():8} via={r.nexthop} "
              f"on={r.iface} proto={r.proto} aspath={r.as_path!r}")
