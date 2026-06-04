"""Parse BIRD router configs (final/routers/router-*.conf).

We extract just enough to (a) know each router's AS, (b) enumerate its BGP
sessions and classify them as eBGP vs iBGP, and (c) list its OSPF interfaces.
The eBGP/iBGP classification is the key piece the recorder can't get reliably
from `birdc show route` alone: a route's providing protocol is named (e.g.
``bgp_c3`` / ``ibgp_z6``), and this map tells us which kind each name is.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

# A `protocol bgp <name> { ... }` block. We grab the whole brace body lazily.
_BGP_BLOCK = re.compile(
    r"protocol\s+bgp\s+(?P<name>\S+)\s*\{(?P<body>.*?)\n\}",
    re.DOTALL,
)
# `local [<ip>] as <n>;`  and  `neighbor <ip> as <n>;`
_LOCAL = re.compile(r"\blocal\s+(?:(?P<ip>\d+\.\d+\.\d+\.\d+)\s+)?as\s+(?P<asn>\d+)")
_NEIGHBOR = re.compile(r"\bneighbor\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\s+as\s+(?P<asn>\d+)")
# OSPF area interfaces: `interface "n2-6-7" {`
_OSPF_BLOCK = re.compile(r"protocol\s+ospf.*?\n\}", re.DOTALL)
_IFACE = re.compile(r'interface\s+"(?P<iface>[^"]+)"')


@dataclass
class BgpSession:
    name: str
    kind: str  # "ebgp" | "ibgp"
    local_ip: str | None
    local_as: int
    neighbor_ip: str
    peer_as: int


@dataclass
class Protocol:
    """One `protocol …{}` block — the bird-internals model for the UI."""
    name: str          # display name, e.g. "ospf v2", "bgp ibgp_z7", "kernel"
    kind: str          # device|direct|kernel|ospf|bgp|static|other
    import_filter: str | None = None  # the `import …` clause, verbatim
    export_filter: str | None = None  # the `export …` clause, verbatim
    # BGP extras
    neighbor_ip: str | None = None
    local_ip: str | None = None
    local_as: int | None = None
    peer_as: int | None = None
    bgp_kind: str | None = None       # ebgp|ibgp
    next_hop_self: bool = False
    # OSPF extras
    interfaces: list[str] = field(default_factory=list)


@dataclass
class RouterConfig:
    router: str  # e.g. "router-z7"
    local_as: int | None = None
    bgp: dict[str, BgpSession] = field(default_factory=dict)  # keyed by proto name
    ospf_ifaces: list[str] = field(default_factory=list)
    has_ospf: bool = False
    protocols: list[Protocol] = field(default_factory=list)

    def session_kind(self, proto_name: str) -> str | None:
        s = self.bgp.get(proto_name)
        return s.kind if s else None


def _protocol_blocks(text: str):
    """Yield (header, body) for each top-level `protocol …{…}`, brace-matched
    so nested braces (e.g. OSPF area/interface blocks) don't end it early."""
    i = 0
    while True:
        m = re.search(r"\bprotocol\b\s+([^{]+?)\{", text[i:])
        if not m:
            return
        header = m.group(1).strip()
        start = i + m.end() - 1  # index of the opening '{'
        depth, j = 0, start
        while j < len(text):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        yield header, text[start + 1:j]
        i = j + 1


def parse_protocols(text: str) -> list[Protocol]:
    protos: list[Protocol] = []
    for header, body in _protocol_blocks(text):
        kind = header.split()[0]
        imp = re.search(r"\bimport\s+([^;]+);", body)
        exp = re.search(r"\bexport\s+([^;]+);", body)
        p = Protocol(
            name=header, kind=kind,
            import_filter=imp.group(1).strip() if imp else None,
            export_filter=exp.group(1).strip() if exp else None,
        )
        if kind == "bgp":
            lm = _LOCAL.search(body)
            nm = _NEIGHBOR.search(body)
            if lm:
                p.local_ip = lm.group("ip")
                p.local_as = int(lm.group("asn"))
            if nm:
                p.neighbor_ip = nm.group("ip")
                p.peer_as = int(nm.group("asn"))
            if p.local_as is not None and p.peer_as is not None:
                p.bgp_kind = "ibgp" if p.local_as == p.peer_as else "ebgp"
            p.next_hop_self = "next hop self" in body
        elif kind == "ospf":
            p.interfaces = _IFACE.findall(body)
        protos.append(p)
    return protos


def parse_config_text(router: str, text: str) -> RouterConfig:
    cfg = RouterConfig(router=router)

    # Strip line comments so `#` notes after statements don't confuse regexes.
    text = re.sub(r"#.*", "", text)

    asns: list[int] = []
    for m in _BGP_BLOCK.finditer(text):
        body = m.group("body")
        lm = _LOCAL.search(body)
        nm = _NEIGHBOR.search(body)
        if not (lm and nm):
            continue
        local_as = int(lm.group("asn"))
        peer_as = int(nm.group("asn"))
        asns.append(local_as)
        cfg.bgp[m.group("name")] = BgpSession(
            name=m.group("name"),
            kind="ibgp" if local_as == peer_as else "ebgp",
            local_ip=lm.group("ip"),
            local_as=local_as,
            neighbor_ip=nm.group("ip"),
            peer_as=peer_as,
        )

    if asns:
        # All BGP blocks in a config share the router's own ASN.
        cfg.local_as = max(set(asns), key=asns.count)

    om = _OSPF_BLOCK.search(text)
    if om:
        cfg.has_ospf = True
        cfg.ospf_ifaces = _IFACE.findall(om.group(0))

    cfg.protocols = parse_protocols(text)

    return cfg


def parse_router_dir(routers_dir: Path) -> dict[str, RouterConfig]:
    """Parse every router-*.conf in a directory, keyed by router name."""
    out: dict[str, RouterConfig] = {}
    for path in sorted(routers_dir.glob("router-*.conf")):
        router = path.stem  # "router-z7"
        out[router] = parse_config_text(router, path.read_text(encoding="utf-8"))
    return out


if __name__ == "__main__":  # quick manual check
    import json
    import sys

    d = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("final/routers")
    cfgs = parse_router_dir(d)
    for name, c in cfgs.items():
        sessions = {n: s.kind for n, s in c.bgp.items()}
        print(f"{name}: AS{c.local_as} ospf={c.has_ospf} bgp={json.dumps(sessions)}")
