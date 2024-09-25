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
  # echo "Testing connectivity from $1 to $destination"
  docker exec $source ping -c 1 $destination >/dev/null
  if [ $? -ne 0 ]; then
    echo "🚨 Error: Failed to connect from $1 to $destination"
    error_count=$((error_count + 1)) # Increment the error counter
  else
    echo -n "."
  fi
}

# dost is docker host because ping most likely is already installed locally
function dost() {
  local source="build-your-own-internet-$1"
  local destination=$2
  # echo "Testing name-resolution from $1 to $destination"
  docker exec $source host $destination >/dev/null
  if [ $? -ne 0 ]; then
    echo "🚨 Error: unable to resolve $destination from $1"
    error_count=$((error_count + 1)) # Increment the error counter
  else
    echo -n "."
  fi
}

# Define the list of test systems
systems=("client-c1" "server-g3" "server-s1" "server-a1")

# Read the IP addresses from the file
ip_addresses=$(cat ip-addresses.txt)
dns_names=$(cat dns-names.txt)


# Loop through each system and each IP address to run the command
for system in "${systems[@]}"; do
  echo
  echo "Testing IP connectivity from $system"
  for ip in $ip_addresses; do
    ding "$system" "$ip"
  done
  echo
  echo "Testing name resolution from $system"
  for dns_name in $dns_names; do
    dost "$system" "$dns_name"
  done
done

# Summary of errors
if [ $error_count -eq 0 ]; then
  echo "✅ No errors! Everything is working!"
else
  echo "⚠️  $error_count errors encountered."
fi

