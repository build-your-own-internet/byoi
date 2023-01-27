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

How do machines communicate across networks? Well, first they need to have a
router. Sure, docker has its own built in router, but we want to build our own.
What is a router, but just another machine on the network. The router just has 2
special properties:

* it has an interface on more than one network
* it has the ability to forward packets that are not destined for itself to other machines

### Make `boudi` ping `tara`

The containers we've been building and using on our networks are machines on our
network! Instead of adding a new machine to be our router, let's just repurpose
`boudi`. We will need to give `boudi` those special properties.

Let's go back to our `docker-compose.yml` and give `boudi` an additional network
interface.  All we need to do to achieve this is add the `doggonet` network to
`boudi`, which should now look like:

```
  boudi:
    build: .
    networks:
      squasheeba:
        ipv4_address: 10.1.1.3
      doggonet:
        ipv4_address: 10.1.2.3
```

Now, let's re-build our containers and re-run our `tcpdump` and `ping` experiments from earlier. 

```
docker compose down
docker system prune
docker compose up
docker exec -it build-your-own-internet-boudi-1 /bin/bash
```

Before we run our experiment, let's check our ip interface table on `boudi`:

```
root@6f9a282e02ad:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: tunl0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN group default qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0
3: ip6tnl0@NONE: <NOARP> mtu 1452 qdisc noop state DOWN group default qlen 1000
    link/tunnel6 :: brd :: permaddr f2e0:ad7c:997e::
36: eth1@if37: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:01:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.1.3/24 brd 10.1.1.255 scope global eth1
       valid_lft forever preferred_lft forever
38: eth0@if39: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Look at that! There are 2 eth interfaces! `10.1.1.3/24` and `10.1.2.3/24`. Now
let's check our routing table:

```
root@6f9a282e02ad:/# ip route
default via 10.1.2.1 dev eth0
10.1.1.0/24 dev eth1 proto kernel scope link src 10.1.1.3
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.3
```

BOOM! There are routes for both the `squasheeba` and `doggonet` networks! Notice
that `tara` still only knows about `doggonet`:

```
root@292b896a965e:/# ip route
default via 10.1.2.1 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

It looks like we should be able to ping `tara` from `boudi`! Let's check it out!

We're going to open 3 terminal windows, just like before.

1. `docker exec -it build-your-own-internet-boudi-1 /bin/bash` will run `ping 10.1.2.2`
2. `docker exec -it build-your-own-internet-boudi-1 /bin/bash` will run `tcpdump -ni eth0`
3. `docker exec -it build-your-own-internet-tara-1 /bin/bash` will run `tcpdump -n`

