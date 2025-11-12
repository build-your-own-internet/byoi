#!/bin/sh

# REMOVE ALL IP ADDRESSES IN INIT VERSION
# Get all IP addresses on eth0
ips=$(ip -o -4 addr show dev eth0 | awk '{print $4}')

# Loop through each IP and remove it
for ip in $ips; do
  ip addr del "$ip" dev eth0
done

/usr/sbin/ip route delete default

/bin/sleep infinity