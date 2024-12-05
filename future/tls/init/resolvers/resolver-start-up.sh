#!/bin/bash

/usr/sbin/ip route delete default
cp /init/$HOSTNAME/resolv.conf /etc/resolv.conf
cp /init/revive-dns.sh /revive-dns.sh

mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local

rm -rf /init

case $HOSTNAME in
    (resolver-c) 
    ip route add default via 1.2.0.3
    ip route add 1.3.0.0/16 via 1.2.0.2
    ;;
    (resolver-s)
    ip route add default via 9.2.0.2
    ip route add 9.1.0.0/16 via 9.2.0.3
    ;;
esac

/usr/sbin/unbound -d
/usr/bin/sleep infinity
