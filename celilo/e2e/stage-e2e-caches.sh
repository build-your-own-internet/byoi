#!/usr/bin/env bash
# Stage build inputs that @celilo/e2e's shared-infra Dockerfiles COPY but the
# published npm tarball doesn't ship (they're gitignored build outputs in the
# celilo monorepo). Without these, any `cele2e run` from a clean checkout dies
# at `docker compose build` with: "/.npm-registry-cache": not found.
# Runs automatically via this package's postinstall; safe to re-run.
set -euo pipefail
PKG_DIR="$(cd "$(dirname "$0")" && pwd)/node_modules/@celilo/e2e"
[ -d "$PKG_DIR" ] || { echo "run 'bun install' first ($PKG_DIR missing)"; exit 1; }

# ponytail: placeholder only — byoi tests never fetch from celilo-website-sim;
# real site content is only needed for install.sh bake/regression tests.
SITE_CACHE="$PKG_DIR/.celilo-website-cache"
mkdir -p "$SITE_CACHE"
[ -f "$SITE_CACHE/index.html" ] || echo '<!-- placeholder: staged by stage-e2e-caches.sh -->' > "$SITE_CACHE/index.html"

# Target machines bind-mount ./docker-image-cache (app-zone image preloads,
# e.g. authentik's postgres/redis); the preload skips missing tarballs, but
# the mount source dir must exist or compose up fails.
mkdir -p "$PKG_DIR/docker-image-cache"

# ponytail: empty pool — apt-repo-sim only feeds the upstream bootstrap-apt
# test's `apt install celilo-bootstrap`; byoi tests never use it, and the debs
# aren't published anywhere fetchable. Empty-but-present builds the image.
mkdir -p "$PKG_DIR/.apt-repo-cache/pool"

# Published tarballs of the @celilo packages the npm-registry sim serves —
# deploy-time `bun install` inside the management container resolves all
# @celilo/* through it (see /root/.bunfig.toml in Dockerfile.management).
NPM_CACHE="$PKG_DIR/.npm-registry-cache"
mkdir -p "$NPM_CACHE"
if ! ls "$NPM_CACHE"/*.tgz >/dev/null 2>&1; then
  (cd "$NPM_CACHE" && npm pack --silent \
    @celilo/cli @celilo/event-bus @celilo/e2e @celilo/capabilities @celilo/cli-display)
fi
# Pre-built .netapps of the standard modules the tests `module import`
# (namecheap, caddy, iptables, authentik). The registry sim serves these from
# its /uploads mount. Vendored here as a bridge until @celilo/e2e fetches them
# from the public celilo.computer registry at build-infra time (celilo bead
# ce-w8v); delete netapps/ and this step when that lands (tracked in by-16f).
mkdir -p "$PKG_DIR/netapps"
cp "$(dirname "$0")/netapps/"*.netapp "$PKG_DIR/netapps/"

echo "e2e caches staged: $(ls "$NPM_CACHE" | wc -l | tr -d ' ') tarball(s), $(ls "$PKG_DIR/netapps" | wc -l | tr -d ' ') netapp(s)"
