#!/usr/bin/env bash
# Bake the PUBLISHED @celilo/cli into celilo-e2e/management:latest.
#
# Why this exists: `cele2e build-infra` in the celilo monorepo bakes the
# monorepo's own dev CLI (e.g. 0.5.0-alpha.5) into the image — correct for
# monorepo development, but this repo tests against the published
# @celilo/e2e harness, whose `system init --accept-defaults` contract needs
# the published CLI (older dev CLIs drop into an interactive prompt there,
# and non-TTY runs hang until the harness times out with "canceled").
# Run after any monorepo build-infra; idempotent (checks installed version
# against the npm registry).
set -euo pipefail

want=$(npm view @celilo/cli version)
have=$(docker run --rm --entrypoint bash celilo-e2e/management:latest -c \
  'timeout 30 /root/.bun/bin/celilo --version 2>/dev/null || true' | grep -oE '[0-9]+\.[0-9]+\.[0-9][0-9a-zA-Z.-]*' | tail -1 || true)
if [ "$have" = "$want" ]; then
  echo "management:latest already has published celilo $want — nothing to do"
  exit 0
fi
echo "baking published celilo $want over '${have:-none}'"

docker rm -f celilo-mgmt-bake >/dev/null 2>&1 || true
# bunfig pins the @celilo scope to the sim registry (npm-registry.lab), which
# doesn't resolve outside the test network — park it during the install.
docker run --name celilo-mgmt-bake --entrypoint bash celilo-e2e/management:latest -c '
  set -e
  mv /root/.bunfig.toml /root/.bunfig.toml.bak 2>/dev/null || true
  # The monorepo bake leaves bun state resolved against the sim registry
  # (npm-registry.lab) — unreachable here. The global bun.lock pins @celilo
  # tarball URLs to it (FailedToOpenSocket on every retry) and the cache
  # holds its packuments. Reset both so we resolve fresh from real npm.
  rm -rf /root/.bun/install/cache /root/.bun/install/global/bun.lock /root/.bun/install/global/node_modules
  printf "{}" > /root/.bun/install/global/package.json 2>/dev/null || true
  bun add -g @celilo/cli @celilo/event-bus
  mv /root/.bunfig.toml.bak /root/.bunfig.toml 2>/dev/null || true
  # bun global bin dir here is /usr/local/bin, where it clobbers the
  # source-mount shim. Put the real CLI at the shim fallback path and
  # reinstate the shim (same shape the upstream bake writes).
  mkdir -p /root/.bun/bin
  ln -sf /root/.bun/install/global/node_modules/@celilo/cli/bin/celilo /root/.bun/bin/celilo
  ln -sf /root/.bun/install/global/node_modules/@celilo/event-bus/bin/event-bus /root/.bun/bin/event-bus 2>/dev/null || true
  printf "%s\n" \
    "#!/bin/bash" \
    "if [ -d /celilo/apps/celilo ]; then" \
    "  exec bun run /celilo/apps/celilo/src/cli/index.ts \"\$@\"" \
    "fi" \
    "exec /root/.bun/bin/celilo \"\$@\"" > /usr/local/bin/celilo
  chmod +x /usr/local/bin/celilo
  /root/.bun/bin/celilo --version
'
docker commit \
  --change 'ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]' \
  --change 'CMD ["/startup.sh"]' \
  celilo-mgmt-bake celilo-e2e/management:latest >/dev/null
docker rm celilo-mgmt-bake >/dev/null
echo "baked: published celilo $want into celilo-e2e/management:latest"
