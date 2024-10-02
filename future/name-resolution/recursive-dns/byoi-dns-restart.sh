#!/bin/bash

# Define arrays for resolvers and DNS servers
MACHINES=("resolver-a" "resolver-g" "resolver-c" "resolver-s" "authoritative-a" "authoritative-s" "tlddns-g" "tlddns-n" "tlddns-v" "rootdns-i" "rootdns-n")

# Function to restart a process in a container
restart_process() {
  local container=$1

  echo "Processing container: $container"

  docker exec "build-your-own-internet-$container" bash ./revive-dns.sh
}

for container in "${MACHINES[@]}"; do
  restart_process $container
done