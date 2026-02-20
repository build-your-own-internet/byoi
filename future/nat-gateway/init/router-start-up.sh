#!/bin/bash
mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local
/usr/sbin/ip route delete default

BIRD_CONF_FILE="/etc/bird/bird.conf"
cp /bird.conf $BIRD_CONF_FILE

mkdir -p /run/bird
/usr/sbin/bird -c $BIRD_CONF_FILE

case $HOSTNAME in
    (router-c2)
        bash set-router-addys.sh 192.168.2.2 192.168.0.2
        ;;
    (router-c4)
        bash set-router-addys.sh 192.168.1.4 192.168.0.4
        ;;
esac

/bin/sleep infinity

