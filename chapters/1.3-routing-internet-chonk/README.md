# Let's make that Internet MOAR BIGGER

## Goals for this section

Let's use the tools and processes we've already discovered to make a much larger internet! In this case, we'll want to be able to traverse several networks to get machines who are not directly connected to be able to communicate with each other. Looking at the network diagram below, we can see that the `client` machine is connected to the `1.0.0.0/8` network. We want `client` to be able to traverse our internet to reach `server` connected to `5.0.0.0/8`.

Here's what we expect the internet to look like at the end of this chapter:

[![chonky internet map][chonky internet map]][chonky internet map]

If this network map is a bit challenging to read, take a moment to review the [How to Read a Network Map](../../appendix/how-to-read-a-network-map.md) document.

### How docker handles MAC addresses

A MAC (media access control) address is the layer 2 address of a machine on a network. If you'd like to review what a MAC address is in detail, checkout [Appendix: ip-and-mac-addresses](../../appendix/ip-and-mac-addresses.md).

Let's look at the output for one of our interfaces shown in `ip addr`:

```bash
38: eth0@if39: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Here, we can see that the IP of the machine is `10.1.2.3` on a `/24` network. The MAC address listed on the line above is `02:42:0a:01:02:03`. It appears to keep things simple, when docker adds a new machine to a network, it has create an interface for that machine and put it on that network. That interface will have its own unique MAC address. Docker can assign whatever it wants for that MAC address, but, to help us, the humans, it will take the IP address for that machine and convert it into a human readable version in hexidecimal. So, the end of that MAC address, `0a:01:02:03`, converted from hexidecimal into decimal is `10.1.2.3`. This is great for us. It means when we look at MAC addresses in our tcpdump later in the chapter, it is much easier to see which machines our packets are being routed through.

> **📝 NOTE:**
> When you see ethernet packets in the wild, there is no correlation between the MAC address and the IP address. This is simply a docker convenience.

## There and Back Again - a setup journey

In order for our little internet to work, we need a way for the machines on our networks to know how and where to route packets. Each router on the network will have a definition of all other networks on the internet and how it can reach machines on those networks. Think about it like this. When a driver is navigating our interstate highways to try to get from Portland to San Francisco, they're gonna see signs that direct them which lanes of traffic will take them in right direction. The driver follows those signs and ends up eventually in the right city. Our routers need those same little signs to follow. Each router will have a "routing table", which is like a list of all our little signs. These routing tables will have entries for how to send packets to each network on our internet.

We want to create routing tables for each of the routers on the network we have diagrammed at the top of this chapter. Each router will need to have entries on how to get to networks that the router does not already have a direct connection to. And, we need these routing tables to be defined as soon as we boot up our network. So, let's define all of the routes that are necessary for router1 and let's add them to the `start-up.sh` file that is run when we `byoi-rebuild` our whole system.

Based on that diagram, out of the 7 networks we've built, router1 already has interfaces on 3 of them:

* `5.0.0.0/8`
* `200.1.1.8/29`
* `3.0.0.0/8`

So, for router1 to participate in this internet, it needs to know how to route packets to each of the 4 networks it's not currently connected to. We can add routes to each of the 4 networks in our `start-up.sh` file to use a similar structure to what we used in chapter 2. So, we'll start by defining how router1 can reach each network through its connections with other routers. You'll see the following already defined in the `start-up.sh` file for this chapter:

```bash
case $HOSTNAME in
  (router1)
    ip route add 1.0.0.0/8 via 3.0.3.1
    ip route add 100.1.0.0/16 via 3.0.3.1
    ip route add 200.1.1.0/29 via 200.1.1.11
    ip route add 200.1.1.16/29 via 3.0.3.1
    ;;
