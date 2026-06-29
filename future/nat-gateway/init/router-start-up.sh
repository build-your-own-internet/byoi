#!/bin/bash
# set -euo pipefail

mkdir -p /etc/vim
/usr/sbin/ip route delete default

BIRD_CONF_FILE="/etc/bird/bird.conf"
cp /bird.conf $BIRD_CONF_FILE

mkdir -p /run/bird
/usr/sbin/bird -c $BIRD_CONF_FILE

case $HOSTNAME in
    (router-c2)
        bash set-router-addys.sh 192.168.2.2/24 192.168.0.2/24
        ;;
    (router-c4)
        bash set-router-addys.sh 192.168.1.4/24 192.168.0.4/24
        ;;
esac

/bin/sleep infinity

