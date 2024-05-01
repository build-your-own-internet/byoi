#!/bin/bash
/usr/sbin/ip route delete default
/usr/sbin/ip route add default via 2.0.6.1

cp /init/resolv.conf /etc/resolv.conf
rm -rf /init

/usr/bin/sleep infinity