esac
```

## Exercise time: Build your routing tables

The `start-up.sh` file already has some setup in it. Build out the routes for router3 similar to how you see the routes for router1 being done. Once you've got the routes created in `start-up.sh`, `byoi-rebuild` your little internet and `hopon router3`. Can you ping router1 with `ping 5.0.1.1 -w 4`? What about if we try to ping router1 with packets that originate from router3 on `100.1.0.0/16`? Try using `ping -I 100.1.3.1 5.0.1.1 -w 4` to do this.

At this point, router3 knows how to send packets into `5.0.0.0/8`, but `server` doesn't know how to respond. If we try to ping `server` before we add routes telling `server` how to reach `3.0.0.0/8`, `server` will just drop those packets. Let's see what that looks like practically.

```bash
root@router3:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1031ms
```

Here, we can see router3 attempting to ping `server` at `5.0.0.100`. There are no response packets received and the ping times out after 2 seconds (the `-w 2`). Now let's see what's happening on our `server`, we can watch for those incoming pings with a `tcpdump`:

```bash
root@server:/# tcpdump -ne
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:12:02.367255 02:42:05:00:01:01 > 02:42:05:00:00:64, ethertype IPv4 (0x0800), length 98: 3.0.3.1 > 5.0.0.100: ICMP echo request, id 25, seq 1, length 64
18:12:03.398455 02:42:05:00:01:01 > 02:42:05:00:00:64, ethertype IPv4 (0x0800), length 98: 3.0.3.1 > 5.0.0.100: ICMP echo request, id 25, seq 2, length 64
^C
2 packets captured
2 packets received by filter
0 packets dropped by kernel
```

There are 2 `ICMP echo request`s, but we don't see any `ICMP echo reply`s. Set up the route for `server` to know how to send packets to `3.0.0.0/8` in `start-up.sh`. Once that's setup, `byoi-rebuild`, and can you get router3 to ping `server`? If it's successful, you should see the `echo reply`s on the `tcpdump` in your `server`. Let's look at that `tcpdump` in a bit of detail.

```bash
root@server:/# tcpdump -ne
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:20:01.902137 02:42:05:00:01:01 > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 5.0.0.100 tell 5.0.1.1, length 28
18:20:01.902154 02:42:05:00:00:64 > 02:42:05:00:01:01, ethertype ARP (0x0806), length 42: Reply 5.0.0.100 is-at 02:42:05:00:00:64, length 28
18:20:01.902340 02:42:05:00:01:01 > 02:42:05:00:00:64, ethertype IPv4 (0x0800), length 98: 3.0.3.1 > 5.0.0.100: ICMP echo request, id 27, seq 1, length 64
18:20:01.902384 02:42:05:00:00:64 > 02:42:05:00:01:01, ethertype IPv4 (0x0800), length 98: 5.0.0.100 > 3.0.3.1: ICMP echo reply, id 27, seq 1, length 64
18:20:02.921575 02:42:05:00:01:01 > 02:42:05:00:00:64, ethertype IPv4 (0x0800), length 98: 3.0.3.1 > 5.0.0.100: ICMP echo request, id 27, seq 2, length 64
18:20:02.921606 02:42:05:00:00:64 > 02:42:05:00:01:01, ethertype IPv4 (0x0800), length 98: 5.0.0.100 > 3.0.3.1: ICMP echo reply, id 27, seq 2, length 64
6 packets captured
6 packets received by filter
0 packets dropped by kernel
```

The first 2 packets in our `tcpdump` are `ARP` packets, i.e. `Request who-has 5.0.0.100 tell 5.0.1.1` and `Reply 5.0.0.100 is-at 02:42:05:00:00:64`. This is a machine on our network attempting to associate a MAC address with an IP address that it has learned about from an incoming request. For more details on what's happening here, check out the [appendix doc on IP and MAC addresses](../../appendix/ip-and-mac-addresses.md).

Next we see 2 couplets of `ICMP echo request` and `ICMP echo reply`s. In these packets, we can see that the IP address of the machine requesting the ping is `3.0.3.1`, or router3's interface on `3.0.0.0/8`. The destination machine is `5.0.0.100`, or `server`'s interface on `5.0.0.0/8`. But! This also tells us the MAC addresses that are involved in the direct communication with `server`. So, when we see `02:42:05:00:01:01 > 02:42:05:00:00:64`, we can use what we know about how docker creates MAC addresses and see that router1's interface on `5.0.0.0/8`, `02:42:05:00:01:01`, is the interface sending the packets to `server`, `02:42:05:00:00:64`.

Now that you have router3 able to ping `server`, build out the rest of the internet! Check that things work using ping at every step of the way! We recommend building out one "hop" at a time, so from router3, build out router2's connections. Check that router2 can ping `server` and router5. Move to router4. Can it ping `server`, router3, router5, and router2? Can it ping each router on every interface that router has on any network? Check the `ping -h` help to see how you can originate your ping from a specific interface. Can you ping from a specific interface on a router to a specific interface on another router?

If you have problems creating your routing tables, the next exercise is going to cover troubleshooting!

## Troubleshoot your internet

### What's the problem here

We've built an internet! Yay! We have routing tables on each machine on our internet that tells it where to send packets bound for a machine on any other network on our internet! Neat! But... It appears our internet is broken. When we try to `ping` our `server` from our `client`, we're not seeing response packets coming back. We need to figure out what's happening and fix our internet! Let's setup your environment with the same break so you can investigate along with us.

### Set up your environment

The first thing we'll need to do is get your network set up with a break we can investigate! Lucky for you, we've already created a setup that is broken and ready to use. If you check the `/init/start-up-exercise.sh` file, you'll see a whole set of routing tables created for each of the machines on our network. We want to use this broken setup instead of the working one you created in exercise 1.

If you remember from chapter 1, the way this file is loaded into our docker containers is through the container definition in our chapter's `Dockerfile`. We will want to update the line that says to use `./init/start-up.sh` to instead use `./init/start-up-exercise.sh`, so your `Dockerfile` will look like:

```Dockerfile
FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping net-tools bind9-utils dnsutils vim inetutils-traceroute mtr iptables
COPY ./init/start-up-exercise.sh /start-up.sh

