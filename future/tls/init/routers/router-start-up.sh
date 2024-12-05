#!/bin/bash

/usr/sbin/ip route delete default
cp /init/$HOSTNAME/resolv.conf /etc/resolv.conf

mkdir -p /etc/vim
cp /vimrc /etc/vim/vimrc.local

rm -rf /init

case $HOSTNAME in
  # Comcast network machines
  (router-c2)
    ip route add default via 1.2.0.3
    ;;
  (router-c3)
    ip route add default via 3.1.0.6
    ip route add 1.3.0.0/16 via 1.2.0.2
    ;;
  (router-t6)
    # Internal Telia
    ip route add 3.7.8.0/24 via 3.6.7.7
    ip route add 3.4.0.0/16 via 3.6.7.7
    # Comcast
    ip route add 1.0.0.0/8 via 3.1.0.3
    # SuperCorp
    ip route add 3.9.0.0/16 via 3.6.8.8
    ip route add 9.0.0.0/8 via 3.6.8.8
    # Netnod
    ip route add 101.0.1.0/24 via 3.6.7.7
    ;;
  (router-t7)
    # Internal Telia
    ip route add 3.6.8.0/24 via 3.6.7.6
    ip route add 3.1.0.0/16 via 3.6.7.6
    # connections SuperCorp
    ip route add 9.0.0.0/8 via 3.7.8.8
    # Comcast
    ip route add 1.0.0.0/8 via 3.6.7.6
    # Netnod
    ip route add 101.0.1.0/24 via 3.4.0.2
    ;;
  (router-t8)
    # Internal Telia
    ip route add 3.6.7.0/24 via 3.6.8.6
    ip route add 3.4.0.0/16 via 3.7.8.7
    ip route add 3.1.0.0/16 via 3.6.8.6
    # Comcast
    ip route add 1.0.0.0/8 via 3.6.8.6
    # SuperCorp
    ip route add 9.0.0.0/8 via 3.9.0.2
    # Netnod
    ip route add 101.0.1.0/24 via 3.7.8.7
    ;;

  # Supercorp networks
  (router-s2)
    ip route add default via 3.9.0.8
    ip route add 9.1.0.0/16 via 9.2.0.3
    ;;
  (router-s3)
    ip route add default via 9.2.0.2
    ;;

  # Netnod networks
  (router-n2)
    ip route add default via 3.4.0.7
    ;;
esac

/bin/sleep infinity
