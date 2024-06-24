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
  (resolver-c) 
    ip route add default via 1.2.0.3
    ip route add 1.3.0.0/16 via 1.2.0.2
    ;;
  (router-c2)
    ip route add default via 1.2.0.3
    ;;
  (router-c3)
    ip route add default via 2.1.0.6
    ip route add 1.3.0.0/16 via 1.2.0.2
    ;;
esac

# use our special versions of resolv.conf that turns off the docker dns name resolution
cp /init/resolv.conf /etc/resolv.conf

rm -rf /init

if [[ $(hostname) =~ host.* ]]; then  
  # copy in all the image files for each specific host
  cp -a /home/www/$(hostname) /var/www
  rm -rf /home/www
  
  # start an http server on each host
  /usr/bin/busybox httpd -h /var/www -f
else
  /bin/sleep infinity
fi
