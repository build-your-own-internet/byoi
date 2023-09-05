# Let's make an Internet

## Goals for this section

In the previous chapter, we build a small network of 2 machines that could ping each other. Now, we want to build on that structure to add a second network. Once we have another network, we'll need to start building routes for machines on each network to be able to communicate with each other.

Here's what we expect our internet to look like by the end of this chapter:

```
         tara
          │ 10.1.2.1
          │
 ────┬────┴────────────────────
     │       (doggonet 10.1.2.0/24)
     │
     │
     │
     │10.1.2.3
   boudi             pippin
     │10.1.1.3          │10.1.1.2
     │                  │
     │                  │
─────┴──────────────────┴──────
              (squasheeba 10.1.1.0/24)
```

### Aside: Efficiencies

#### Naming of the Containers

You may have noticed in chapter 1 that, while we named our containers `boudi` and `pippin`, what appeared in the terminal when we jumped on those containers was a sha that doesn't have much meaning for us, e.g. `root@0c3ce9be81e7:/#`. Because that sha doesn't have meaning for us, it was hard to track which window was a terminal for which container.

Also, as we started working on this chapter and were working with 3 machines on 2 networks, we also started getting our IP addresses jumbled. We wanted a solution that gave us a prettier prompt in our terminal, e.g. `root@boudi:/#`, and we wanted to be able to ping a container with the container name, e.g. `ping pippin`.

The first solution we employed was to modify the `/etc/hosts` on each machine, e.g. `10.1.1.2 pippin` on `pippin`. This was great, except it's a continued manual effort every time we have to rebuild the containers. Turns out... adding a `hostname` to the container definition in `docker-compose.yml` did the trick!

#### Scripts

Before we get started, let's look at a couple scripts we added. On the root level of this repo, there's a `bin` folder. We've started adding simple scripts there to make our lives easier. Here's the scripts we've added thus far:

* `hopon`: in order to jump on a container, we had to type a long-ish command `docker exec -it 002-smol-internet-boudi-1 /bin/bash`. This allows us to simply type `hopon boudi`, which we will be using for the rest of our exploration.
* `restart`: in experimenting with various setups in both our `Dockerfile` and `docker-compose.yml`, we needed to cleanup the images our containers were built from regularly. Now, we can simply type `restart` instead of finding and removing each container.

Because the scripts are dependent on a version of `docker-compose.yml` that exists in each chapter subfolder, we need to add the scripts to our `PATH` from the root of this directory:

```
# Make sure to run this command in the root of this repository, or it won't work!
export PATH="$PATH:`pwd`/bin"
```

Running an `export` in a new window means that the variable exported only lives for the life of that session. So, if you close that window or you open a new window, that variable doesn't exist. That's a bit of a pain, so, alternatively, if you don't want to have to add the path in every window you open, you can update your PATH in your terminal profile:

```
export PATH=$PATH:/path/to/repo/build-your-own-internet/bin
```

Now, onward! To the building of the internet!

## Create a second network

What we have created so far is a single network and our goal is to build an internet(work). Towards that goal, we want to create a second network (doggonet) that cannot directly talk to the previously created network (squasheeba).

If you check the `docker-compose.yml` file for this chapter, you'll see that we added a new network: `doggonet`.

```
  doggonet:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 10.1.2.0/24
```

What's a network without a container right? We start this chapter with a lone `tara` reigning over the doggonet:

```
  tara:
    build: .
    hostname: tara
    networks:
      doggonet:
        ipv4_address: 10.1.2.2
    cap_add:
      - NET_ADMIN
```

> **NOTE:**
> We add `boudi` to `doggonet` by the end of the chapter. To follow the course of this chapter, you may wish to remove the `doggonet` network from `boudi`.

### Can our networks communicate with each other?

Now we have 2 separate networks. Fantastic! An internet is a group of machines on different networks that can all communicate with each other. We have the machines, we have the networks, but before we go about getting them to talk to each other, let's make sure they can't already communicate... To do this, we're gonna reuse the same tricks we did in part 001.

