#!/bin/bash
# Testing script

cleanup() {
    echo "ABORTING..."
    # Perform cleanup tasks (remove temp files, etc.)
    exit 1
}

trap cleanup INT  # Trap the INT signal (Ctrl+C)


# Initialize an error counter
error_count=0

# ding is docker ping because ping most likely is already installed locally
function ding() {
  local source="build-your-own-internet-$1"
  local destination=$2
  echo "Testing connectivity from $1 to $destination"
  docker exec $source ping -c 1 $destination >/dev/null
  if [ $? -ne 0 ]; then
    echo "🚨 Error: Failed to connect from $1 to $destination"
    error_count=$((error_count + 1)) # Increment the error counter
  fi
}

# Define the list of test systems
systems=("client-c1" "server-g3" "server-s1" "server-a1")

# Read the IP addresses from the file
ip_addresses=$(cat ip-addresses.txt)
dns_names=$(cat dns-names.txt)


# Loop through each system and each IP address to run the command
for system in "${systems[@]}"; do
  echo "Testing IP connectivity"
  for ip in $ip_addresses; do
    ding "$system" "$ip"
  done
  echo "Testing name resolution"
  for dns_name in $dns_names; do
    ding "$system" "$dns_name"
  done
done

# Summary of errors
if [ $error_count -eq 0 ]; then
  echo "✅ No errors! Everything is working!"
else
  echo "⚠️  $error_count errors encountered."
fi