CMD ["/start-up.sh"]
```

### Discover the breakage

So, we've built out our internet! Let's make sure our client can `ping` our server:

```bash
root@client:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1046ms
```

Uh oh! We're not getting any response back from our `ping`! Something is wrong in internet land! Let's go figure out what that could be. When a client isn't receiving response packets from it ping, there's only 2 things that could be going on.

1. A router that is responsible for getting request packets to their destination thinks it is impossible to get to the destination IP address
2. Packets are getting lost to or from the destination

Let's explore what these three things mean a little.

#### A router that is responsible for getting request packets to their destination thinks it is impossible to get to the destination IP address

This can happen for 2 reasons. A router that has an interface on the network of the destination IP sees that there is no machine with the destination IP on that network. OR a router that does not have an interface on the network of the destination IP and doesn't have a default route doesn't have a route for the destination IP.

Basically, if the machine didn't exist, we would get an error response to our `ping`. For example, if we try to `ping 1.0.0.50`, a machine we've never created on our internet, we get back `Destination Host Unreachable`:

```bash
root@client:/# ping 1.0.0.50
PING 1.0.0.50 (1.0.0.50) 56(84) bytes of data.
From 1.0.0.100 icmp_seq=1 Destination Host Unreachable
```

When we see `Destination Host Unreachable`, the packets were correctly routed to the network indicated by the IP address. However, when they got there, the router performed an ARP request for the machine in the `ping`, `1.0.0.50`, but it didn't receive a response. Because the router couldn't find the machine on its network, it responded to the `ping` with an error.

> ASIDE: This could be a potential security leak. It tells an attacker something about what machines exist on the network. In modern network achitechture, this error response will be turned off to prevent unintentionally revealing the network shape.

*TODO* In a future chapter, let's look at firewall settings to prevent this security leak.

We know that the problem we're seeing in this exercise is not that the machine doesn't exist because we're not getting back this `Destination Host Unreachable` error. Instead, the issue is going to be a routing issue.

Another case we could see is if a router doesn't have a route defined to a network in its routing table AND it doesn't have a default gateway. If that were the case, we would see a similar error message to what we saw when trying to ping a non-existant host:

```bash
root@client:/# ping 9.0.0.1
PING 9.0.0.1 (9.0.0.1) 56(84) bytes of data.
From 1.0.5.1 icmp_seq=1 Destination Net Unreachable
```

In our case, because we're just getting no response back, that means the packets are being lost somewhere in our internet.

#### Packets are getting lost to or from the destination

In this case, all of our routers think they know how to forward packets to complete the full request/response cycle. However, our source/client isn't receiving the response packets.

In a network *without* firewalls, this would most likely occur when there are 2 or more routers pointing to each other for their routing decisions, e.g. Router4 thinks it needs to pass the packets to Router3 to get to `5.0.0.0/8` but Router3 thinks it needs to pass the packets to Router4. This is called a routing loop.

In a network *with* firewalls, some firewall definition is probably tossing our packets on the floor. HOWEVER! Our internet is laisse-faire and uses no firewalls.

We need to find where in our network communication is breaking down, where packets are getting lost, and in what direction those packets are getting lost. We know that this is a networking issue, but in which direction?

### The Investigation

We need some process to help us identify where the problem in our internet lives. What we've tried so far is to `ping` from Client to Server. That's causing us to traverse our whole internet, which is a lot of machines and a lot of points of potential failure. We can simplify this in a couple ways. First, we can figure out if the issue is in routing the requests TO or FROM the destination IP. Once we know the direction that the packets are getting lost, we can check, hop by hop, where the packets are going and find the exact router(s) where they're getting lost.

Let's start by running that same `ping` from Client to Server, but this time, let's watch on server to see if the packets are even making it there. Open a second terminal window and run a `tcpdump` on server:

```bash
root@server:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
21:31:52.871414 IP 1.0.0.100 > 5.0.0.100: ICMP echo request, id 81, seq 1, length 64
21:31:52.871444 IP 5.0.0.100 > 1.0.0.100: ICMP echo reply, id 81, seq 1, length 64
21:31:52.871718 IP 3.0.3.1 > 5.0.0.100: ICMP time exceeded in-transit, length 92
21:31:53.902288 IP 1.0.0.100 > 5.0.0.100: ICMP echo request, id 81, seq 2, length 64
21:31:53.902331 IP 5.0.0.100 > 1.0.0.100: ICMP echo reply, id 81, seq 2, length 64
21:31:53.905679 IP 3.0.3.1 > 5.0.0.100: ICMP time exceeded in-transit, length 92
```

Great! We can see the packets coming in from Client, `1.0.0.100`:
> 21:31:52.871414 IP 1.0.0.100 > 5.0.0.100: ICMP echo request, id 81, seq 1, length 64

And we can see the response packets going out:
> 21:31:52.871444 IP 5.0.0.100 > 1.0.0.100: ICMP echo reply, id 81, seq 1, length 64

This means that the routing problem is on the response path back from Server => Client!

But what's this `ICMP time exceeded in-transit`?
> 21:31:52.871718 IP 3.0.3.1 > 5.0.0.100: ICMP time exceeded in-transit, length 92

It appears that router3 on 3.0.0.0/8 is letting the server know that it is unable to route packets.

Before we can dive into that, we need to know how `ping` works. Let's start by looking at the output of a successful `ping` from Client to Router5:

```bash
root@client:/# ping 1.0.5.1 -w 2
PING 1.0.5.1 (1.0.5.1) 56(84) bytes of data.
64 bytes from 1.0.5.1: icmp_seq=1 ttl=64 time=0.101 ms
64 bytes from 1.0.5.1: icmp_seq=2 ttl=64 time=0.207 ms