First, let's jump onto one of the containers on our `squasheeba` network:

```
hopon boudi
```

We're going to try to ping `boudi` from `tara` on the `doggonet` network. We can see if the ping reaches our container by running `tcpdump` and looking for any output.

Then, we need to open 2 new terminal windows and jump on a container on the `doggonet` network on both of them:

```
hopon tara
```

In the first window, run `tcpdump -n` so we can see the network traffic that's happening on the container we're running our `ping` from. On the second window, we're going to `ping` the address we defined for `boudi` in our docker-compose file:

```
ping 10.1.1.3
```

Alternatively, you can `ping boudi` if you wanna keep it simple.

The `ping` should result in no output because we're not actually hitting a machine for that IP address. The `tcpdump` on `boudi`, likewise, will have no output because the `ping` from `tara` is never reaching it. The `tcpdump` from `tara`, on the other hand:

```bash
root@boudi:/# tcpdump -n
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

Here, we can see that the `request` is being sent for `10.1.1.3`, but we don't see a corresponding `reply`. Sweet! Our networks exist, but they cannot communicate with each other. YET!

> **What's with those ARP requests?**

There are some odd looking packets identified as `ARP` in the tcpdump:

```bash
19:23:01.863431 ARP, Request who-has 10.1.2.1 tell 10.1.2.2, length 28
19:23:01.863490 ARP, Reply 10.1.2.1 is-at 02:42:e0:c7:ba:94, length 28
```

10.1.2.1 is the address for the default gateway on `doggonet`, e.g.:

```bash
root@boudi:/# ip route
default via 10.1.2.1 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

But what is actually happening in that request/reply? For a detailed explanation, checkout the [appendix on ip v. mac addresses](../appendix/ip-and-mac-addresses.md).

Now back to our regularly scheduled exploration!

## Make those networks communicate with each other

How do machines communicate across networks? Well, first they need to have a router. Sure, docker has its own built in router, but we want to build our own.  What is a router, but just another machine on the network. A router just has 2 special properties that make it a router instead of just another machine on the network:

* an interface on more than one network
* the ability to forward packets that are not destined for itself to other machines

### Make `boudi` ping `tara`

The containers we've been building and using on our networks are machines on our network! Instead of adding a new machine to be our router, let's just repurpose `boudi`. We will need to give `boudi` those special properties.

Let's go back to our `docker-compose.yml` and give `boudi` an additional network interface.  All we need to do to achieve this is add the `doggonet` network to `boudi`, which should now look like:

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
restart
hopon tara
```

Before we run our experiment, let's check our ip interface table on `boudi`:

```
root@boudi:/# ip addr
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

Look at that! There are 2 eth interfaces! `10.1.1.3/24` and `10.1.2.3/24`. Now let's check our routing table:

```
root@boudi:/# ip route
default via 10.1.2.1 dev eth0
10.1.1.0/24 dev eth1 proto kernel scope link src 10.1.1.3
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.3
```

BOOM! There are routes for both the `squasheeba` and `doggonet` networks! Notice that `tara` still only knows about `doggonet`:

```
root@tara:/# ip route
default via 10.1.2.1 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

It looks like we should be able to ping `tara` from `boudi`! Let's check it out!

We're going to open 3 terminal windows, just like before.

1. `hopon boudi` will run `ping 10.1.2.2`
2. `hopon boudi` will run `tcpdump -ni eth0`
3. `hopon tara` will run `tcpdump -n`

> *In terminal window 1 (boudi's ping), you should see:*

```bash
root@boudi:/# ping 10.1.2.2
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
root@boudi:/# tcpdump -ni eth0
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

A note on the command here; `tcpdump -ni eth0`. We passed the `-i eth0` flag because we saw above in the `ip route` output that `boudi`'s default network interface was `squasheeba`:

```bash
root@boudi:/# ip route
default via 10.1.1.1 dev eth1
10.1.1.0/24 dev eth1 proto kernel scope link src 10.1.1.3
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.3
```

