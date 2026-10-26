#!/bin/bash

/usr/sbin/ip route delete default

# if we decide that we want to be able to perform DNS
# name resolution on routers in the future, let's 
# write a script that creates the resolv.conf file on 
# each router.

rm -rf /init

BIRD_CONF_FILE="/etc/bird/bird.conf"
cp /bird.conf $BIRD_CONF_FILE

mkdir -p /run/bird
/usr/sbin/bird -c $BIRD_CONF_FILE

/bin/sleep infinity
