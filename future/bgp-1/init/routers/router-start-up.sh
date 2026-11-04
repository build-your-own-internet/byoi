#!/bin/bash

/usr/sbin/ip route delete default

# if we decide that we want to be able to perform DNS
# name resolution on routers in the future, let's
# write a script that creates the resolv.conf file on
# each router.

# Rename interfaces to consistent names based on IP subnet
# This ensures BIRD configs can use deterministic interface names
# even though Docker Compose assigns eth0/eth1/eth2 non-deterministically
HOSTNAME=$(hostname)

case $HOSTNAME in
    (router-c3)
        bash /init/rename-interface.sh 1.1.0.0/16 n1-1
        bash /init/rename-interface.sh 1.2.0.0/16 n1-2
        bash /init/rename-interface.sh 2.1.0.0/16 n2-1
        ;;
    (router-z5)
        bash /init/rename-interface.sh 2.5.6.0/24 n2-5-6
        bash /init/rename-interface.sh 2.5.7.0/24 n2-5-7
        bash /init/rename-interface.sh 2.5.8.0/24 n2-5-8
        ;;
    (router-z6)
        bash /init/rename-interface.sh 2.1.0.0/16 n2-1
        bash /init/rename-interface.sh 2.5.6.0/24 n2-5-6
        bash /init/rename-interface.sh 2.6.7.0/24 n2-6-7
        bash /init/rename-interface.sh 2.6.8.0/24 n2-6-8
        ;;
    (router-z7)
        bash /init/rename-interface.sh 2.3.0.0/16 n2-3
        bash /init/rename-interface.sh 2.4.0.0/16 n2-4
        bash /init/rename-interface.sh 2.5.7.0/24 n2-5-7
        bash /init/rename-interface.sh 2.6.7.0/24 n2-6-7
        bash /init/rename-interface.sh 2.7.8.0/24 n2-7-8
        ;;
    (router-z8)
        bash /init/rename-interface.sh 2.8.0.0/16 n2-8
        bash /init/rename-interface.sh 2.5.8.0/24 n2-5-8
        bash /init/rename-interface.sh 2.6.8.0/24 n2-6-8
        bash /init/rename-interface.sh 2.7.8.0/24 n2-7-8
        ;;
    (router-a4)
        bash /init/rename-interface.sh 4.1.0.0/16 n4-1
        bash /init/rename-interface.sh 2.4.0.0/16 n2-4
        ;;
    (router-n2)
        bash /init/rename-interface.sh 101.0.1.0/24 n101
        bash /init/rename-interface.sh 2.4.0.0/16 n2-4
        bash /init/rename-interface.sh 3.4.0.0/16 n3-4
        ;;
    (router-t5)
        bash /init/rename-interface.sh 2.3.0.0/16 n2-3
        bash /init/rename-interface.sh 3.5.6.0/24 n3-5-6
        bash /init/rename-interface.sh 3.5.7.0/24 n3-5-7
        bash /init/rename-interface.sh 3.5.8.0/24 n3-5-8
        ;;
    (router-t6)
        bash /init/rename-interface.sh 2.3.0.0/16 n2-3
        bash /init/rename-interface.sh 3.5.6.0/24 n3-5-6
        bash /init/rename-interface.sh 3.6.7.0/24 n3-6-7
        bash /init/rename-interface.sh 3.6.8.0/24 n3-6-8
        ;;
    (router-g3)
        bash /init/rename-interface.sh 2.8.0.0/16 n2-8
        bash /init/rename-interface.sh 8.2.0.0/16 n8-2
        ;;
    (router-i2)
        bash /init/rename-interface.sh 3.8.0.0/16 n3-8
        bash /init/rename-interface.sh 2.8.0.0/16 n2-8
        bash /init/rename-interface.sh 100.0.1.0/24 n100
        ;;
    (router-v4)
        bash /init/rename-interface.sh 102.0.1.0/24 n102
        bash /init/rename-interface.sh 2.8.0.0/16 n2-8
        ;;
esac

BIRD_CONF_FILE="/etc/bird/bird.conf"

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
