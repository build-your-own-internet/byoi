# Let's make that Internet MOAR BIGGER!

## Goals for this section

Let's use the tools and processes we've already discovered to make a much larger
internetwork! In this case, we'll want to be able to traverse several networks
to get machines who are not directly connected to be able to communicate with
each other. Looking at the network diagram below, we can see that the `client`
machine is connected to the `1.0.0.0/8` network. We want `client` to
be able to traverse our internetwork to reach `server` connected to
`5.0.0.0/8`.

Here's what we expect the internet to look like at the end of this chapter:

```markdown
                                          200.1.1.0/29
                                ┌─────────────────────────┐
               200.1.1.8/29     │ (.2)               (.3) │
             ┌────────────────Router2                  Router4─────┐
             │ (.11)            │                        │    (.18)│
             │             ─────┴─┬──────────────────────┴─┬─      │200.1.1.16/29
             │                    │       100.1.0.0/16     │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │  (.19)│
             │                Router3                   Router5────┘
             │                  │                           │
             │      ──┬─────────┴────────            ───────┴──────────────┬──
             │        │       3.0.0.0/8                    1.0.0.0/8       │
             │        │                                                    │
             │        │                                                    │
             │ (.10)  │                                                    │
  Server     └─────Router1                                               Client
  (.100)              │                                                  (.100)
────┴─────────────────┴─────
              5.0.0.0/8
```

## Asides

### Pets v. Cattle

You might be wondering what the hell happened to our fun pets and their
personalities from the previous chapter. Well, we are in serious business
territory now and there is no room for emotions and personality when it comes to
serious business™. In other words, when you are dealing with large
infrastructure, it's much easier to manage things when you assign roles to them
that dictate how things are configured. Hence, we have Server(s), Client(s) and
Router(s) instead of our lovable pets.

There is an industry-specific phrase that matches the theme here too. Within
infrastructure industry, the popular way to see components of the infrastracture
is as "cattle, not pets". This is a mean way of saying we only care about the
larger system and we care less about details of individual components. Those
components are there to serve a purpose and once they are unable to, we can
easily replace them with other components that can serve the same role.

Since we do care about the roles, let's dive a little deeper into them and
understand what we mean:

### Vocab reminders

#### Client

A client is any machine that initiates a connection/request to another machine
on the network or the larger internetwork. A common example is a browser or curl
request to a web resource. In future chapters, we might explore how clients are
protected by the network either via firewall or through other means but this
definition is sufficient for our current use case.

#### Server

A server is any machine whose purpose is to respond to a network request. If the
server fails to serve the request, it can return an appropriate error back to
the client.

#### Router

A router is any machine whose purpose is to connect networks together. It does so by forwarding packets to the next hop. Each router has a routing table which serves much like a sign post on a highway: it tells the router where to send packets next on their way to their final destination. Each router makes decisions on its own for the most efficient way to send the packet to its destination. The internet, as we know today, is not possible without numerous routers facilitating the requests.

### IP Masquerade

If you checked the docker-compose file that generates the machines and networks for our internetwork, you probably saw that each network definition included a `com.docker.network.bridge.enable_ip_masquerade: 'false'`. We discovered in trying to build out our initial internetwork that docker uses a default router to communicate between networks. This default router was intercepting packets that we were attempting to send between networks. This is intended behavior for docker! In most cases when you're using docker, you don't want to have to setup all the network configurations! But... in our case... we WANT to be able to configure our network at a minute level. Sooo... adding that `enable_ip_masquerade: false` line removes the default router on the network.

If you'd like to see the notes from our investigation, checkout [docker-routing-pitfalls.md](../appendix/docker-routing-pitfalls.md). Disclaimer: these notes are not the refined and beauteous things you are witnessing in the chapters. These are notes. But they do demonstrate our discovery process for identifying the problem.

### How to read an IP address; i.e. octets and subnets

This requires a long and detailed description to really understand. For the sake of keeping this document brief, we've moved the explanation for this to [prefixes-and-subnet-masks.md](../appendix/prefixes-and-subnet-masks.md) in the appendix. Please read that document and come back here when you feel confident you have a basic understanding of what it contains!

### How docker handles MAC addresses

A MAC (media access control) address is the layer 2 address of a machine on a network. If you'd like to review what a MAC address is in detail, checkout the [appendix on ip v. mac addresses](../appendix/ip-and-mac-addresses.md).

Let's look at the output for one of our interfaces shown in `ip route`:

