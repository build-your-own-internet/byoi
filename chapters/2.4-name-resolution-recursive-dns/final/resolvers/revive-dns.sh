#!/bin/bash

# Find PIDs of the target process
PIDS=$(ps aux | grep "[u]nbound" | awk '{print $2}')
if [ -n "$PIDS" ]; then
    echo "Killing unbound process $PIDS on $(hostname)"
    kill -9 $PIDS
else
    echo "No unbound processes found"
fi
# Restart the process
/usr/sbin/unbound