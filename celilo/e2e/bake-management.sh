#!/usr/bin/env bash
# Bake the PUBLISHED @celilo/cli into celilo-e2e/management:latest.
#
# Why this still exists (ISS-0009, upstream bead by-3a6): @celilo/e2e 0.9.0's
# `build-infra --published` bake is broken twice over — it installs the STALE
# @alpha dist-tags (celilo 0.5.0-alpha.12, rejected by the harness's >=0.9.0
# version contract) and `docker commit`s without --change CMD, leaving the
# image running `sleep infinity` instead of /startup.sh (no SSH keys, every
# target machine times out at target-setup). This script repairs both: it
# installs @latest from real npm and commits with the correct ENTRYPOINT/CMD.
# Run after every `cele2e build-infra --published`; idempotent (checks
# installed version against the npm registry). Delete once upstream fixes
# the published bake.
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
  # bun made /usr/local/bin/celilo a symlink to the package bin — remove it
  # before writing the shim, or the redirect writes THROUGH the symlink and
  # corrupts the package binary into an exec self-loop (ce-fo6).
  rm -f /usr/local/bin/celilo
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
