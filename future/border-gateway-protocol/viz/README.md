# BYOI Route-Propagation Visualizer

A self-contained tool that records how BGP/OSPF routes spread across the BYOI
network as it boots, then replays it as an animated map — each route colored by
the protocol that carried it (eBGP, iBGP, OSPF, OSPF‑E1/E2, directly connected).

![what it looks like](.) <!-- screenshot optional -->

## Quick start

Rebuild the network *and* record + visualize in one shot:

```bash
# from future/border-gateway-protocol/
byoi-rebuild --final --record-data
```

This brings the network up, records every router's BIRD state for 3 minutes
(snapshot every 2 s), then opens a browser at <http://127.0.0.1:8089/>.

Tune the recording window:

```bash
byoi-rebuild --final --record-data --record-duration 120 --record-interval 1
```

Re-watch the most recent run without re-recording:

```bash
python3 -m viz.byoi_viz.pipeline --show-last
```

## Using it

- **Pick a prefix** in the left list (colored by the org that owns it). The map
  lights up every router that has learned it and the edge each route arrived
  over, colored by protocol.
- **Press ▶ / Space** (or drag the timeline) to replay convergence from cold
  start — watch eBGP hop across AS boundaries, iBGP fan out inside an AS, and
  OSPF‑E2 flood through an area.
- The **detail panel** shows how many of the 22 routers a prefix reached and via
  which protocols — an instant read on whether a route propagated fully or got
  stuck. (Try a Comcast `1.x` prefix vs. a Zayo `2.x` prefix.)

Deep-link a prefix: `http://127.0.0.1:8089/?prefix=2.1.0.0/16`.

## How it works

```
byoi-rebuild --record-data
        │
        ▼
recorder.py  ── docker exec <router> birdc show route all / show protocols
        │       (every router, in parallel, every interval)
        ▼
viz/data/run-<ts>.db   (SQLite: snapshots, routes, protocols, topology)
        │
        ▼
exporter.py  ── collapse snapshots → per-(router,prefix) change events
        │
        ▼
viz/data/run-<ts>.json  →  copied to app/run.json
        │
        ▼
app/  (Cytoscape.js static page, served by python http.server)
```

Pieces (each runnable on its own):

| Module | Job |
| --- | --- |
| `byoi_viz/configparse.py` | Parse `router-*.conf` → AS numbers, eBGP/iBGP map, OSPF interfaces |
| `byoi_viz/birdc.py` | Parse `birdc show route all` / `show protocols` / `show ospf neighbors` |
| `byoi_viz/topology.py` | Build the map graph from `docker inspect` + configs + live OSPF neighbors |
| `byoi_viz/recorder.py` | Poll all routers on an interval → SQLite |
| `byoi_viz/exporter.py` | Collapse a run → compact JSON timeline |
| `byoi_viz/pipeline.py` | Glue: record → export → serve → open browser |
| `app/` | Static Cytoscape.js visualizer (no build step; Cytoscape vendored) |

The map is **auto-generated** — nodes/links/clouds come from the running
network and the configs, so it stays correct when you change the topology.
Routers are grouped into **org clouds** (by name letter: `z`→Zayo, `a`→AWS, …)
nested inside their **AS boundary** (dashed, from `local as` in the configs).

### Requirements

Just Python 3 stdlib (`sqlite3`, `http.server`) and a running Docker network.
No pip installs. Cytoscape.js is vendored in `app/vendor/`.

### Notes / ideas

- The graph layout (`cose`) is randomized per load; refresh for a different
  arrangement. Caching node positions would make the map stable run-to-run.
- A live-streaming mode (websockets instead of replay) could animate
  convergence in real time; the recorder schema already supports it.