```bash
38: eth0@if39: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Here, we can see that the IP of the machine is `10.1.2.3` on a `/24` network. The MAC address listed on the line above is `02:42:0a:01:02:03`. It appears to keep things simple, when docker adds a new machine to a network, it has create an interface for that machine and put it on that network. That interface will have its own unique MAC address. Docker can assign whatever it wants for that MAC address, but, to help us, the humans, it will take the IP address for that machine and convert it into a human readable version in hexidecimal. So, the end of that MAC address, `0a:01:02:03`, converted from hexidecimal into decimal is `10.1.2.3`. This is great for us. It means when we look at MAC addresses in our tcpdump later in the chapter, it is much easier to see which machines our packets are being routed through. 

**NOTE** When you see ethernet packets in the wild, there is no correlation between the MAC address and the IP address. This is simply a docker convenience.

## There and Back Again - a setup journey

In order for our little internet to work, we need a way for the machines on our networks to know how and where to route packets. Each router on the network will have a definition of all other networks on the internet and how it can reach machines on those networks. Think about it like this. When a driver is navigating our interstate highways to try to get from Portland to San Francisco, they're gonna see signs that direct them which lanes of traffic will take them in right direction. The driver follows those signs and ends up eventually in the right city. Our routers need those same little signs to follow. Each router will have a "routing table", which is like a list of all our little signs. These routing tables will have entries for how to send packets to each network on our internet.

We want to create routing tables for each of the routers on the network we have diagramed at the top of this chapter. Each router will need to have entries on how to get to networks that the router does not already have a direct connection to. And, we need these routing tables to be defined as soon as we boot up our network. So, let's define all of the routes that are necessary for `router1` and let's add them to the `sleep.sh` file that is run when we `restart` our whole system.

Based on that diagram, out of the 7 networks we've built, `router1` already has interfaces on 3 of them:

<!--**open question to ourselves** should we continue to refer to the docker-compose names for these networks if we're not using those names in the rest of the readme?-->

* `5.0.0.0/8` or `five-net`
* `200.1.1.8/29` or `p2p-eight`
* `3.0.0.0/8` or `three-net`

So, for `router1` to participate in this internet, it needs to know how to route packets to each of the 4 networks it's not currently connected to. We can add routes to each of the 4 networks in our `sleep.sh` file to use a similar structure to what we used in chapter 3. So, we'll start by defining how `router1` can reach each network through its connections with other routers. You'll see the following already defined in the `sleep.sh` file for this chapter:

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

The `sleep.sh` file already has some setup in it. Build out the routes for `router3` similar to how you see the routes for `router1` being done. Once you've got the routes created in `sleep.sh`, `restart` your little internet and `hopon router3`. Can you ping `router1` with `ping 5.0.1.1 -w 4`? What about if we try to ping `router1` with packets that originate from `router3` on `100.1.0.0/16`? Try using `ping -I 100.1.3.1 5.0.1.1 -w 4` to do this.

At this point, `router3` knows how to send packets into `5.0.0.0/8`, but `server` doesn't know how to respond. If we try to ping `server` before we add routes telling `server` how to reach `3.0.0.0/8`, `server` will just drop those packets. Let's see what that looks like practically.

```bash
root@router3:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1031ms
```

Here, we can see `router3` attempting to ping `server` at `5.0.0.100`. There are no response packets received and the ping times out after 2 seconds (the `-w 2`). Now let's see what's happening on our `server`, we can watch for those incoming pings with a `tcpdump`:

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

There are 2 `ICMP echo request`s, but we don't see any `ICMP echo reply`s. Set up the route for `server` to know how to send packets to `3.0.0.0/8` in `sleep.sh`. Once that's setup, `restart`, and can you get `router3` to ping `server`? If it's successful, you should see the `echo reply`s on the `tcpdump` in your `server`. Let's look at that `tcpdump` in a bit of detail.

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

The first 2 packets in our `tcpdump` are `ARP` packets, i.e. `Request who-has 5.0.0.100 tell 5.0.1.1` and `Reply 5.0.0.100 is-at 02:42:05:00:00:64`. This is a machine on our network attempting to associate a MAC address with an IP address that it has learned about from an incoming request. For more details on what's happening here, check out the [appendix doc on IP and MAC addresses](../appendix/ip-and-mac-addresses.md).

Next we see 2 couplets of `ICMP echo request` and `ICMP echo reply`s. In these packets, we can see that the IP address of the machine requesting the ping is `3.0.3.1`, or `router3`'s interface on `three-net`. The destination machine is `5.0.0.100`, or `server`'s interface on `five-net`. But! This also tells us the MAC addresses that are involved in the direct communication with `server`. So, when we see `02:42:05:00:01:01 > 02:42:05:00:00:64`, we can use what we know about how docker creates MAC addresses and see that `router1`'s interface on `five-net`, `02:42:05:00:01:01`, is the interface sending the packets to `server`, `02:42:05:00:00:64`.

Now that you have `router3` able to ping `server`, build out the rest of the internet! Check that things work using ping at every step of the way! We recommend building out one "hop" at a time, so from `router3`, build out `router2`'s connections. Check that `router2` can ping `server` and `router5`. Move to `router4`. Can it ping `server`, `router3`, `router5`, and `router2`? Can it ping each router on every interface that router has on any network? Check the `ping -h` help to see how you can originate your ping from a specific interface. Can you ping from a specific interface on a router to a specific interface on another router?

If you have problems creating your routing tables, the next exercise is going to cover troubleshooting!

## Troubleshoot your internet

### What's the problem here

**TODO**
Setup the problem - what is the exercise
Setup the goal

### Set up your environment

The first thing we'll need to do is get your network set up with a break we can investigate! Lucky for you, we've already created a setup that is broken and ready to use. If you check the `/init/sleep-exercise.sh` file, you'll see a whole set of routing tables created for each of the machines on our network. We want to use this broken setup instead of the working one you created in exercise 1.

If you remember from chapter 1, the way this file is loaded into our docker containers is through the container definition in our chapter's `Dockerfile`. We will want to update the line that says to use `./init/sleep.sh` to instead use `./init/sleep-exercise.sh`, so your `Dockerfile` will look like:

```Dockerfile
FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping net-tools bind9-utils dnsutils vim inetutils-traceroute mtr iptables netcat
COPY ./init/sleep-exercise.sh /sleep.sh

