#!/bin/bash
/usr/sbin/ip route delete default
/usr/sbin/ip route add default via 2.0.6.1

# use our special versions of resolv.conf uses host-dns for name resolution
cp /init/resolv.conf /etc/resolv.conf

/usr/sbin/knotc conf-init
/usr/sbin/knotd --config /config/knot.conf --daemonize

/usr/bin/sleep infinity