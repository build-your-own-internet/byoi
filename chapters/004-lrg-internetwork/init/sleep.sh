#!/bin/bash

/usr/sbin/ip route delete default

function httpserver() {
  while true; do
    echo -e "HTTP/1.1 200 OK\r\n$(date)\r\n\r\n<h1>hello world from $(hostname) on $(date)</h1>" | nc -vl 8080; 
  done
}

case $HOSTNAME in
  (server) 
    ip route add 1.0.0.0/8 via 5.0.1.1 
    ip route add 3.0.0.0/8 via 5.0.1.1
    ip route add 100.1.0.0/16 via 5.0.1.1
    ip route add 200.1.1.8/29 via 5.0.1.1
    ip route add 200.1.1.0/29 via 5.0.1.1
    ip route add 200.1.1.16/29 via 5.0.1.1
    httpserver
    ;;
  (client)
    ip route add 3.0.0.0/8 via 1.0.5.1 
    ip route add 5.0.0.0/8 via 1.0.5.1
    ip route add 100.1.0.0/16 via 1.0.5.1
    ip route add 200.1.1.8/29 via 1.0.5.1
    ip route add 200.1.1.0/29 via 1.0.5.1
    ip route add 200.1.1.16/29 via 1.0.5.1
    ;;
  (router1)
    ip route add 1.0.0.0/8 via 3.0.3.1
    ip route add 100.1.0.0/16 via 3.0.3.1
    ip route add 200.1.1.0/29 via 200.1.1.11
    ip route add 200.1.1.16/29 via 200.1.1.11
    ;;
  (router2)
    ip route add 1.0.0.0/8 via 100.1.5.1
    ip route add 3.0.0.0/8 via 100.1.3.1
    ip route add 5.0.0.0/8 via 200.1.1.10
    ip route add 200.1.1.16/29 via 200.1.1.3
    ;;
  (router3)
    ip route add 5.0.0.0/8 via 100.1.2.1
    ip route add 1.0.0.0/8 via 100.1.5.1
    ip route add 200.1.1.8/29 via 3.0.1.1
    ip route add 200.1.1.0/29 via 100.1.2.1
    ip route add 200.1.1.16/29 via 100.1.4.1
    ;;
  (router4)
    ip route add 1.0.0.0/8 via 100.1.5.1
    ip route add 3.0.0.0/8 via 100.1.3.1
    ip route add 5.0.0.0/8 via 100.1.3.1
    ip route add 200.1.1.8/29 via 200.1.1.2
    ;;
  (router5)
    ip route add 3.0.0.0/8 via 100.1.3.1
    ip route add 5.0.0.0/8 via 100.1.3.1
    ip route add 200.1.1.8/29 via 100.1.2.1
    ip route add 200.1.1.0/29 via 200.1.1.18
    ;;
esac

/bin/sleep infinity