CMD ["/sleep.sh"]
```

### Discover the breakage

So, we've built out our internet! Let's make sure our client can `ping` our server:

```bash
root@client:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1046ms
```

Uh oh! We're not getting any response back from our `ping`! Something is wrong in internet land! Let's go figure out what that could be. When a client isn't receiving response packets from it ping, there's only 3 things that could be going on.

1. The request packets aren't being routed to the destination
2. The response packets aren't being routed back to the source/client
3. The machine the packets are being routed to doesn't exist

We can dismiss option 3 here. If the machine didn't exist, we would get an error in our `ping`, e.g:

```bash
root@client:/# ping 1.0.0.50
PING 1.0.0.50 (1.0.0.50) 56(84) bytes of data.
From 1.0.0.100 icmp_seq=1 Destination Host Unreachable
```

When we see `Destination Host Unreachable`, the packets were correctly routed to the network indicated by the IP address. However, when they got there, the router performed an ARP request for the machine in the `ping`, `1.0.0.50`, but it didn't receive a response. Because the router couldn't find the machine on its network, it responded to the `ping` with an error.

> ASIDE: This could be a potential security leak. It tells an attacker something about what machines exist on the network. In modern network achitechture, this error response will be turned off to prevent unintentionally revealing the network shape.

*TODO* In a future chapter, let's look at firewall settings to prevent this security leak.

So now we know that the issue is a networking issue. We need to find where in our network communication is breaking down, where packets are getting lost, and in what direction those packets are getting lost. We know that this is a networking issue, but what kind? Are we trying to route packets across or to a network that doesn't exist? If that were the case, we would see a similar error message to what we saw when trying to ping a non-existant host:

```bash
root@client:/# ping 9.0.0.1
PING 9.0.0.1 (9.0.0.1) 56(84) bytes of data.
From 1.0.5.1 icmp_seq=1 Destination Net Unreachable
```

Because we're just getting no response back, that means the packets are being lost somewhere in our internetwork. We need to go find them! Before we get started let's define an investigation process that we can use to help us identify where the problem is.

### The Investigation

We need some process to help us identify where the problem in out internetwork lives. What we've tried so far is to `ping` from Client to Server. That's causing us to traverse our whole internetwork, which is a lot of machine and a lot of points of potential failure. We can simplify this in a couple ways. First, let's start from the Client. Let's run a `ping` from Client to each of the routers on our internetwork. If we get a successful response back, we know that's not where the problem is.

Once we've figured out where the packets are getting lost, we can jump on that machine and start investigating what's actually happening with our packets.

Let's get started by pinging Router5's interface on the `1.0.0.0/8` network:

```bash
root@client:/# ping 1.0.5.1 -w 2
PING 1.0.5.1 (1.0.5.1) 56(84) bytes of data.
64 bytes from 1.0.5.1: icmp_seq=1 ttl=64 time=0.102 ms
64 bytes from 1.0.5.1: icmp_seq=2 ttl=64 time=0.140 ms

