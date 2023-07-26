#!/bin/bash

/usr/sbin/ip route delete default

function httpserver() {
  while true; do
    echo -e "HTTP/1.1 200 OK\r\n$(date)\r\n\r\n<h1>hello world from $(hostname) on $(date)</h1>" | nc -vl 8080; 
  done
}

case $HOSTNAME in
  (server) 
    httpserver
    ;;
  (router1)
    ip route add 1.0.0.0/8 via 3.0.3.1
    ip route add 100.1.0.0/16 via 3.0.3.1
    ip route add 200.1.1.0/29 via 200.1.1.11
    ip route add 200.1.1.16/29 via 3.0.3.1
    ;;
esac

/bin/sleep infinity