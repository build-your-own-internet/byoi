#!/bin/bash

# Find PIDs of the target process
PIDS=$(ps aux | grep "[k]not" | awk '{print $2}')
if [ -n "$PIDS" ]; then
    echo "Killing knot process $PIDS on $(hostname)"
    kill -9 $PIDS
else
    echo "No knot processes found"
fi
# Restart the process
/usr/sbin/knotd --config /config/knot.conf --daemonize