--- 1.0.5.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1010ms
rtt min/avg/max/mdev = 0.102/0.121/0.140/0.019 ms
```

Sweet! It looks like that connection is operating as expected. Now, let's ping Router5's interface on `100.1.0.0/16`:

```bash
root@client:/# ping 100.1.5.1 -w 2
PING 100.1.5.1 (100.1.5.1) 56(84) bytes of data.
64 bytes from 100.1.5.1: icmp_seq=1 ttl=64 time=0.151 ms
64 bytes from 100.1.5.1: icmp_seq=2 ttl=64 time=0.421 ms

--- 100.1.5.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1004ms
rtt min/avg/max/mdev = 0.151/0.286/0.421/0.135 ms
```

This one is a little tricky in what we're actually learning. When Client sends the ICMP packets to Router5, the packets are being received by Router5's `1.0.0.0/8` interface. However, rather than sending those packets to the `100.1.0.0/16` interface, Router5 sees that it is the destination machine and responds back to Client directly through the `1.0.0.0/8` interface. We can see this by capturing packets on each interface during our `ping`.

We need to start by finding the interface definitions for Router5 for each network:

```bash
root@router5:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
168: eth1@if169: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:01:00:05:01 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 1.0.5.1/8 brd 1.255.255.255 scope global eth1
       valid_lft forever preferred_lft forever
182: eth0@if183: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:64:01:05:01 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 100.1.5.1/16 brd 100.1.255.255 scope global eth0
       valid_lft forever preferred_lft forever
190: eth2@if191: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:c8:01:01:13 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 200.1.1.19/29 brd 200.1.1.23 scope global eth2
       valid_lft forever preferred_lft forever
```

From this, we see that Router5's `100.1.0.0/16` interface is `eth0` and its `1.0.0.0/8` interface is `eth1`. This configuration is not fixed. If you are running this locally, you may see these values differently. Check your own configuration.

Now that we know the interface Router5 is using on each network, we can use `tcpdump` to watch traffic on each interface. Open 2 different windows on Router5 and run your `tcpdump`s simultaneously:

Here's what we get in the window where we're listening on the `100.1.0.0/16` interface:

```bash
root@router5:/# tcpdump -ni eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
^C
0 packets captured
0 packets received by filter
0 packets dropped by kernel
```

There's nothing there! But, checking the window for the `1.0.0.0/8` interface, we see all the packets handled there:

```bash
root@router5:/# tcpdump -ni eth1
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:57:39.971463 IP 1.0.0.100 > 100.1.5.1: ICMP echo request, id 12, seq 1, length 64
18:57:39.971485 IP 100.1.5.1 > 1.0.0.100: ICMP echo reply, id 12, seq 1, length 64
18:57:41.015885 IP 1.0.0.100 > 100.1.5.1: ICMP echo request, id 12, seq 2, length 64
18:57:41.015917 IP 100.1.5.1 > 1.0.0.100: ICMP echo reply, id 12, seq 2, length 64
18:57:45.013855 ARP, Request who-has 1.0.0.100 tell 1.0.5.1, length 28
18:57:45.013910 ARP, Request who-has 1.0.5.1 tell 1.0.0.100, length 28
18:57:45.013929 ARP, Reply 1.0.5.1 is-at 02:42:01:00:05:01, length 28
18:57:45.013946 ARP, Reply 1.0.0.100 is-at 02:42:01:00:00:64, length 28
^C
8 packets captured
8 packets received by filter
0 packets dropped by kernel
```

While we didn't see any packets on `eth0`, we see both the ICMP request and reply packets on `eth1`, thus showing that Router5 is successfully handling the `ping`. This tells us that Router5 does have an interface correctly configured on `100.1.0.0/16`.

> ASIDE: At the end of this chapter, if you would like to come back and see what the `tcpdump` looks like if that interface isn't properly configured, try deleting the interface with `ip addr del 100.1.5.1/16 dev eth0`. If you delete the interface before the end of the chapter, you'll need to `restart` your containers because removing that interface will screw up our entire internet!

The next step is to see if we can `ping` each interface on each of the other routers on the way to the server on our internet. So, our next step is to `ping` Router3's interface on `100.1.0.0/16`.

```bash
root@client:/# ping 100.1.3.1 -w 2
PING 100.1.3.1 (100.1.3.1) 56(84) bytes of data.
64 bytes from 100.1.3.1: icmp_seq=1 ttl=63 time=0.441 ms
64 bytes from 100.1.3.1: icmp_seq=2 ttl=63 time=0.193 ms

