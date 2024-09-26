#!/bin/bash

# Define arrays for resolvers and DNS servers
RESOLVERS=("resolver-a" "resolver-g" "resolver-c" "resolver-s")
DNS_SERVERS=("authoritative-a" "authoritative-s" "tlddns-g" "tlddns-n" "tlddns-v" "rootdns-i" "rootdns-n")

# Function to restart a process in a container
restart_process() {
  local container=$1
  local process_name=$2
  local start_command=$3

  echo "Processing container: $container"

  docker exec "build-your-own-internet-$container" bash -c "
    # Find PIDs of the target process
    PIDS=\$(ps aux | grep '[${process_name:0:1}]${process_name:1}' | awk '{print \$2}')
    echo '---------------------------------------------'
    echo \"PIDS: \$PIDS\"
    echo '---------------------------------------------'
    if [ -n \"\$PIDS\" ]; then
      echo \"Killing ${process_name} processes: \$PIDS\"
      kill -9 \$PIDS
    else
      echo \"No ${process_name} processes found\"
    fi
    # Restart the process
    $start_command
  "
}

restart_process "rootdns-i" "unbound" "/usr/sbin/unbound -d"

# # Restart unbound on all resolvers
# for container in "${RESOLVERS[@]}"; do
#   restart_process "$container" "unbound" "/usr/sbin/unbound -d"
# done
# 
# # Restart knot on all DNS servers
# for container in "${DNS_SERVERS[@]}"; do
#   restart_process "$container" "knot" "/usr/sbin/knotd -c /config/knot.conf --daemonize"
# done