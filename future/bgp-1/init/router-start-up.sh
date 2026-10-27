#!/bin/bash
mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local
/usr/sbin/ip route delete default

BIRD_CONF_FILE="/etc/bird/bird.conf"

mkdir -p /run/bird

/bin/sleep infinity

