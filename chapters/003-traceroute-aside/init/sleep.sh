#!/bin/sh

/usr/sbin/ip route delete default

echo "\n"
echo `hostname`
echo $HOSTNAME
echo "\n"

case $HOSTNAME in
  (pippin) ip route add 10.1.2.0/24 via 10.1.1.3;;
  (tara) ip route add 10.1.1.0/24 via 10.1.2.3;;
esac

/bin/sleep infinity