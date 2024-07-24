#!/bin/bash

rm -rf /init

/usr/sbin/ip route delete default

case $HOSTNAME in
    (authoritative-s)
    ip route add default via 9.1.0.3
    ;;
    (authoritative-a)
    ip route add default via 4.1.0.4
    ip route add 4.2.0.0./16 via 4.1.0.2
    ip route add 4.3.0.0./16 via 4.1.0.3
    ip route add 9.0.0.0/8 via 4.1.0.3
    ip route add 3.0.0.0/8 via 4.1.0.3
    ;;
    (rootdns-i)
    ip route add default via 100.0.1.2
    ;;
    (tlddns-v)
    ip route add default via 102.0.1.4
    ;;
    (tlddns-n)
    ip route add default via 101.0.1.2
    ;;
    (rootdns-n)
    ip route add default via 101.0.1.2
    ;;
    (tlddns-g)
    ip route add default via 8.2.0.3
    ip route add 8.1.0.0/16 via 8.2.0.2
    ;;
esac

/usr/bin/sleep infinity