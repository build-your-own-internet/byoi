#!/bin/bash

cp /init/$HOSTNAME/knot.conf /config/knot.conf
mkdir -p /etc/knot
cp /init/$HOSTNAME/*.zone /etc/knot/
cp /init/$HOSTNAME/resolv.conf /etc/resolv.conf
cp /init/revive-dns.sh /revive-dns.sh

mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local

rm -rf /init

/usr/sbin/ip route delete default

case $HOSTNAME in
    (authoritative-s)
    ip route add default via 9.1.0.3
    ;;
    (tlddns-n)
    ip route add default via 101.0.1.2
    ;;
    (rootdns-n)
    ip route add default via 101.0.1.2
    ;;
esac

/usr/sbin/knotc conf-init
/usr/sbin/knotd --config /config/knot.conf --daemonize

/usr/bin/sleep infinity
