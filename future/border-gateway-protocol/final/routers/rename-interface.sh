#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <SUBNET> <NEW_NAME>"
  echo "Example: $0 1.1.0.0/24 net-one-one"
  echo ""
  echo "Finds the interface with an IP in SUBNET and renames it to NEW_NAME"
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

SUBNET="$1"
NEW_NAME="$2"

# Extract the network prefix from the subnet (e.g., "1.1." from "1.1.0.0/16")
# For /16: use first 2 octets, for /24: use first 3 octets
NETMASK="${SUBNET##*/}"  # Extract the /XX part
NETWORK="${SUBNET%%/*}"  # Extract the IP part

if [[ "$NETMASK" -ge 24 ]]; then
  # /24 or smaller - match first 3 octets
  PREFIX=$(echo "$NETWORK" | cut -d. -f1-3)
elif [[ "$NETMASK" -ge 16 ]]; then
  # /16 - match first 2 octets
  PREFIX=$(echo "$NETWORK" | cut -d. -f1-2)
else
  # /8 - match first octet
  PREFIX=$(echo "$NETWORK" | cut -d. -f1)
fi

# Find the interface that has an IP starting with our prefix
# We use `ip -o addr show` for stable, single-line output per address.
IFACE="$(
  ip -o -4 addr show \
  | awk -v prefix="$PREFIX" '
      $4 ~ ("^" prefix "\\.") || $4 ~ ("^" prefix "/") { print $2; exit }
    '
)"

if [[ -z "${IFACE:-}" ]]; then
  echo "Error: could not find an interface with IP in subnet $SUBNET" >&2
  echo "Tip: run: ip -o -4 addr show" >&2
  exit 1
fi

# Don't rename if already has the correct name
if [[ "$IFACE" == "$NEW_NAME" ]]; then
  echo "Interface $IFACE already has correct name"
  exit 0
fi

echo "Found interface $IFACE with IP in subnet $SUBNET"
echo "Renaming $IFACE -> $NEW_NAME..."
ip link set "$IFACE" down
ip link set "$IFACE" name "$NEW_NAME"
ip link set "$NEW_NAME" up

echo "Done. Interface $NEW_NAME is now up"
