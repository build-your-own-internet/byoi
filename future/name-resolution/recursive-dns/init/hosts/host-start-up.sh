#!/bin/bash

/usr/sbin/ip route delete default
cp /init/$HOSTNAME/resolv.conf /etc/resolv.conf

rm -rf /init

case $HOSTNAME in
# Comcast network machines
client-c1)
  ip route add default via 1.1.0.3
  ;;
client-c2)
  ip route add default via 1.3.0.2
  ;;

# Supercorp networks
server-s1)
  ip route add default via 9.3.0.2
  ;;
client-s2)
  ip route add default via 9.2.0.2
  ip route add 9.1.0.0/16 via 9.2.0.3
  ;;

# Google Cloud Services
server-g1)
  ip route add default via 8.2.0.3
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;
server-g2)
  ip route add default via 8.2.0.3
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;
server-g3)
  ip route add default via 8.2.0.3
  ip route add 8.1.0.0/16 via 8.2.0.2
  ;;

# AWS
server-a1)
  ip route add default via 4.2.0.2
  ;;
server-a2)
  ip route add default via 4.2.0.2
  ;;
server-a3)
  ip route add default via 4.1.0.4
  ip route add 4.2.0.0./16 via 4.1.0.2
  ip route add 4.3.0.0./16 via 4.1.0.3
  ip route add 9.0.0.0/8 via 4.1.0.3
  ip route add 3.0.0.0/8 via 4.1.0.3
  ;;
server-a4)
  ip route add default via 4.3.0.3
  ;;
esac

if [[ $(hostname) =~ server.* ]]; then
  # copy in all the image files for each specific host
  cp -a /home/www/$(hostname) /var/www
  rm -rf /home/www

  # start an http server on each host
  /usr/bin/busybox httpd -h /var/www -f
fi
  
/bin/sleep infinity