If we just run `tcpdump` without telling it which network interface to listen on, we'll see the network traffic on `squasheeba`, which isn't where the ping is going. We have to explicitly tell `tcpdump` to listen on `eth0` in order to see the network traffic heading to `doggonet`.

> *In terminal window 3 (tara):*

```bash
root@tara:/# tcpdump -n
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

Now... let's see if `tara` is able to ping `boudi`. We're going to do the same 3 window setup, but this time `tara` will be running both `ping` and `tcpdump`.

The interesting thing with `tara` pinging `boudi` is that `boudi` has 2 network IP addresses we can ping. Which one should we use? Well, 10.1.1.3 is the IP that's on the `squasheeba` network. `tara`, unfortunately, doesn't know anything about how to reach this network, which means, if we try to ping it, `boudi` won't receive the ping and `tara` is just screaming into the void. If instead, we use `boudi`'s IP on `doggonet`, 10.1.2.3, we should have a successful result.

1. `hopon tara` will run `ping 10.1.2.3`
2. `hopon tara` will run `tcpdump -ne`
3. `hopon boudi` will run `tcpdump -ni eth0`

> **NOTICE**
> We added the `-e` flag to our `tcpdump` command for `tara`. Why? That flag reveals information about ethernet headers in each packet. If we look at the network interface information for `boudi`, we can see the mac address for its connection on `doggonet`: 02:42:0a:01:02:03.

```bash
root@boudi:/# ip addr
...
46: eth0@if47: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Looking at the `tcpdump` from `tara`, we can see the flow of packets from `tara` to `boudi`. This is particularly useful when pings aren't being responded to by the expected host so you can determine where the packets ARE being sent. Here, we can definitely tell the packets are being sent to the correct host because we see the mac address for `boudi`.

```bash
root@tara:/# tcpdump -ne
...
19:30:10.124776 02:42:0a:01:02:02 > 02:42:0a:01:02:03, ethertype IPv4 (0x0800), length 98: 10.1.2.2 > 10.1.2.3: ICMP echo request, id 12, seq 1, length 64
```

If you have `tara` ping `boudi`'s `squasheeba` address, 10.1.1.3, you'll see the ping fail, and in the `tcpdump`, you'll see a mac address destination you probably won't recognize. This is `tara`'s default gateway, and that gateway won't forward the packets to `boudi` on `squasheeba`.

We're getting tired of hitting `CTRL c` to exit out of our `ping` when we're done... Let's check `ping --help` and find some flags that will allow us to:

* only send 1 ping
* exit the program after a specific amount of time

```
root@tara:/# ping -c 1 -w 1 10.1.1.3
PING 10.1.1.3 (10.1.1.3) 56(84) bytes of data.

--- 10.1.1.3 ping statistics ---
1 packets transmitted, 0 received, 100% packet loss, time 0ms
```

```
root@tara:/# tcpdump -ne
18:29:45.268130 02:42:0a:01:02:02 > 02:42:a9:f7:9e:4f, ethertype IPv4 (0x0800), length 98: 10.1.2.2 > 10.1.1.3: ICMP echo request, id 30, seq 1, length 64
18:29:50.570491 02:42:0a:01:02:02 > 02:42:a9:f7:9e:4f, ethertype ARP (0x0806), length 42: Request who-has 10.1.2.1 tell 10.1.2.2, length 28
18:29:50.570543 02:42:a9:f7:9e:4f > 02:42:0a:01:02:02, ethertype ARP (0x0806), length 42: Reply 10.1.2.1 is-at 02:42:a9:f7:9e:4f, length 28
```

From this `tcpdump`, we can see `tara`'s mac address, `02:42:0a:01:02:02` attempting to reach `02:42:a9:f7:9e:4f`. But remember, `boudi`'s mac address is `02:42:0a:01:01:03`. This tells us that `tara` is making a hail mary to reach `10.1.1.3` via the default gateway that docker configured for us automatically.

