#!/bin/bash

/usr/sbin/ip route delete default

function httpserver() {
  while true; do
    echo -e "HTTP/1.1 200 OK\r\n$(date)\r\n\r\n<h1>hello world from $(hostname) on $(date)</h1>" | nc -vl 8080; 
  done
}

case $HOSTNAME in
  (server) httpserver
esac

/bin/sleep infinity