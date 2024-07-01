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
    # Telia and AWS
    ip route add default via 2.5.7.7

    # Comcast
    ip route add 2.1.0.0/16 via 2.5.6.6
    ip route add 1.0.0.0/8 via 2.5.6.6

    # Google Cloud
    ip route add 2.8.0.0/16 via 2.5.8.8
    ip route add 8.0.0.0/8 via 2.5.8.8
    ;;
  (router-z6)
    # Telia and AWS
    ip route add default via 2.6.7.7

    # Comcast
    ip route add 1.0.0.0/8 via 2.1.0.3
    
    # Google Cloud
    ip route add 2.8.0.0/16 via 2.6.8.8
    ip route add 8.0.0.0/8 via 2.6.8.8
    ;; 
  (router-z7)
    # Telia and the rest of the internet
    ip route add default via 2.3.0.6

    # AWS
    ip route add 4.0.0.0/8 via 2.4.0.4

    # Comcast
    ip route add 2.1.0.0/16 via 2.6.7.6
    ip route add 1.0.0.0/8 via 2.6.7.6

    # Google Cloud
    ip route add 2.8.0.0/16 via 2.7.8.8
    ip route add 8.0.0.0/8 via 2.7.8.8
    ;;  
  (router-z8)
    # AWS, Telia, and SuperCorp
    ip route add default via 2.7.8.7

    # Google Cloud
    ip route add 8.0.0.0/8 via 2.8.0.3

    # Comcast
    ip route add 2.1.0.0/16 via 2.7.8.6
    ip route add 1.0.0.0/8 via 2.7.8.6
    ;;  

    # Telia networks
    (router-t5)
    # Zayo and Comcast
    ip route add default via 2.3.0.7

    # AWS
    ip route add 3.4.0.0/16 via 3.5.7.7
    ip route add 4.0.0.0/8 via 3.5.7.7

    # SuperCorp
    ip route add 3.9.0.0/16 via 3.5.8.8
    ip route add 9.0.0.0/8 via 3.5.8.8

    # Google Cloud
    ip route add 3.8.0.0/16 via 3.5.8.8
    ip route add 8.0.0.0/8 via 3.5.8.8
    ;;
    (router-t6)
    # Zayo and Comcast
    ip route add default via 2.3.0.7

    # AWS
    ip route add 3.4.0.0/16 via 3.6.7.7
    ip route add 4.0.0.0/8 via 3.6.7.7

    # SuperCorp
    ip route add 3.9.0.0/16 via 3.6.8.8
    ip route add 9.0.0.0/8 via 3.6.8.8

    # Google Cloud
    ip route add 3.8.0.0/16 via 3.6.8.8
    ip route add 8.0.0.0/8 via 3.6.8.8
    ;;
    (router-t7)
    # connections SuperCorp and Google
    ip route add default via 3.7.8.8

    # AWS
    ip route add 4.0.0.0/8 via 3.4.0.3

    # Zayo
    ip route add 2.0.0.0/8 via 3.6.7.6

    # Comcast
    ip route add 1.0.0.0/8 via 3.6.7.6
    ;;
    (router-t8)
    # Zayo and Comcast
    ip route add default via 3.5.8.5

    # Google
    ip route add 8.0.0.0/8 via 3.8.0.4

    # AWS
    ip route add 4.0.0.0/8 via 3.7.8.7

    # SuperCorp
    ip route add 9.0.0.0/8 via 3.9.0.2
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
