#!/bin/sh

/usr/sbin/ip route delete default

case $HOSTNAME in
  (client) ip route add 10.1.2.0/24 via 10.1.1.3;;
  (server) ip route add 10.1.1.0/24 via 10.1.2.3;;
esac

/bin/sleep infinity