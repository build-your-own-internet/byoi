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
  ip route add default via 2.1.0.6
  ip route add 1.3.0.0/16 via 1.2.0.2
  ;;

# Zayo network machines
(router-z5)
  # Zayo internal
  ip route add 2.6.7.0/24 via 2.5.6.6
  ip route add 2.7.8.0/24 via 2.5.7.7
  ip route add 2.6.8.0/24 via 2.5.6.6
  # Telia and AWS
  ip route add default via 2.5.7.7
  # Comcast
  ip route add 2.1.0.0/16 via 2.5.6.6
  ip route add 1.0.0.0/8 via 2.5.6.6
  # Google Cloud
  ip route add 2.8.0.0/16 via 2.5.8.8
  ip route add 8.0.0.0/8 via 2.5.8.8
  # ISC
  ip route add 100.0.1.0/24 via 2.5.8.8
  # Netnod
  ip route add 101.0.1.0/24 via 2.5.7.7
  # verisign
  ip route add 102.0.1.0/24 via 2.5.8.8
  # RIPE
  ip route add 103.0.1.0/24 via 2.5.7.7
  ;;
(router-z6)
  # Zayo internal
  ip route add 2.5.7.0/24 via 2.5.6.5
  ip route add 2.7.8.0/24 via 2.6.7.7
  ip route add 2.5.8.0/24 via 2.5.6.5
  # Telia and AWS
  ip route add default via 2.6.7.7
  # Comcast
  ip route add 1.0.0.0/8 via 2.1.0.3
  # Google Cloud
  ip route add 2.8.0.0/16 via 2.6.8.8
  ip route add 8.0.0.0/8 via 2.6.8.8
  # ISC
  ip route add 100.0.1.0/24 via 2.6.8.8
  # Netnod
  ip route add 101.0.1.0/24 via 2.6.7.7
  # verisign
  ip route add 102.0.1.0/24 via 2.6.8.8
  # RIPE
  ip route add 103.0.1.0/24 via 2.6.7.7
  ;;
(router-z7)
  # Zayo internal
  ip route add 2.6.8.0/24 via 2.6.7.6
  ip route add 2.5.6.0/24 via 2.6.7.6
  ip route add 2.5.8.0/24 via 2.5.7.5
  # Telia and the rest of the internet
  ip route add default via 2.3.0.6
  # AWS
  ip route add 4.0.0.0/8 via 2.4.0.4
  # Comcast
  ip route add 2.1.0.0/16 via 2.6.7.6
  ip route add 1.0.0.0/8 via 2.6.7.6
  # Google Cloud
  ip route add 2.8.0.0/16 via 2.7.8.8
  ip route add 8.0.0.0/8 via 2.7.8.8
  #ISC
  ip route add 100.0.1.0/24 via 2.7.8.8
  # Netnod
  ip route add 101.0.1.0/24 via 2.4.0.2
  # verisign
  ip route add 102.0.1.0/24 via 2.7.8.8
  # RIPE
  ip route add 103.0.1.0/24 via 2.3.0.6
  ;;
(router-z8)
  # Zayo internal
  ip route add 2.5.7.0/24 via 2.7.8.7
  ip route add 2.6.7.0/24 via 2.7.8.7
  ip route add 2.5.6.0/24 via 2.5.8.5
  # AWS, Telia, and SuperCorp
  ip route add default via 2.7.8.7
  # Google Cloud
  ip route add 8.0.0.0/8 via 2.8.0.3
  # Comcast
  ip route add 2.1.0.0/16 via 2.6.8.6
  ip route add 1.0.0.0/8 via 2.6.8.6
  # ISC
  ip route add 100.0.1.0/24 via 2.8.0.2
  # Netnod
  ip route add 101.0.1.0/24 via 2.7.8.7
  # verisign
  ip route add 102.0.1.0/24 via 2.8.0.4
  # RIPE
  ip route add 103.0.1.0/24 via 2.7.8.7
  ;;

# Telia networks
(router-t5)
  # Internal Telia
  ip route add 3.6.8.0/24 via 3.5.6.6
  ip route add 3.7.8.0/24 via 3.5.8.8
  ip route add 3.6.7.0/24 via 3.5.6.6
  # Zayo and Comcast
  ip route add default via 2.3.0.7
  # AWS
  ip route add 3.4.0.0/16 via 3.5.7.7
  ip route add 4.0.0.0/8 via 3.5.7.7
  # SuperCorp
  ip route add 3.9.0.0/16 via 3.5.8.8
  ip route add 9.0.0.0/8 via 3.5.8.8
  # Google Cloud
  ip route add 3.8.0.0/16 via 3.5.8.8
  ip route add 8.0.0.0/8 via 3.5.8.8
  # ISC
  ip route add 100.0.1.0/24 via 3.5.8.8
  # Netnod
  ip route add 101.0.1.0/24 via 3.5.7.7
  # verisign
  ip route add 102.0.1.0/24 via 2.3.0.7
  # RIPE
  ip route add 103.0.1.0/24 via 3.5.7.7
  ;;