> *In terminal window 1 (boudi's ping), you should see:*

```bash
root@6f9a282e02ad:/# ping 10.1.2.2
PING 10.1.2.2 (10.1.2.2) 56(84) bytes of data.
64 bytes from 10.1.2.2: icmp_seq=1 ttl=64 time=0.155 ms
64 bytes from 10.1.2.2: icmp_seq=2 ttl=64 time=0.089 ms
64 bytes from 10.1.2.2: icmp_seq=3 ttl=64 time=0.069 ms
64 bytes from 10.1.2.2: icmp_seq=4 ttl=64 time=0.070 ms
^C
--- 10.1.2.2 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3082ms
rtt min/avg/max/mdev = 0.069/0.095/0.155/0.035 ms
```

It was successful! Huzzah! We were able to ping to `tara` from `boudi`!

> *In terminal window 2 (boudi's tcpdump):*

```bash
root@6f9a282e02ad:/# tcpdump -ni eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:57:13.285276 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 1, length 64
19:57:13.285400 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 1, length 64
19:57:14.321653 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 2, length 64
19:57:14.321705 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 2, length 64
19:57:15.342813 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 3, length 64
19:57:15.342855 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 3, length 64
19:57:16.366989 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 4, length 64
19:57:16.367032 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 4, length 64
^C
8 packets captured
8 packets received by filter
0 packets dropped by kernel
```

Sweet! We can see both the request and the reply from the connection to `tara`!

A note on the command here; `tcpdump -ni eth0`. We passed the `-i eth0` flag
because we saw above in the `ip route` output that `boudi`'s default network
interface was `squasheeba`:

```bash
root@6f9a282e02ad:/# ip route
default via 10.1.2.1 dev eth0
10.1.1.0/24 dev eth1 proto kernel scope link src 10.1.1.3
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.3
```

If we just run `tcpdump` without telling it which network interface to listen
on, we'll see the network traffic on `squasheeba`, which isn't where the ping is
going. We have to explicitly tell `tcpdump` to listen on `eth0` in order to see
the network traffic heading to `doggonet`.

> *In terminal window 3 (tara):*

```bash
root@292b896a965e:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:57:13.285340 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 1, length 64
19:57:13.285392 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 1, length 64
19:57:14.321680 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 2, length 64
19:57:14.321698 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 2, length 64
19:57:15.342833 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 3, length 64
19:57:15.342849 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 3, length 64
19:57:16.367010 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 4, seq 4, length 64
19:57:16.367026 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 4, seq 4, length 64
^C
8 packets captured
8 packets received by filter
0 packets dropped by kernel
```

We can see that the ping from `boudi` made it to `tara`! Huzzah!

### Can `tara` ping `boudi`?

Now... let's see if `tara` is able to ping `boudi`. We're going to do the same 3
window setup, but this time `tara` will be running both `ping` and `tcpdump`.

The interesting thing with `tara` pinging `boudi` is that `boudi` has 2 network
IP addresses we can ping. Which one should we use? Well, 10.1.1.3 is the IP
that's on the `squasheeba` network. `tara`, unfortunately, doesn't know anything
about how to reach this network, which means, if we try to ping it, `boudi`
won't receive the ping and `tara` is just screaming into the void. If instead,
we use `boudi`'s IP on `doggonet`, 10.1.2.3, we should have a successful result.

1. `docker exec -it build-your-own-internet-tara-1 /bin/bash` will run `ping 10.1.2.3` 
2. `docker exec -it build-your-own-internet-tara-1 /bin/bash` will run `tcpdump -ne`
3. `docker exec -it build-your-own-internet-boudi-1 /bin/bash` will run `tcpdump -ni eth0`

**NOTICE** We added the `-e` flag to our `tcpdump` command for `tara`. Why? That
*flag reveals information about ethernet headers in each packet. If we look at
*the network interface information for `boudi`, we can see the mac address for
*its connection on `doggonet`: 02:42:0a:01:02:03.

```bash
root@6f9a282e02ad:/# ip addr
...
46: eth0@if47: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Looking at the `tcpdump` from `tara`, we can see the flow of packets from `tara`
to `boudi`. This is particularly useful when pings aren't being responded to by
the expected host so you can determine where the packets ARE being sent. Here,
we can definitely tell the packets are being sent to the correct host because we
see the mac address for `boudi`. 

```bash
root@292b896a965e:/# tcpdump -ne
...
19:30:10.124776 02:42:0a:01:02:02 > 02:42:0a:01:02:03, ethertype IPv4 (0x0800), length 98: 10.1.2.2 > 10.1.2.3: ICMP echo request, id 12, seq 1, length 64
```

If you have `tara` ping `boudi`'s `squasheeba` address, 10.1.1.3, you'll see the
ping fail, and in the `tcpdump`, you'll see a mac address destination you
probably won't recognize. This is `tara`'s default gateway, and that gateway
won't forward the packets to `boudi`.

### Make `tara` ping hosts on the `squasheeba` network

So let's see if we can get `tara` to ping `boudi`, or `pippin` for that matter,
on the `squasheeba` network without using the default gateway router.

**Quick Question Break**
_Wait... what's the difference between `ip addr` and `ip route`?_

`ip addr` gives us view into the network interfaces available on a host.
`ip route` shows us the routing table on that host.

But it looks like there's routing information in our `ip addr` output? What is
the difference between a network interface and a routing table?

Looking at the output of `ip route`, we see a default gateway identified,
`default via 10.1.2.1 dev eth0`. This default gateway is what will be used for
any outgoing packets that are not on the otherwise defined routes. `ip route`
shows routes on active interfaces. `ip addr` displays all available interfaces
on a host, even ones that are not currently active. 

`ip route` deals entirely with layer 3 information; whereas `ip addr` has
information about both layer 2 and layer 3.

Next time, on gotime:
1. address /etc/hosts (allow `ping boudi` and show `root@boudi` instead of jibberish) [DONE]
2. can we delete the default gateway? and then re-write all of our docs?
3. Cleanup [squee]
  a. Restructure repo to have folders for 001 - n that each contain exactly what they need in the state they need it for the notes to be followed successfully
  b. Read through 001-getting-started.md to ensure it has a narrative flow
  c. Introduce `hostname` concept in 001 with explanation
4. see tara ping to pippin - shoudl fail
5. make boudi do it has the ability to forward packets that are not destined for itself onto other machines
6. Explore what is DHCP and how?