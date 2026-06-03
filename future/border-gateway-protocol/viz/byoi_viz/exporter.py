"""Collapse a recorded SQLite run into a compact JSON bundle for the viewer.

The viewer animates *route propagation*: pick a prefix, scrub time, and watch
which routers have learned it and over which protocol. So for every prefix we
emit, per router, the sequence of *change events* -- the moments the best route
to that prefix appears or changes class/next-hop -- rather than a dense
per-snapshot dump. A router that learns 1.1.0.0/16 via eBGP at t=4s and never
changes is just one event.

Next-hop IPs are resolved to router ids (via the topology's ip_to_router map) so
the viewer can light up the *edge* the route arrived over, colored by protocol.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def export_run(db_path: Path, out_path: Path | None = None) -> Path:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    topo = json.loads(conn.execute(
        "SELECT value FROM meta WHERE key='topology'").fetchone()[0])
    ip_to_router: dict[str, str] = topo.get("ip_to_router", {})

    snaps = [dict(seq=r["seq"], t_ms=r["t_ms"], wall=r["wall"])
             for r in conn.execute("SELECT seq, t_ms, wall FROM snapshots ORDER BY seq")]
    seqs = [s["seq"] for s in snaps]

    # Pull best routes (and direct routes, which mark origins) across all snaps.
    rows = conn.execute(
        "SELECT seq, router, prefix, proto_class, nexthop, iface, as_path "
        "FROM routes WHERE best=1 ORDER BY prefix, router, seq"
    ).fetchall()

    # state[prefix][router] = list of event tuples (see EVENT layout below).
    # EVENT = [seq, class, nexthop_router, nexthop_ip, as_path, iface]
    # The viewer's animation reads [0..2]; the routing-table view reads [3..5].
    from collections import defaultdict
    state: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    owner_org: dict[str, str] = {}
    origins: dict[str, set] = defaultdict(set)

    # Map a prefix to the org that owns it, via the segment list.
    seg_by_subnet = {s["subnet"]: s for s in topo.get("segments", [])}

    for row in rows:
        prefix = row["prefix"]
        router = row["router"]
        cls = row["proto_class"]
        nh_ip = row["nexthop"]
        nh_router = ip_to_router.get(nh_ip or "", None)
        state[prefix][router].append(
            (row["seq"], cls, nh_router, nh_ip, row["as_path"], row["iface"]))
        if cls == "direct":
            origins[prefix].add(router)

    prefixes = []
    for prefix, per_router in state.items():
        # owner org: prefer the segment that owns this exact subnet, else infer
        # from an origin router's org.
        seg = seg_by_subnet.get(prefix)
        org = seg["owner_org"] if seg else None
        if not org and origins.get(prefix):
            any_origin = sorted(origins[prefix])[0]
            org = next((n["org"] for n in topo["nodes"] if n["id"] == any_origin), None)

        events: dict[str, list] = {}
        for router, seq_list in per_router.items():
            # Collapse consecutive identical states into change events. A change
            # in class, next-hop, AS-path or iface starts a new event.
            collapsed = []
            last = None
            for seq, cls, nh, ip, ap, ifc in seq_list:
                cur = (cls, nh, ip, ap, ifc)
                if cur != last:
                    collapsed.append([seq, cls, nh, ip, ap, ifc])
                    last = cur
            events[router] = collapsed

        prefixes.append({
            "prefix": prefix,
            "owner_org": org or "unknown",
            "origins": sorted(origins.get(prefix, [])),
            "events": events,
        })

    # Sort prefixes: origin (direct) prefixes first, then by name.
    prefixes.sort(key=lambda p: (not p["origins"], p["prefix"]))

    bundle = {
        "topology": topo,
        "snapshots": snaps,
        "seq_count": len(seqs),
        "prefixes": prefixes,
        "legend": [
            {"key": "eBGP", "label": "eBGP (between ASes)", "color": "#e53935"},
            {"key": "iBGP", "label": "iBGP (within an AS)", "color": "#fb8c00"},
            {"key": "OSPF", "label": "OSPF (intra-area)", "color": "#1e88e5"},
            {"key": "OSPF-E1", "label": "OSPF External T1", "color": "#8e24aa"},
            {"key": "OSPF-E2", "label": "OSPF External T2", "color": "#00acc1"},
            {"key": "direct", "label": "Directly connected", "color": "#43a047"},
        ],
    }

    out_path = out_path or db_path.with_suffix(".json")
    out_path.write_text(json.dumps(bundle), encoding="utf-8")
    conn.close()
    print(f"Exported {len(prefixes)} prefixes, {len(snaps)} snapshots -> {out_path}")
    return out_path


def main(argv=None):
    p = argparse.ArgumentParser(description="Export a recorded run to JSON")
    p.add_argument("db", type=Path, help="run-*.db produced by the recorder")
    p.add_argument("--out", type=Path, default=None)
    args = p.parse_args(argv)
    return export_run(args.db, args.out)


if __name__ == "__main__":
    main()