--- 1.0.5.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1068ms
rtt min/avg/max/mdev = 0.101/0.154/0.207/0.053 ms
```

Do you see how, on each response recorded in this example, there's a `ttl=64`: `64 bytes from 1.0.5.1: icmp_seq=1 ttl=64 time=0.101 ms`? OK, let's jump out one hop and look at the output for a `ping` to Router4:

```bash
root@client:/# ping 100.1.4.1 -w 2
PING 100.1.4.1 (100.1.4.1) 56(84) bytes of data.
64 bytes from 100.1.4.1: icmp_seq=1 ttl=63 time=0.181 ms
64 bytes from 100.1.4.1: icmp_seq=2 ttl=63 time=0.480 ms

--- 100.1.4.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1028ms
rtt min/avg/max/mdev = 0.181/0.330/0.480/0.149 ms
```

Oooh! In this case, it's `ttl=63`. `ping` uses `ttl`, or "time to live", not by counting seconds, but instead by counting hops. So, when a `ping` is newly generated, it has its `ttl` set to a default number. Different operating systems have different defaults defined. On the linux system we are using in our containers, the default appears to be 64. You can confirm that by running the following:

`root@client:/# cat /proc/sys/net/ipv4/ip_default_ttl`

Every router it runs through decrements this count before forwarding the packet. This means that, if a router receives a packet and it decrements the `ttl` down to `0`, the request has timed out, or in the words of the error, `ICMP time exceeded in-transit`. The only way we could have exceeded the 64 count `ttl` in our little network is if we have a routing loop.

