#!/bin/bash

cp /init/$HOSTNAME/resolv.conf /etc/resolv.conf

mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local

rm -rf /init

/usr/sbin/ip route delete default

case $HOSTNAME in
  (tls-ca-s)
  ip route add default via 9.3.0.2
  ;;
esac

# -config test/config/pebble-config.json -strict -dnsserver 10.30.50.3:8053

/usr/bin/sleep infinity
