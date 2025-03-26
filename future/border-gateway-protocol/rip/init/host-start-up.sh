#!/bin/bash

/usr/sbin/ip route delete default

case $HOSTNAME in
# Comcast network machines
  (client-c1)
  ip route add default via 1.1.0.3
  ;;
  (client-c2)
  ip route add default via 1.3.0.2
  ;;
  (server-c1)
  ip route add default via 1.2.0.3
  ;;

# Supercorp networks
  (server-s1)
  ip route add default via 9.3.0.2
  ;;
  (server-s2)
  ip route add default via 9.2.0.2
  ;;
  (server-s3)
  ip route add default via 9.1.0.3
  ;;
  (client-s2)
  ip route add default via 9.2.0.2
  ip route add 9.1.0.0/16 via 9.2.0.3
  ;;

# Google Cloud Services
  (server-g1)
  ip route add default via 8.2.0.3
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;
  (server-g2)
  ip route add default via 8.2.0.3
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;
  (server-g3)
  ip route add default via 8.2.0.3
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;
  (server-g4)
  ip route add default via 8.1.0.4
  ;;

# ISC
  (server-i1)
  ip route add default via 100.0.1.2
  ;;

# Netnod
  (server-n1)
  ip route add default via 101.0.1.2
  ;;
  (server-n2)
  ip route add default via 101.0.1.2
  ;;

# Verisign
  (server-v1)
  ip route add default via 102.0.1.4
  ;;

# AWS
  (server-a1)
  ip route add default via 4.2.0.2
  ;;
  (server-a2)
  ip route add default via 4.2.0.2
  ;;
  (server-a3)
  ip route add default via 4.1.0.4
  ip route add 4.2.0.0./16 via 4.1.0.2
  ip route add 4.3.0.0./16 via 4.1.0.3
  ip route add 9.0.0.0/8 via 4.1.0.3
  ip route add 3.0.0.0/8 via 4.1.0.3
  ;;
  (server-a4)
  ip route add default via 4.3.0.3
  ;;
esac

/bin/sleep infinity
