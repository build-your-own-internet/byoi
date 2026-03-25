#!/bin/bash

/usr/sbin/ip route delete default

# if we decide that we want to be able to perform DNS
# name resolution on routers in the future, let's 
# write a script that creates the resolv.conf file on 
# each router.


BIRD_CONF_FILE="/etc/bird/bird.conf"

# Get the current hostname
HOSTNAME=$(hostname)

# Check if hostname-specific bird config exists
HOST_SPECIFIC_CONF="/init/${HOSTNAME}.conf"

if [ -f "$HOST_SPECIFIC_CONF" ]; then
    # If hostname-specific config exists, use it
    echo "Using hostname-specific config: $HOST_SPECIFIC_CONF"
    cp "$HOST_SPECIFIC_CONF" "$BIRD_CONF_FILE"
else
    # Otherwise, fall back to default config
    echo "Using default config: /bird.conf"
    cp /init/bird.conf "$BIRD_CONF_FILE"
fi

mkdir -p /run/bird
/usr/sbin/bird -c $BIRD_CONF_FILE

rm -rf /init

/bin/sleep infinity
