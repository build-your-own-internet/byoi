"""Poll every BYOI router's BIRD state on an interval and store it in SQLite.

Run standalone::

    python3 -m viz.byoi_viz.recorder --duration 180 --interval 2

or let ``byoi-rebuild --record-data`` invoke it right after the network comes
up, so the recording captures the network *converging* from cold start.

Each poll ("snapshot") shells `birdc show route all` and `birdc show protocols`
into every router in parallel, parses them, and writes one row per route and
per protocol session, tagged with the snapshot sequence + elapsed time. The
exporter later collapses these snapshots into a propagation timeline.
"""
from __future__ import annotations

import argparse
import sqlite3
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import birdc
from .configparse import parse_router_dir
from .topology import build_topology, list_router_containers, short_router

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS snapshots (
    seq INTEGER PRIMARY KEY, t_ms INTEGER, wall TEXT
);
CREATE TABLE IF NOT EXISTS routes (
    seq INTEGER, router TEXT, prefix TEXT, proto_class TEXT, proto TEXT,
    nexthop TEXT, iface TEXT, as_path TEXT, metric1 INTEGER, metric2 INTEGER,
    best INTEGER
);
CREATE TABLE IF NOT EXISTS protocols (
    seq INTEGER, router TEXT, name TEXT, proto TEXT, state TEXT,
    info TEXT, since TEXT, imported INTEGER, exported INTEGER, preferred INTEGER
);
CREATE INDEX IF NOT EXISTS idx_routes_seq ON routes(seq);
CREATE INDEX IF NOT EXISTS idx_routes_prefix ON routes(prefix);
CREATE INDEX IF NOT EXISTS idx_proto_seq ON protocols(seq);
"""


_SPLIT = "@@@BYOI-SPLIT@@@"


def _poll_router(container: str, bgp_kind: dict[str, str]):
    """Return (router, route_rows, proto_rows) for one router at one snapshot.

    Both birdc commands run in a single `docker exec` to avoid paying the
    container-exec startup cost twice per router per snapshot.
    """
    router = short_router(container)
    try:
        combined = subprocess.run(
            ["docker", "exec", container, "sh", "-c",
             f"birdc show route all; echo {_SPLIT}; birdc show protocols all"],
            check=True, capture_output=True, text=True, timeout=15.0,
        ).stdout
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return router, [], []
    route_out, _, proto_out = combined.partition(_SPLIT)

    route_rows = []
    for r in birdc.parse_routes(route_out):
        route_rows.append((
            router, r.prefix, r.proto_class(bgp_kind), r.proto, r.nexthop,
            r.iface, r.as_path, r.metric1, r.metric2, int(r.best),
        ))
    proto_rows = []
    for p in birdc.parse_protocols_all(proto_out):
        proto_rows.append((router, p.name, p.proto, p.state, p.info, p.since,
                           p.imported, p.exported, p.preferred))
    return router, route_rows, proto_rows


def record(out_db: Path, routers_dir: Path, duration: float, interval: float,
           max_workers: int = 22) -> Path:
    containers = list_router_containers()
    if not containers:
        raise SystemExit("No running BYOI router containers found. Is the "
                         "network up? Try: byoi-rebuild --final")

    # Per-router map of bgp proto name -> 'ebgp'/'ibgp', for route classification.
    cfgs = parse_router_dir(routers_dir)
    kind_by_router = {
        r: {name: s.kind for name, s in c.bgp.items()} for r, c in cfgs.items()
    }

    print(f"Capturing topology ({len(containers)} routers)...")
    topo = build_topology(routers_dir)

    out_db.parent.mkdir(parents=True, exist_ok=True)
    if out_db.exists():
        out_db.unlink()
    conn = sqlite3.connect(out_db)
    conn.executescript(SCHEMA)
    import json
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('topology', ?)",
                 (json.dumps(topo),))
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('params', ?)",
                 (json.dumps({"duration": duration, "interval": interval,
                              "routers": [short_router(c) for c in containers]}),))
    conn.commit()

    print(f"Recording for {duration:.0f}s every {interval:g}s -> {out_db}")
    start = time.monotonic()
    seq = 0
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        while True:
            now = time.monotonic()
            elapsed = now - start
            if elapsed > duration:
                break
            t_ms = int(elapsed * 1000)
            wall = time.strftime("%H:%M:%S")
            conn.execute("INSERT INTO snapshots VALUES (?,?,?)", (seq, t_ms, wall))

            results = list(pool.map(
                lambda c: _poll_router(c, kind_by_router.get(short_router(c), {})),
                containers,
            ))
            n_routes = 0
            for _router, route_rows, proto_rows in results:
                conn.executemany(
                    "INSERT INTO routes VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    [(seq, *row) for row in route_rows],
                )
                conn.executemany(
                    "INSERT INTO protocols VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [(seq, *row) for row in proto_rows],
                )
                n_routes += len(route_rows)
            conn.commit()
            print(f"  snapshot {seq:3d}  t={elapsed:6.1f}s  routes={n_routes}")
            seq += 1

            # Maintain cadence (account for poll duration).
            sleep_for = interval - (time.monotonic() - now)
            if sleep_for > 0:
                time.sleep(sleep_for)

    conn.execute("INSERT OR REPLACE INTO meta VALUES ('snapshot_count', ?)",
                 (str(seq),))
    conn.commit()
    conn.close()
    print(f"Done: {seq} snapshots written to {out_db}")
    return out_db


def main(argv=None):
    p = argparse.ArgumentParser(description="Record BYOI BGP/OSPF convergence")
    p.add_argument("--duration", type=float, default=180.0,
                   help="seconds to record (default 180 = 3 min)")
    p.add_argument("--interval", type=float, default=2.0,
                   help="seconds between snapshots (default 2)")
    p.add_argument("--routers-dir", type=Path, default=Path("final/routers"),
                   help="dir with router-*.conf (default final/routers)")
    p.add_argument("--out", type=Path, default=None,
                   help="output sqlite path (default viz/data/run-<ts>.db)")
    args = p.parse_args(argv)

    out = args.out or Path("viz/data") / f"run-{time.strftime('%Y%m%d-%H%M%S')}.db"
    return record(out, args.routers_dir, args.duration, args.interval)


if __name__ == "__main__":
    main()