(router-t6)
  # Internal Telia
  ip route add 3.5.7.0/24 via 3.5.6.5
  ip route add 3.5.8.0/24 via 3.5.6.5
  ip route add 3.7.8.0/24 via 3.6.7.7
  # Zayo and Comcast
  ip route add default via 2.3.0.7
  # AWS
  ip route add 3.4.0.0/16 via 3.6.7.7
  ip route add 4.0.0.0/8 via 3.6.7.7
  # SuperCorp
  ip route add 3.9.0.0/16 via 3.6.8.8
  ip route add 9.0.0.0/8 via 3.6.8.8
  # Google Cloud
  ip route add 3.8.0.0/16 via 3.6.8.8
  ip route add 8.0.0.0/8 via 3.6.8.8
  # ISC
  ip route add 100.0.1.0/24 via 3.6.8.8
  # Netnod
  ip route add 101.0.1.0/24 via 3.6.7.7
  # verisign
  ip route add 102.0.1.0/24 via 2.3.0.7
  # RIPE
  ip route add 103.0.1.0/24 via 3.6.7.7
  ;;
(router-t7)
  # Internal Telia
  ip route add 3.6.8.0/24 via 3.6.7.6
  ip route add 3.5.6.0/24 via 3.6.7.6
  ip route add 3.5.8.0/24 via 3.5.7.5
  # connections SuperCorp and Google
  ip route add default via 3.7.8.8
  # AWS
  ip route add 4.0.0.0/8 via 3.4.0.3
  # Zayo
  ip route add 2.0.0.0/8 via 3.6.7.6
  # Comcast
  ip route add 1.0.0.0/8 via 3.6.7.6
  # ISC
  ip route add 100.0.1.0/24 via 3.7.8.8
  # Netnod
  ip route add 101.0.1.0/24 via 3.4.0.2
  # verisign
  ip route add 102.0.1.0/24 via 3.6.7.6
  # RIPE
  ip route add 103.0.1.0/24 via 3.4.0.4
  ;;
(router-t8)
  # Internal Telia
  ip route add 3.5.7.0/24 via 3.5.8.5
  ip route add 3.6.7.0/24 via 3.6.8.6
  ip route add 3.5.6.0/24 via 3.5.8.5
  # Zayo and Comcast
  ip route add default via 3.5.8.5
  # Google
  ip route add 8.0.0.0/8 via 3.8.0.4
  # AWS
  ip route add 4.0.0.0/8 via 3.7.8.7
  # SuperCorp
  ip route add 9.0.0.0/8 via 3.9.0.2
  # ISC
  ip route add 100.0.1.0/24 via 3.8.0.2
  # Netnod
  ip route add 101.0.1.0/24 via 3.7.8.7
  # verisign
  ip route add 102.0.1.0/24 via 3.5.8.5
  # RIPE
  ip route add 103.0.1.0/24 via 3.7.8.7
  ;;

# Supercorp networks
(router-s2)
  ip route add default via 3.9.0.8
  ip route add 9.1.0.0/16 via 9.2.0.3
  ;;
(router-s3)
  ip route add default via 9.2.0.2
  ;;

# ISC networks
(router-i2)
  ip route add default via 2.8.0.8
  ip route add 3.0.0.0/8 via 3.8.0.8
  ip route add 8.0.0.0/8 via 2.8.0.3
  ip route add 9.0.0.0/8 via 3.8.0.8
  ip route add 102.0.1.0/24 via 2.8.0.4
  # RIPE
  ip route add 103.0.1.0/24 via 3.8.0.8
  ;;

# verisign networks
(router-v4)
  ip route add default via 2.8.0.8
  ;;

# Netnod networks
(router-n2)
  ip route add default via 3.4.0.7
  ip route add 4.0.0.0/8 via 2.4.0.4
  ip route add 2.0.0.0/8 via 2.4.0.7
  ip route add 1.0.0.0/8 via 2.4.0.7
  ip route add 100.0.0.0/8 via 2.4.0.7
  ip route add 102.0.0.0/8 via 2.4.0.7
  ;;

# Google Cloud Services
(router-g2)
  ip route add default via 8.2.0.3
  ip route add 3.0.0.0/8 via 8.1.0.4
  ip route add 9.0.0.0/8 via 8.1.0.4
  # RIPE
  ip route add 103.0.1.0/24 via 8.1.0.4
  ;;
(router-g3)
  ip route add default via 2.8.0.8
  ip route add 102.0.1.0/24 via 2.8.0.4
  ip route add 100.0.1.0/24 via 2.8.0.2
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;
(router-g4)
  ip route add default via 3.8.0.8
  ip route add 100.0.1.0/24 via 3.8.0.2
  ip route add 8.2.0.0/16 via 8.1.0.2
  ;;

# AWS
(router-a2)
  ip route add default via 4.1.0.4
  ip route add 4.3.0.0/16 via 4.1.0.3
  ip route add 3.0.0.0/8 via 4.1.0.3
  ip route add 9.0.0.0/8 via 4.1.0.3
  # RIPE
  ip route add 103.0.1.0/24 via 4.1.0.3
  ;;
(router-a3)
  ip route add default via 3.4.0.7
  ip route add 4.2.0.0/16 via 4.1.0.2
  ip route add 2.0.0.0/8 via 4.1.0.4
  ip route add 1.0.0.0/8 via 4.1.0.4
  ip route add 102.0.0.0/8 via 4.1.0.4
  # RIPE
  ip route add 103.0.1.0/24 via 3.4.0.4
  ;;
(router-a4)
  ip route add default via 2.4.0.7
  ip route add 4.2.0.0/16 via 4.1.0.2
  ip route add 4.3.0.0/16 via 4.1.0.3
  ip route add 3.0.0.0/8 via 4.1.0.3
  ip route add 9.0.0.0/8 via 4.1.0.3
  # RIPE
  ip route add 103.0.1.0/24 via 4.1.0.3
  ;;

# RIPE
(router-r4)
  ip route add default via 3.4.0.7
  ;;
esac

/bin/sleep infinity
