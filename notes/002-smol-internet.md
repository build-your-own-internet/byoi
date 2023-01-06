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
Now we have 2 separate networks. Fantastic! An internet is group of networks
that can all communicate with each other. We have the networks, but before
we go about getting them to talk to each other, let's make sure they can't
already communicate... To do this, we're gonna reuse the same tricks we did
in part 001.

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

In the first window, run `tcpdump` so we can see the network traffic that's
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

```
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
22:48:57.021891 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 1, length 64
22:48:57.047197 IP 3751e8362264.44618 > 192.168.65.5.53: 1799+ PTR? 3.1.1.10.in-addr.arpa. (39)
22:48:57.118567 IP 192.168.65.5.53 > 3751e8362264.44618: 1799 NXDomain 0/0/0 (39)
22:48:57.150198 IP 3751e8362264.38455 > 192.168.65.5.53: 4647+ PTR? 5.65.168.192.in-addr.arpa. (43)
22:48:57.226115 IP 192.168.65.5.53 > 3751e8362264.38455: 4647 NXDomain 0/0/0 (43)
22:48:58.038210 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 2, length 64
22:48:59.062492 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 3, length 64
22:49:00.086387 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 4, length 64
22:49:01.110147 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 5, length 64
22:49:02.134937 ARP, Request who-has 10.1.2.1 tell 3751e8362264, length 28
22:49:02.134956 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 6, length 64
22:49:02.134924 ARP, Request who-has 3751e8362264 tell 10.1.2.1, length 28
22:49:02.134988 ARP, Reply 3751e8362264 is-at 02:42:0a:01:02:02 (oui Unknown), length 28
22:49:02.134998 ARP, Reply 10.1.2.1 is-at 02:42:6b:1c:fb:7c (oui Unknown), length 28
22:49:02.142375 IP 3751e8362264.60682 > 192.168.65.5.53: 35638+ PTR? 1.2.1.10.in-addr.arpa. (39)
22:49:02.215466 IP 192.168.65.5.53 > 3751e8362264.60682: 35638 NXDomain 0/0/0 (39)
22:49:03.158449 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 7, length 64
22:49:04.183910 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 8, length 64
22:49:05.206160 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 9, length 64
22:49:06.229973 IP 3751e8362264 > 10.1.1.3: ICMP echo request, id 2, seq 10, length 64
^C
20 packets captured
20 packets received by filter
0 packets dropped by kernel
```

Here, we can see that the `request` is being sent for `10.1.1.3`, but we
don't see a corresponding `reply`. Sweet! Our networks exist, but they cannot
communicate with each other. YET!

## Make those networks communicate with each other!

TODO:
1. network our networks together