But wait! That's not the behavior we want... Let's get rid of that default gateway. To do it manually, we can `hopon tara` and run

```
root@tara:/# ip route del default
```

Now, when we try to ping `boudi` on the `squasheeba` network, we get the failure we expect:

```
root@tara:/# ping 10.1.1.3
ping: connect: Network is unreachable
```

And, watching carefully, we see that the `tcpdump` on `tara` no longer has any output.

BOOM! Good job, team.

### Make `tara` ping hosts on the `squasheeba` network

So let's see if we can get `tara` to ping `boudi`, or `pippin` for that matter, on the `squasheeba` network without using the default gateway router. The first thing we need to do is add a route from `tara` to the `squasheeba` network via `boudi`. Because `boudi` has routes to both `doggonet` and `squasheeba`, `boudi` can act as the gateway between the two.

```
root@tara:/# ip route add 10.1.1.0/24 via 10.1.2.3
root@tara:/# ip route
10.1.1.0/24 via 10.1.2.3 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

Now, let's try that `ping` again!

> `tara` running `ping 10.1.1.3 -c 2 -w 2`

```
root@tara:/# ping 10.1.1.3 -c 2 -w 2
PING 10.1.1.3 (10.1.1.3) 56(84) bytes of data.
64 bytes from 10.1.1.3: icmp_seq=1 ttl=64 time=0.264 ms
64 bytes from 10.1.1.3: icmp_seq=2 ttl=64 time=0.080 ms

--- 10.1.1.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1040ms
rtt min/avg/max/mdev = 0.080/0.172/0.264/0.092 ms
```

> `tara` running `tcpdump -ne`

```
18:55:02.338267 02:42:0a:01:02:02 > 02:42:0a:01:02:03, ethertype IPv4 (0x0800), length 98: 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 1, length 64
18:55:02.338436 02:42:0a:01:02:03 > 02:42:0a:01:02:02, ethertype IPv4 (0x0800), length 98: 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 1, length 64
18:55:03.378606 02:42:0a:01:02:02 > 02:42:0a:01:02:03, ethertype IPv4 (0x0800), length 98: 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 2, length 64
18:55:03.378653 02:42:0a:01:02:03 > 02:42:0a:01:02:02, ethertype IPv4 (0x0800), length 98: 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 2, length 64
```

>`boudi` running `tcpdump -ni eth0` <= `doggonet` interface

```
18:55:02.338352 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 1, length 64
18:55:02.338420 IP 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 1, length 64
18:55:03.378631 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 2, length 64
18:55:03.378649 IP 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 2, length 64
```

> `boudi` running `tcpdump -ni eth1` <= `squasheeba` interface

NOTHING shows up here! Why? When the packets reach `boudi`, `boudi` recognizes that they have reached their destination. There's no need to send the packet through the `squasheeba` interface just to stay on the same machine. The work is done!

Now, what happens when we send those packets on to `pippin`? Add a new terminal window and `hopon pippin` and run `tcpdump -n`. Then, from `tara`, ping `pippin`.

```
root@tara:/# ping 10.1.1.2 -c 2 -w 2
PING 10.1.1.2 (10.1.1.2) 56(84) bytes of data.

