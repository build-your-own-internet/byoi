#!/bin/bash
# Testing script
set -e

echo "Testing name resolution for i2-a.isc.org from client-c1..."
docker exec build-your-own-internet-client-c1 ping i2-a.isc.org -c1
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

# TODO: MAke this loudly fail
