"""End-to-end: record convergence, export JSON, serve the visualizer.

This is what ``byoi-rebuild --record-data`` invokes once the network is up. It
can also be run by hand::

    python3 -m viz.byoi_viz.pipeline --duration 180 --interval 2

Run ``--no-serve`` to just produce the data files (e.g. in CI), or
``python3 -m viz.byoi_viz.pipeline --show-last`` to re-serve the most recent run
without recording again.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import shutil
import socketserver
import time
import webbrowser
from pathlib import Path

from .exporter import export_run
from .recorder import record

HERE = Path(__file__).resolve().parent
APP_DIR = HERE.parent / "app"          # viz/app
DATA_DIR = HERE.parent / "data"        # viz/data


def _publish(json_path: Path) -> Path:
    """Copy the exported bundle to where the static app fetches it."""
    dest = APP_DIR / "run.json"
    shutil.copyfile(json_path, dest)
    return dest


def serve(port: int = 8089, open_browser: bool = True):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                                directory=str(APP_DIR))

    class Quiet(socketserver.TCPServer):
        allow_reuse_address = True

    with Quiet(("127.0.0.1", port), handler) as httpd:
        url = f"http://127.0.0.1:{port}/"
        print(f"\n  Visualizer running at {url}")
        print("  (Ctrl-C to stop)\n")
        if open_browser:
            try:
                webbrowser.open(url)
            except Exception:
                pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


def latest_run_json() -> Path | None:
    runs = sorted(DATA_DIR.glob("run-*.json"))
    return runs[-1] if runs else None


def main(argv=None):
    p = argparse.ArgumentParser(description="Record + visualize BYOI convergence")
    p.add_argument("--duration", type=float, default=180.0)
    p.add_argument("--interval", type=float, default=2.0)
    p.add_argument("--routers-dir", type=Path, default=Path("final/routers"))
    p.add_argument("--port", type=int, default=8089)
    p.add_argument("--no-serve", action="store_true", help="produce data only")
    p.add_argument("--show-last", action="store_true",
                   help="serve the most recent run without recording")
    args = p.parse_args(argv)

    if args.show_last:
        last = latest_run_json()
        if not last:
            raise SystemExit("No previous run found in viz/data/")
        _publish(last)
        serve(args.port)
        return

    stamp = time.strftime("%Y%m%d-%H%M%S")
    db = DATA_DIR / f"run-{stamp}.db"
    record(db, args.routers_dir, args.duration, args.interval)
    js = export_run(db)
    _publish(js)

    if not args.no_serve:
        serve(args.port)


if __name__ == "__main__":
    main()