--- 10.1.1.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1028ms
```

Notice that we see 100% packet loss. But, when we check `pippin`'s `tcpdump`, we can see that the request got to `pippin`:

```
19:01:36.666989 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
19:01:36.667005 ARP, Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
19:01:36.667023 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 37, seq 1, length 64
19:01:37.729917 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 37, seq 2, length 64
```

What happened here?

* `tara` has a route into the `squasheeba` network via `boudi`
* `boudi` receives the requests and:
  * checks the destination IP
  * sees that the request is not for itself
  * checks whether or not to forward the packet
  * finds out that it should route the packets - we'll come back to this
  * and does an ARP request which finds `pippin`

`boudi` knows where the packets go and sends them on to `pippin`.  That's the first half of the process! `pippin` has ping packets!

But then what? `pippin` needs to reply to the ping, `pippin` knows the response needs to go to `10.1.2.2`, but `pippin` doesn't know where `10.1.2.2` is. Just like `tara` didn't know before we added the route to `10.1.1.0/24`. `pippin` has no entries to tell it where to send its response packets, so it just drops them on the floor.

### Tell `pippin` how to respond to `tara`

We've already seen this in action. At this point, we need to tell `pippin` how to find the `doggonet` network. We did this earlier in teaching `tara` how to find the `squasheeba` network. We're going to leave this as an exercise for the reader to attempt on their own. If you need some guidance, review the [Can `tara` ping `boudi`?](#can-tara-ping-boudi) section.

## Now let's make this routing setup automatic

We don't want to spend the time manually adding and removing routes every time we start our containers. Earlier, we looked at automatically removing routes by adding the `ip route delete` to our `sleep.sh` file that runs on the container start. We're gonna do something similar here, except the logic is a bit more complicated. Because we want to add routes depending on the `hostname`, i.e. `tara` or `pippin`, we need some conditional logic. Check this out!

```bash
case $HOSTNAME in
  (pippin) ip route add 10.1.2.0/24 via 10.1.1.3;;
  (tara) ip route add 10.1.1.0/24 via 10.1.2.3;;
esac
```

We will add this logic to the `sleep.sh` for chapter 003.

## Appendix: Answering Questions

### What's the difference between `ip addr` and `ip route`?

There's some similar output between the `ip addr` and `ip route` commands. `ip addr` gives us view into the network interfaces available on a machine.  `ip route` shows us the routing table on that machine.

But it looks like there's routing information in our `ip addr` output? What is the difference between a network interface and a routing table?

Looking at the output of `ip route`, we see a default gateway identified, `default via 10.1.2.1 dev eth0`. This default gateway is what will be used for any outgoing packets that are not on the otherwise defined routes. `ip route` shows routes on active interfaces. `ip addr` displays all available interfaces on a machine, even ones that are not currently active.

`ip route` deals entirely with layer 3 information; whereas `ip addr` has information about both layer 2 and layer 3.

### How does a machine know if it should forward packets?

This is a linux kernel setting within the machine. You can see it like so:

```
root@boudi:/# cat /proc/sys/net/ipv4/ip_forward
1
```

It looks like docker, by default, sets the value on every container to `1`, which means, "yeah, forward those packets!" Let's change that value to 0 and see what happens! There's a lot of permission shenanigans happening with docker...  So, in order to turn off packet forwarding on `boudi`, we need to change our docker-compose.yml file. docker-compose exposes `sysctls` which allows us to change default kernel settings. We have explicitly added that setting to `boudi` and it should currently be set to `1`. Change it to `0` to disable ip forwarding.

```
  boudi:
    build: .
    hostname: boudi
    networks:
      squasheeba:
        ipv4_address: 10.1.1.3
      doggonet:
        ipv4_address: 10.1.2.3
    cap_add:
      - NET_ADMIN
    sysctls:
      - net.ipv4.ip_forward=0
```

For the sake of ensuring the rest of this chapter works as expected, we will not disable ip forwarding on `boudi`. HOWEVER, we are going to disable ip forwarding for `pippin` and `tara`.

### What is happening with that `0 packets dropped by kernel` from `tcpdump` when packets were dropped?

```
^C
4 packets captured
4 packets received by filter
0 packets dropped by kernel
```

Each of the machines say `0 packets dropped by kernel`. Ummm… if the packets didn’t make it back to `tara` and the packets weren’t dropped… where did they go? Well, `pippin` still dropped the packets. The `0 packets dropped by kernel` count isn't the number of packets dropped in total; it's the number of packets dropped *by tcpdump*. Specifically, `tcpdump` would drop those packets [because of buffer overflow](https://unix.stackexchange.com/questions/144794/why-would-the-kernel-drop-packets).
