#!/bin/bash

/usr/sbin/ip route delete default
cp /init/$HOSTNAME/resolv.conf /etc/resolv.conf

mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local

rm -rf /init

case $HOSTNAME in
# Comcast network machines
  (client-c1)
  ip route add default via 1.1.0.3
  ;;
  (client-c2)
  ip route add default via 1.3.0.2
  ;;

# Supercorp networks
  (server-s1)
  ip route add default via 9.2.0.2
  ip route add 9.1.0.0/16 via 9.2.0.2
  ;;
  (tls-ca-s)
  ip route add default via 9.3.0.2
  ;;

esac

/bin/sleep infinity
