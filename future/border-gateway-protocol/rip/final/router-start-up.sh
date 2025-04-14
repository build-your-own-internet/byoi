#!/bin/bash
mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local
/usr/sbin/ip route delete default


BIRD_CONF_FILE="/etc/bird/bird.conf"
cp /init/bird.conf $BIRD_CONF_FILE || echo "bird.conf not found"
mkdir -p /run/bird
rm -rf /init
/usr/sbin/bird -c $BIRD_CONF_FILE

/bin/sleep infinity