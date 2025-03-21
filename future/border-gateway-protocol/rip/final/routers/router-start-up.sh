#!/bin/bash

BIRD_CONF_FILE="/etc/bird/bird.conf"

/usr/sbin/ip route delete default

cp /init/$HOSTNAME/bird.conf $BIRD_CONF_FILE || echo "bird.conf not found"
mkdir -p /run/bird

mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local

rm -rf /init

if [ -f "$BIRD_CONF_FILE" ]; then
  /usr/sbin/bird -c $BIRD_CONF_FILE
fi

/bin/sleep infinity