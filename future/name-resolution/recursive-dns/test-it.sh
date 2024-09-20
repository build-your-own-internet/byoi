#!/bin/bash
# Testing script
set -e

echo "Testing name resolution for i2-a.isc.org from client-c1..."
docker exec build-your-own-internet-client-c1 ping i2-2-8.isc.org -c1
echo 'DONE!'

echo "Testing name resolution for comcast c2 router from client-s2..."
docker exec build-your-own-internet-client-s2 ping c2-1-2.comcast.com -c1
docker exec build-your-own-internet-client-s2 ping c2-1-3.comcast.com -c1
echo 'DONE!'

echo "Testing name resolution for verisign router from client-c2..."
docker exec build-your-own-internet-client-c2 ping v4-2-8.verisign.org -c1
docker exec build-your-own-internet-client-c2 ping v4-102.verisign.org -c1
echo 'DONE!'

echo "Testing name resolution for netnod router from server-g3..."
docker exec build-your-own-internet-server-g3 ping n2-2-4.netnod.org -c1
docker exec build-your-own-internet-server-g3 ping n2-3-4.netnod.org -c1
docker exec build-your-own-internet-server-g3 ping n2-101.netnod.org -c1
echo 'DONE!'

echo "Testing name resolution for zayo routers from server-a1..."
docker exec build-your-own-internet-server-a1 ping z5-2-5-6.zayo.net -c1
docker exec build-your-own-internet-server-a1 ping z6-2-6-8.zayo.net -c1
docker exec build-your-own-internet-server-a1 ping z7-2-7-8.zayo.net -c1
docker exec build-your-own-internet-server-a1 ping z8-2-8.zayo.net -c1
echo 'DONE!'

echo "Testing name resolution for telia routers from client-c2..."
docker exec build-your-own-internet-client-c2 ping t5-3-5-7.telia.net -c1
docker exec build-your-own-internet-client-c2 ping t6-3-6-8.telia.net -c1
docker exec build-your-own-internet-client-c2 ping t7-3-4.telia.net -c1
docker exec build-your-own-internet-client-c2 ping t8-3-9.telia.net -c1
echo 'DONE!'

# TODO: MAke this loudly fail
