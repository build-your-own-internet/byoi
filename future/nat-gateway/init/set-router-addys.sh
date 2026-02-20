#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <FROM_CIDR> <TO_CIDR>"
  echo "Example: $0 192.168.2.2/24 192.168.0.2/24"
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

FROM="$1"
TO="$2"

# Find the interface that has the FROM address.
# We use `ip -o addr show` for stable, single-line output per address.
IFACE="$(
  ip -o -4 addr show \
  | awk -v from="$FROM" '
      $0 ~ ("inet " from) { print $2; exit }
    '
)"

if [[ -z "${IFACE:-}" ]]; then
  echo "Error: could not find an interface with address $FROM" >&2
  echo "Tip: run: ip -o -4 addr show" >&2
  exit 1
fi

echo "Found $FROM on interface: $IFACE"
echo "Deleting $FROM from $IFACE..."
ip addr del "$FROM" dev "$IFACE"

echo "Adding $TO to $IFACE..."
ip addr add "$TO" dev "$IFACE"

echo "Done. Current addresses on $IFACE:"
ip -o addr show dev "$IFACE"