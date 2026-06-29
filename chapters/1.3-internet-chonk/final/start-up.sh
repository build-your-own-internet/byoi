#!/bin/bash

/usr/sbin/ip route delete default

case $HOSTNAME in
server)
  ip route add default via 10.5.1.1
  ;;
client)
  ip route add default via 10.1.5.1
  ;;
router1)
  ip route add 10.1.0.0/16 via 10.3.3.1
  ip route add 172.16.0.0/16 via 10.3.3.1
  ip route add 192.168.1.0/29 via 192.168.1.11
  ip route add 192.168.1.16/29 via 192.168.1.11
  ;;
router2)
  ip route add 10.1.0.0/16 via 172.16.5.1
  ip route add 10.3.0.0/16 via 172.16.3.1
  ip route add 10.5.0.0/16 via 192.168.1.10
  ip route add 192.168.1.16/29 via 192.168.1.3
  ;;
router3)
  ip route add 10.5.0.0/16 via 10.3.1.1
  ip route add 10.1.0.0/16 via 172.16.5.1
  ip route add 192.168.1.8/29 via 10.3.1.1
  ip route add 192.168.1.0/29 via 172.16.2.1
  ip route add 192.168.1.16/29 via 172.16.4.1
  ;;
router4)
  ip route add 10.1.0.0/16 via 172.16.5.1
  ip route add 10.3.0.0/16 via 172.16.3.1
  ip route add 10.5.0.0/16 via 172.16.3.1
  ip route add 192.168.1.8/29 via 192.168.1.2
  ;;
router5)
  ip route add 10.3.0.0/16 via 172.16.3.1
  ip route add 10.5.0.0/16 via 192.168.1.18
  ip route add 192.168.1.8/29 via 172.16.2.1
  ip route add 192.168.1.0/29 via 192.168.1.18
  ;;
esac

/bin/sleep infinity

