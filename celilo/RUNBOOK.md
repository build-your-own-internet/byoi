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
- The `celilo-e2e/management:latest` and `celilo-e2e/management:vanilla` Docker
  images present (`docker images | grep celilo-e2e/management`). These are
  produced by `cele2e build-infra` **in the celilo monorepo** (its bake step
  runs install.sh to put the celilo CLI in the image) and are not rebuilt by
  test runs here. If `celilo system init` fails with
  `/root/.bun/bin/celilo: No such file or directory`, the image on this host
  was built without the bake — re-run `./cele2e build-infra` in the celilo
  checkout.

## Install

```bash
cd celilo/e2e
bun install
```

`bun install` also runs `stage-e2e-caches.sh` (postinstall), which stages the
build inputs the published `@celilo/e2e` package needs but doesn't ship — see
that script's comments for details.

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
  the staged caches are missing; run `bash e2e/stage-e2e-caches.sh` (or re-run
  `bun install` in `celilo/e2e/`).
- Run-lock busy: `e2e/node_modules/.bin/cele2e status`, and `cele2e release`
  if a previous run left the lock behind.
- Leftover network state: `e2e/node_modules/.bin/cele2e down` tears everything
  down; the runner also self-heals stale resources at start of run.
