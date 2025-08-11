#!/bin/bash
mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local
/usr/sbin/ip route delete default

BIRD_CONF_FILE="/etc/bird/bird.conf"
cp /bird.conf $BIRD_CONF_FILE

mkdir -p /run/bird
/usr/sbin/bird -c $BIRD_CONF_FILE

/bin/sleep infinity

