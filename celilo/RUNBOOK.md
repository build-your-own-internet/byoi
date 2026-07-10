# Celilo E2E Runbook

How to run the byoi end-to-end deployment tests manually. The tests spin up a
Docker-based simulated internet (DNS hierarchy, Pebble ACME, firewalls, target
machines) and deploy this repo's site through the full Celilo flow.

## Prerequisites

- **Docker running** (colima or Docker Desktop) with ~8 GB free disk and the
  VM sized at **≥ 4 CPUs / 8 GiB RAM** (`colima start --cpu 4 --memory 8`).
  The simulated internet runs ~17 containers; a default 2 GiB colima VM
  fails in confusing ways (daemon restarts, lost routes, hung CLI calls).
- **bun 1.3.x** (`bun --version`)

## Install

```bash
cd celilo/e2e
bun install
```

## Build infra images

```bash
cd celilo/e2e
node_modules/.bin/cele2e build-infra --published
```

This stages all build inputs from public sources (published @celilo tarballs,
celilo.computer install.sh, apt pool, standard-module netapps from the
registry), builds the simulator images, and bakes the published `@celilo/cli`
into `celilo-e2e/management:latest`. Test runs don't rebuild images — re-run
this after a new @celilo release or on a fresh Docker host. Requires network
access (it fetches from npm and celilo.computer).

**Known issue (@celilo/e2e 0.9.0, ISS-0009):** the `--published` bake is
broken twice over — it installs the stale `@alpha` dist-tags (celilo
0.5.0-alpha.12, rejected by the harness's `>=0.9.0` version contract) and
`docker commit`s the image with `CMD ["sleep infinity"]` instead of
`/startup.sh` (so target machines fail with `Timeout waiting for <machine>
target-setup`). Repair the image after every build-infra (remove this step
once the upstream fix ships):

```bash
bash e2e/bake-management.sh
```

## Run

From the `celilo/` directory (the module root):

```bash
cd celilo

# Phase 1: deploy byoi behind Caddy, verify DNS + ACME cert + HTTPS content
e2e/node_modules/.bin/cele2e run byoi-deploy

# Phase 2: OIDC — deploy with Authentik, verify provisioning + config.js + PKCE login
e2e/node_modules/.bin/cele2e run byoi-oidc
```

Only one test network can run at a time (fixed CIDRs); `cele2e` enforces this
with a run-lock. Phase 1 takes ~5–10 minutes; Phase 2 up to ~30 minutes
(Authentik is slow to deploy).

## Expected pass output

Each run ends with a results box; a pass looks like:

```
╔══════════════════════════════════════════════════════════════
║  Results: 1 passed, 0 failed — 6m32s total
╠══════════════════════════════════════════════════════════════
║  ✔ byoi-deploy
╚══════════════════════════════════════════════════════════════
```

Full per-run logs are written under `celilo/results/<timestamp>/`.

## Troubleshooting

- `docker compose ... build` fails with `"/.npm-registry-cache": not found` —
  the staged caches are missing; re-run
  `e2e/node_modules/.bin/cele2e build-infra --published`.
- `celilo system init` fails with
  `/root/.bun/bin/celilo: No such file or directory` — the management image
  was built without the bake; re-run
  `e2e/node_modules/.bin/cele2e build-infra --published`.
- Run-lock busy: `e2e/node_modules/.bin/cele2e status`, and `cele2e release`
  if a previous run left the lock behind.
- Leftover network state: `e2e/node_modules/.bin/cele2e down` tears everything
  down; the runner also self-heals stale resources at start of run.