Dope! Now we know for sure that the problem is a routing loop and that it exists on the response path! The other thing we see in that error in our `tcpdump` is the router that issued the timeout: `3.0.3.1` or Router3. Let's `hopon router3` and issue a `ping` to client and see if it gets there.

```bash
root@router3:/# ping 1.0.0.100 -w 2
PING 1.0.0.100 (1.0.0.100) 56(84) bytes of data.

--- 1.0.0.100 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1022ms
```

But this `ping` alone won't tell us much. Let's re-run that `ping` while we watch the traffic on Router3 to see where our requests are going. To start with, we need to know which interface the requests are leaving Router3 on, which means... back to our old friend `ip addr`:

```bash
root@router3:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
777: eth1@if778: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:03:00:03:01 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 3.0.3.1/8 brd 3.255.255.255 scope global eth1
       valid_lft forever preferred_lft forever
791: eth0@if792: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:64:01:03:01 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 100.1.3.1/16 brd 100.1.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Remember, this output could be different on your build of the little internet, so run this for yourself and use the correct interfaces for the network addresses we're watching. In this case, Router3's interface on `3.0.0.0/8` is `eth1` and its interface on `100.1.0.0/16` is `eth0`. Open a new terminal window and run your `tcpdump` on both. This will tell us which interface the packets are exiting out of:

```bash
root@router3:/# tcpdump -nei eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
21:57:59.839787 02:42:64:01:03:01 > 02:42:64:01:02:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 1, length 64
21:57:59.839891 02:42:64:01:02:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 1, length 64
21:58:00.861600 02:42:64:01:03:01 > 02:42:64:01:02:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 2, length 64
21:58:00.861768 02:42:64:01:02:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 126: 100.1.2.1 > 100.1.3.1: ICMP redirect 1.0.0.100 to host 100.1.3.1, length 92
21:58:00.861795 02:42:64:01:02:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 2, length 64
^C
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```

There is a lot happening in this output. Let's look at it line by line to understand what is happening.

Let's start with:
> `21:57:59.839787 02:42:64:01:03:01 > 02:42:64:01:02:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 1, length 64`.

Here, we see router3 sending a packet destined for client (`100.1.3.1 > 1.0.0.100`) via router2 (`02:42:64:01:03:01 > 02:42:64:01:02:01`). We are referencing IP and MAC addresses to glean this information. If this is confusing to you, you can look at [Appendix: Understanding tcpdump](../command-reference-guide.md#tcpdump) for more details. This is the basic communication we are expecting to see. `ICMP echo request` is the initiation of a ping. Referencing our network map, it seems like it is a bad choice to be routing the packet to router2 but we are people that are open to possibilities. So we will remain curious and see what happens!

On to the next line:
> `21:57:59.839891 02:42:64:01:02:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 1, length 64`

Hmmm, it appears that router2 agrees with our earlier assessment! We see the original source and destination IPs from router3 to client (`100.1.3.1 > 1.0.0.100`) but router2 is sending the packet **back** to router3 (`02:42:64:01:02:01 > 02:42:64:01:03:01`). That's what we in the biz say, "Not cool man!"

We think we might have found the problem: router3 is sending packets to router2 and router2 is returning them in an infinite loop! But let's keep looking at this pitter patter among routers just to see if there is anything more interesting!
> `21:58:00.861600 02:42:64:01:03:01 > 02:42:64:01:02:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 2, length 64`

First off, we see `seq 2` which is different from `seq 1` that we have seen thus far. This tells us that it is the second ping request being sent to client. This is the same pattern we observed in the first ping request, so let's continue on!

> `21:58:00.861768 02:42:64:01:02:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 126: 100.1.2.1 > 100.1.3.1: ICMP redirect 1.0.0.100 to host 100.1.3.1, length 92`

ICMP redirect! What does that mean? It's the technical term for the pitter patter we were observing earlier. When a router receives packets on the same interface it will forward them out of, that means the machine it received the packets from and the machine it is forwarding the packets to are on the same network. Therefore, they can communicate directly with each other instead of going through the intermediate router.

In our case, router2 is sending a ICMP redirect to router3 so router3 can make a more efficient routing decision and not have packets destined to client go through router2. router3 ignores these messages for two reasons:

1. it makes no sense for router3 to send packets to itself to reach client.
2. Kernels have a configuration to determine whether to accept ICMP redirects but they are generally disabled for security reasons.

> `21:58:00.861795 02:42:64:01:02:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 98: 100.1.3.1 > 1.0.0.100: ICMP echo request, id 91, seq 2, length 64`

Finally, we get to our last line... We see the same thing we saw in `seq 1`; router2 is sending the `echo request` packets router3 had sent to it right back to router3.

We've found out loop! Next step: go check the `start-up-exercise.sh` and look at the routes going to `1.0.0.0/8` on both router2 and router3. Where should those point instead? Use the network map at the beginning of this chapter to determine where these packets *should* be getting forwarded to and update the routes. `byoi-rebuild` your containers and try your `ping` again!

## Appendix

### docker-compose settings

We had to make some changes to the docker-compose file that generates the machines and networks for our internet. These changes were made to thwart default behavior that makes docker or linux work in better, more predicatable ways, but weren't advantageous to our particular scenario. Here's a summary of those changes:

#### IP Masquerade

First, each network definition now includes a `com.docker.network.bridge.enable_ip_masquerade: 'false'`. We discovered in trying to build out our initial internet that docker uses a default router to communicate between networks. This default router was intercepting packets that we were attempting to send between networks. This is intended behavior for docker! In most cases when you're using docker, you don't want to have to setup all the network configurations! But... in our case... we WANT to be able to configure our network at a minute level. Sooo... adding that `enable_ip_masquerade: false` line removes the default router on the network.

If you'd like to see the notes from our investigation, check out [Miscellaneous: routing-pitfalls.md](../../miscellaneous/routing-pitfalls.md). Disclaimer: these notes are not the refined and beauteous things you are witnessing in the chapters. These are notes. But they do demonstrate our discovery process for identifying the problem.

#### RP Filter

`rp_filter`, or reverse path filter, is a setting on Linux machines that tells them to filter (or drop) packets that come in on one interface but are expected to go out a different interface on the return path. Let's look at an example. Look at the network map at the beginning of chapter 4. Packets coming from Client were sent to router4 via router5 on `200.1.1.16/29`, but, when router4 checked its routing table, it saw that its route back to Client was over `100.1.0.0/16`. Because the interfaces for incoming and outgoing packets to the same IP were different, router4 would drop the packets.

If you'd like to see the rough notes of our discovery, checkout [Miscellaneous: discovery-rp_filter](../../miscellaneous/discovery-rp_filter.md). Again, these notes are not refined, but they do show our discovery process.

### How to read an IP address; i.e. octets and subnets

This requires a long and detailed description to really understand. For the sake of keeping this document brief, we've moved the explanation for this to [Appendix: prefixes-and-subnet-masks.md](../../appendix/prefixes-and-subnet-masks.md) in the appendix. Please read that document and come back here when you feel confident you have a basic understanding of what it contains!

<!-- Links, reference style, inside docset -->
[chonky internet map]:       ../../img/network-maps/internet-chonk-network-map.svg
                             "A Chonky Internet Network Map"

<!-- end of file -->