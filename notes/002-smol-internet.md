# Let's make an Internet!

## We need a second network
What we have created so far is a single network and our goal is to build an
internet(work). Towards that goal, we want to create a second network (doggonet)
that cannot directly talk to the previously created network (squasheeba).

Towards that end, we created doggonet in our docker compose:

```
  doggonet:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 10.1.2.0/24
```

What's a network without a container right? So we have a lone tara reigning over
the doggonet:

```
  tara:
    build: .
    networks:
      doggonet:
        ipv4_address: 10.1.2.2
```

### Can our networks communicate with each other?

Now we have 2 separate networks. Fantastic! An internet is group of hosts on
different networks that can all communicate with each other. We have the hosts,
we have the networks, but before we go about getting them to talk to each other,
let's make sure they can't already communicate... To do this, we're gonna reuse
the same tricks we did in part 001.

First, let's jump onto one of the containers on our `squasheeba` network:

```
docker exec -it build-your-own-internet-boudi-1 /bin/bash
```

We're going to try to ping this container from `tara` on the `doggonet` network.
We can see if the ping reaches our container by running `tcpdump` and looking
for any output.

Then, we need to open 2 new terminal windows and jump on a container on the
`doggonet` network on both of them:

```
docker exec -it build-your-own-internet-tara-1 /bin/bash
```

In the first window, run `tcpdump -n` so we can see the network traffic that's
happening on the container we're running our `ping` from. On the second
window, we're going to `ping` the address we defined for `boudi` in our
docker-compose file:

```
ping 10.1.1.3
```

The `ping` should result in no output because we're not actually hitting a
machine for that address. The `tcpdump` on `boudi`, likewise, will have no
output because the `ping` from `tara` is never reaching it. The `tcpdump`
from `tara`, on the otherhand:

```bash
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:22:56.424664 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 1, length 64
19:22:57.435395 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 2, length 64
19:22:58.463486 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 3, length 64
19:22:59.487123 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 4, length 64
19:23:00.508506 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 5, length 64
19:23:01.531201 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 6, length 64
19:23:01.863431 ARP, Request who-has 10.1.2.1 tell 10.1.2.2, length 28
19:23:01.863490 ARP, Reply 10.1.2.1 is-at 02:42:e0:c7:ba:94, length 28
19:23:02.555243 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 7, length 64
19:23:03.579353 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 8, length 64
19:23:04.607679 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 9, length 64
19:23:05.631431 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 2, seq 10, length 64
^C
12 packets captured
12 packets received by filter
0 packets dropped by kernel
```

Here, we can see that the `request` is being sent for `10.1.1.3`, but we
don't see a corresponding `reply`. Sweet! Our networks exist, but they cannot
communicate with each other. YET!

> **NOTE** 
There are some random ARP requests in the tcpdump. 10.1.2.1 is the
*address for the default gateway, e.g.:

```bash
root@92141c63e813:/# ip route
default via 10.1.2.1 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

In the output from `ip route`, we can see `default via 10.1.2.1 dev eth0`, which
identifies that as the default gateway. We're seeing these requests in our
tcpdump because the ARP cache needs to periodically be refreshed.

## Make those networks communicate with each other!

TODO:
1. network our networks together
