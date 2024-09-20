#!/bin/bash
# Testing script
set -e

echo "Testing name resolution for i2-a.isc.org from client-c1..."
docker exec build-your-own-internet-client-c1 ping i2-2-8.isc.org -c1
echo 'DONE!'
# from client-s2, ping i2-b.isc.org

# from server-g1, ping i2-c.isc.org
# from server-a1, ping i2-a.isc.org
#
#
# Let's add c2.comcast.com for

echo "Testing name resolution for comcast c2 router from client-s2..."
docker exec build-your-own-internet-client-s2 ping c2-1-2.comcast.com -c1
docker exec build-your-own-internet-client-s2 ping c2-1-3.comcast.com -c1
echo 'DONE!'

echo "Testing name resolution for verisign router from client-c2..."
docker exec build-your-own-internet-client-c2 ping v4-2-8.verisign.org -c1
docker exec build-your-own-internet-client-c2 ping v4-102.verisign.org -c1
echo 'DONE!'

echo "Testing name resolution for netnod router from client-c1..."
docker exec build-your-own-internet-client-c1 ping n2-2-4.netnod.org -c1
docker exec build-your-own-internet-client-c1 ping n2-3-4.netnod.org -c1
docker exec build-your-own-internet-client-c1 ping n2-101.netnod.org -c1
echo 'DONE!'



# TODO: MAke this loudly fail
