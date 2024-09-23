#!/bin/bash
# Testing script
set -e

# ding is docker ping because ping most likely is already installed locally
function ding() {
  local source="build-your-own-internet-$1"
  local destination=$2
  echo "Testing name resolution from $1 to $destination"
  docker exec $source ping -c 1 $destination > /dev/null
}

ding client-c1 i2-2-8.isc.org

ding client-s2 c2-1-2.comcast.com
ding client-s2 c2-1-2.comcast.com
ding client-s2 c2-1-3.comcast.com

ding client-c2 v4-2-8.verisign.org
ding client-c2 v4-102.verisign.org

ding server-g3 n2-2-4.netnod.org
ding server-g3 n2-3-4.netnod.org
ding server-g3 n2-101.netnod.org

ding server-a1 z5-2-5-6.zayo.net
ding server-a1 z6-2-6-8.zayo.net
ding server-a1 z7-2-7-8.zayo.net
ding server-a1 z8-2-8.zayo.net

ding client-c2 t5-3-5-7.telia.net
ding client-c2 t6-3-6-8.telia.net
ding client-c2 t7-3-4.telia.net
ding client-c2 t8-3-9.telia.net

echo "DONE!"