--- 100.1.3.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1014ms
rtt min/avg/max/mdev = 0.193/0.317/0.441/0.124 ms
```

Continue on `ping`ing each interface on each router until you find where the problem is.

```bash
root@client:/# ping -w 2 5.0.1.1
PING 5.0.1.1 (5.0.1.1) 56(84) bytes of data.

--- 5.0.1.1 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1053ms
```

Awwwww,SNAP! Look at that! What we've got here is a failure to communicate! So now, Client isn't receiving a response to packets it sends to Router1 on `5.0.0.0/8`. This means that either the packets aren't getting to Router1 on `5.0.0.0/8` OR Router1's response packets aren't being routed correctly back to Client. In most circumstances, there would be two potential problems that could be causing this packet loss:

* Some router on the path between Client => Router1 has a wrong path to the  `5.0.0.0/8` network and cannot route packets there
* Some router on the path between Router1 => Client has a wrong path to the  `1.0.0.0/8` network and cannot route packets there

However, because we were approaching this methodically, we already tested the route back at every step by checking that our `ping` worked on each interface on each router on the expected path from Client => Router1. So now, we need to find where the breakdown on the way to `5.0.0.0/8` is happening. Now that we know where the communication is failing, we can work back towards our Client trying to `ping` `5.0.0.0/8`.

Let's start with Router3. We'll ping Router1 on `5.0.0.0/8` from BOTH interfaces on Router3:

```bash
root@router3:/# ping 5.0.1.1 -w 2 -I 3.0.3.1
PING 5.0.1.1 (5.0.1.1) from 3.0.3.1 : 56(84) bytes of data.
64 bytes from 5.0.1.1: icmp_seq=1 ttl=64 time=0.073 ms
64 bytes from 5.0.1.1: icmp_seq=2 ttl=64 time=0.092 ms

--- 5.0.1.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1048ms
rtt min/avg/max/mdev = 0.073/0.082/0.092/0.009 ms
```

```bash
root@router3:/# ping 5.0.1.1 -w 2 -I 100.1.3.1
PING 5.0.1.1 (5.0.1.1) from 100.1.3.1 : 56(84) bytes of data.
64 bytes from 5.0.1.1: icmp_seq=1 ttl=64 time=0.219 ms
64 bytes from 5.0.1.1: icmp_seq=2 ttl=64 time=0.137 ms

--- 5.0.1.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1041ms
rtt min/avg/max/mdev = 0.137/0.178/0.219/0.041 ms
```

Successful! That's not the problem. Now we move out one hop to Router5:

```bash
root@router5:/# ping -w 2 5.0.1.1 -I 100.1.5.1
PING 5.0.1.1 (5.0.1.1) from 100.1.5.1 : 56(84) bytes of data.

--- 5.0.1.1 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1014ms
```

Oh no! There's the breakage! We're narrowing in on the problem! This means that Router5 has a bad route TO `5.0.0.0/8`. We know the problem is TO that network because we were able to have successful `ping`s on each interface hopping away from that network. So now we check the routing table for Router5 with `ip route`:

```bash
root@router5:/# ip route
1.0.0.0/8 dev eth1 proto kernel scope link src 1.0.5.1
3.0.0.0/8 via 100.1.3.1 dev eth0
5.0.0.0/8 via 200.1.1.18 dev eth2
100.1.0.0/16 dev eth0 proto kernel scope link src 100.1.5.1
200.1.1.0/29 via 200.1.1.18 dev eth2
200.1.1.8/29 via 100.1.2.1 dev eth0
200.1.1.16/29 dev eth2 proto kernel scope link src 200.1.1.19
```

Uh oh! The route to get to `5.0.0.0/8` is running through Router4 on `200.1.1.16/29`... That's not what we're expecting. We almost certainly have a routing loop there, which means that packets are being passed back and forth between the same machines without ever reaching their destination.

**EXERCISE** Now that you know where the problem is, go into `sleep-exercise.sh` for this chapter, fix the route, and `restart` your containers! Can you ping Server from Client now?

Notes:

Another tool that could be used is `tcpdump`. is a heavier tool. networks aren't quiet, so you have to filter. `ping` is simple and tells us exactly what we're looking at.




*TODO*

* review and clean up both readme and docker-routing-pitfalls
* Flesh out the Notes (starting line 461)
* investigate why router4 is dropping packets on the broken configuration...
* fix sleep-exercise.sh
