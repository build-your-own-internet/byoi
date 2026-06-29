#!/bin/bash
# ponytail: pre-commit hook, runs validation before commit
set -e

cd "$(git rev-parse --show-toplevel)/web"

echo "→ TypeScript check..."
bun run typecheck

echo "→ Building site..."
bun run build > /dev/null

echo "→ Smoke test..."
bun run test

echo "✓ Pre-commit validation passed"
