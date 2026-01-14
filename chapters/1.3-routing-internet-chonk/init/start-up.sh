#!/bin/bash

/usr/sbin/ip route delete default

case $HOSTNAME in
router1)
  ip route add 10.1.0.0/16 via 10.3.3.1
  ip route add 172.16.0.0/16 via 10.3.3.1
  ip route add 192.168.1.0/29 via 192.168.1.11
  ip route add 192.168.1.16/29 via 10.3.3.1
  ;;
esac

/bin/sleep infinity

