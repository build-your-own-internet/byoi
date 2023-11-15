#!/bin/bash

/usr/sbin/ip route delete default

case $HOSTNAME in
  (host-a) 
    ip route add default via 1.0.1.1 
    ;;
  (host-b) 
    ip route add default via 5.0.2.1 
    ;;
  (host-c) 
    ip route add default via 6.0.3.1 
    ;;
  (host-d) 
    ip route add default via 7.0.4.1 
    ;;
  (host-e) 
    ip route add default via 8.0.5.1 
    ;;
  (host-f) 
    ip route add default via 6.0.3.1 
    ;;
  (host-g) 
    ip route add default via 2.0.6.1 
    ;;
  (router1)
    ip route add default via 9.0.2.1
    ip route add 2.0.0.0/8 via 3.0.6.1
    ip route add 8.0.0.0/8 via 3.0.5.1
    ;;
  (router2)
    ip route add default via 4.0.4.1
    ip route add 1.0.0.0/8 via 9.0.1.1
    ip route add 6.0.0.0/8 via 4.0.3.1
    ;;
  (router3)
    ip route add default via 4.0.4.1
    ip route add 5.0.0.0/8 via 4.0.2.1
    ip route add 1.0.0.0/8 via 4.0.2.1
    ;;
  (router4)
    ip route add default via 10.0.5.1
    ip route add 6.0.0.0/8 via 4.0.3.1
    ip route add 5.0.0.0/8 via 4.0.2.1
    ip route add 1.0.0.0/8 via 4.0.2.1
    ;;
  (router5)
    ip route add default via 10.0.4.1
    ip route add 2.0.0.0/8 via 3.0.6.1
    ip route add 1.0.0.0/8 via 3.0.1.1
    ;;
  (router6)
    ip route add default via 3.0.5.1
    ip route add 1.0.0.0/8 via 3.0.1.1
    ip route add 5.0.0.0/8 via 3.0.1.1
    ;;
esac

/bin/sleep infinity