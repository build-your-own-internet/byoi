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

  # Zayo network machines
  (router-z5)
    # connections to Telia accessed through default
    # connections to AWS  accessed through default
    ip route add default via 2.5.7.7

    # connections to Comcast
    ip route add 2.1.0.0/16 via 2.5.6.6
    ip route add 1.0.0.0/8 via 2.5.6.6

    # connections to Google Cloud
    ip route add 2.8.0.0/16 via 2.5.8.8
    ip route add 8.0.0.0/8 via 2.5.8.8
    ;;
  (router-z6)
    # connections to Telia accessed through default
    # connections to AWS accessed through default
    ip route add default via 2.6.7.7

    # connections to Comcast
    ip route add 1.0.0.0/8 via 2.1.0.3
    
    # connections to Google Cloud
    ip route add 2.8.0.0/16 via 2.6.8.8
    ip route add 8.0.0.0/8 via 2.6.8.8
    ;; 
  (router-z7)
    # connections to Telia and the rest of the internet
    ip route add default via 2.3.0.6

    # connections to AWS
    ip route add 4.0.0.0/8 via 2.4.0.4

    # connections to Comcast
    ip route add 2.1.0.0/16 via 2.6.7.6
    ip route add 1.0.0.0/8 via 2.6.7.6

    # connections to Google Cloud
    ip route add 2.8.0.0/16 via 2.7.8.8
    ip route add 8.0.0.0/8 via 2.7.8.8
    ;;  
  (router-z8)
    # connections to AWS
    # connections to Telia
    # connections to SuperCorp
    ip route add default via 2.7.8.7

    # connections to Google Cloud
    ip route add 8.0.0.0/8 via 2.8.0.3

    # connections to Comcast
    ip route add 2.1.0.0/16 via 2.7.8.6
    ip route add 1.0.0.0/8 via 2.7.8.6
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
