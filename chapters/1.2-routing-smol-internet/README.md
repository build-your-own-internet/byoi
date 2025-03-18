# Let's make an Internet(work)

## Goals for this section

In the previous chapter, we build a small network of 2 machines that could ping each other. Now, we want to build on that structure to add a second network. Once we have another network, we'll need to start building routes for machines on each network to be able to communicate with each other. This will create an internetwork, or internet. The collection of networks that communicate to and across each other on the World Wide Web is one example of an internet!

Here's what we expect our internet to look like by the end of this chapter:

[![smol-internet-network-map](../../img/network-maps/smol-internet-network-map.svg
 "A Smol Internet Network Map")](../../img/network-maps/smol-internet-network-map.svg)

You'll notice in this network diagram that we've built on the smol network from Chapter 1.1. Here, we've added a new network, `10.1.2.0/24`, and we've added a new machine, `router`. A [router](../glossary.md#router-aka-gateway) is a machine that has an [interface](../glossary.md#interface) on multiple networks and can forward packets across those networks. In this case, our router has an interface on both `10.1.1.0/24` and `10.1.2.0/24`.

Now that we've got a bit of an internet drawn out in our network diagram above, let's take a moment to really understand how to read what we're seeing there. Think of this diagram like a street map. Each line is a path we can take to get from one location to another. So, if we wanted to travel from `client` to `server`, we'd leave `client` on the `10.1.1.0/24` network until we got to `router`. `router` is a bridge between `10.1.1.0/24` and `10.1.2.0/24`, so we'd pass through `router` to get to `10.1.2.0/24`. Once there, we could find `server` and go visit that machine. We've added the IP addresses for the machines and networks to make it easier to reference and understand which machine is talking to which other machine on which network.

For the setup of this chapter, we've already added all of the machines and all of the networks we need to work with to the [docker-compose.yml file for this chapter](docker-compose.yml). Take a look at that file and find where we define `router`, `server`, `client`, and each network.

## Aside: Efficiencies

### Scripts

Before we get started, let's look at a couple scripts we added. On the root level of this repo, there's a `bin` folder. We've started adding simple scripts there to make our lives easier. Here's the scripts we've added thus far:

* `hopon`: in order to jump on a container, we had to type a long-ish command `docker exec -it 002-smol-internet-router-1 /bin/bash`. This allows us to simply type `hopon router`, which we will be using for the rest of our exploration.
* `byoi-rebuild`: in experimenting with various setups in both our `Dockerfile` and `docker-compose.yml`, we needed to cleanup the images our containers were built from regularly. Now, we can simply type `byoi-rebuild` instead of finding and removing each container.

The `byoi-rebuild` script performs a check that you have the Docker management software `colima` installed and running. If you are using `docker desktop` or another Docker management software, this check will always fail for you. To make this command work, comment out line 5, `bash meets-colima-requirements` in the [byoi-rebuild script](../../bin/byoi-rebuild). Just make sure you have your Docker management software up and running whenever you're following along in these chapters!

Because the scripts are dependent on a version of `docker-compose.yml` that exists in each chapter subfolder, whenever you run the scripts, make sure you are in a `chapters` subdirectory. Each chapter going forward will contain everything you need to make the scripts work.

Finally, in order to make it easy to call our scripts, we need to add the scripts to our `PATH` from the root of this directory:

```bash
# Make sure to run this command in the root of this repository, or it won't work!
export PATH="$PATH:`pwd`/bin"
```

Running an `export` in a new window means that the variable exported only lives for the life of that session. So, if you close that window or you open a new window, that variable doesn't exist. That's a bit of a pain, so, alternatively, if you don't want to have to add the path in every window you open, you can update your PATH in your terminal profile:

```bash
export PATH=$PATH:/path/to/repo/build-your-own-internet/bin
```

### The /final folder

You'll notice that this chapter also contains a new `/final` folder. This folder contains [the start-up.sh script](./final/start-up.sh), which looks how we expect it to look by the end of the chapter.

Now, onward! To the building of the internet!

## Make those networks communicate with each other

How do machines communicate across networks? Well, first they need to have a router. Sure, docker has its own built in router, but we want to build our own.  What is a router, but another machine on the network. A router has 2 special properties that make it a router instead of just a regular machine on the network:

* an interface on more than one network
* the ability to forward packets that are not destined for itself to other machines

### Check our `router` configuration

Let's start by re-building our containers and see how `router` is currently configured:

```bash
byoi-rebuild
hopon router
```

Now, let's check what interfaces exist on `router`:

```bash
root@router:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
943: eth0@if944: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
945: eth1@if946: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:01:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.1.3/24 brd 10.1.1.255 scope global eth1
       valid_lft forever preferred_lft forever
```

Look at that! There are 2 eth interfaces! `eth1` at `10.1.1.3/24` and `eth0` at `10.1.2.3/24`. Now let's check our routing table:

```bash
root@router:/# ip route
10.1.1.0/24 dev eth1 proto kernel scope link src 10.1.1.3
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.3
```

### Can `router` `ping` `server`?

BOOM! `router` has routes for both the `10.1.1.0/24` and `10.1.2.0/24` networks! Remember: `server` still only knows about `10.1.2.0/24`. So at this point, `router` knows how to reach machines on the `10.1.2.0/24` network, but `server` still doesn't know anything about the `10.1.1.0/24` network... Let's see what happens when `router` tries to `ping` `server`:

```bash
root@router:/# ping 10.1.2.2 -c 2
PING 10.1.2.2 (10.1.2.2) 56(84) bytes of data.
64 bytes from 10.1.2.2: icmp_seq=1 ttl=64 time=0.164 ms
64 bytes from 10.1.2.2: icmp_seq=2 ttl=64 time=0.193 ms

--- 10.1.2.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1028ms
rtt min/avg/max/mdev = 0.164/0.178/0.193/0.014 ms
```

Sweet! That worked! But how? Let's open a second terminal window and check what's happening on `server` using `tcpdump`. Run the following commands:

Terminal window for `server`: `tcpdump -n`
Terminal window for `router`: `ping 10.1.2.2 -c 2`

And what we see in that `tcpdump` output is:

```bash
root@server:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:50:57.464168 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 106, seq 1, length 64
18:50:57.464253 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 106, seq 1, length 64
18:50:58.485694 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 106, seq 2, length 64
18:50:58.485730 IP 10.1.2.2 > 10.1.2.3: ICMP echo reply, id 106, seq 2, length 64
18:53:54.166970 ARP, Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:53:54.167080 ARP, Request who-has 10.1.2.2 tell 10.1.2.3, length 28
18:53:54.167123 ARP, Reply 10.1.2.2 is-at 02:42:0a:01:02:02, length 28
18:53:54.167168 ARP, Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
^C
4 packets captured
4 packets received by filter
0 packets dropped by kernel
```

We can see why `server` is able to respond to `router` from the first line of the (non-default) output:

```bash
18:50:57.464168 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 106, seq 1, length 64
```

Here we see the incoming `ping` or `ICMP echo request`. The source machine is `10.1.2.3`, which is `router`'s IP address on `10.1.2.0/24`! This means that the request is coming from an IP address on a network that `server` has an interface on! `server` can respond! The next line is `server`, `10.1.2.2` responding back to `router`, `10.1.2.3`, with an `ICMP echo reply`.

> **What's with those ARP requests?**

You may or may not see in your own session some odd looking packets identified as `ARP` in the tcpdump:

```bash
18:53:54.166970 ARP, Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:53:54.167080 ARP, Request who-has 10.1.2.2 tell 10.1.2.3, length 28
18:53:54.167123 ARP, Reply 10.1.2.2 is-at 02:42:0a:01:02:02, length 28
18:53:54.167168 ARP, Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
```

We go over this in more detail in [ip-and-mac-addresses.md in the appendix](../../appendix/ip-and-mac-addresses.md), but let's look at a high level at what's going on here. IP addresses, like `10.1.2.3`, are used by machines for identifying where packets should be routed across an internet. So what we've been working with so far is designed to help machines communicate when there are multiple networks. HOWEVER. Within a network, machines are not identified by an IP address, but instead by a MAC address. In order for packets to be sent from one machine on a network to another machine on the same network, each machine needs to discover the MAC address that corresponds to the IP address identified in the packets. ARP, or Address Resolution Protocol, is the process by which this is done.

Let's read what's happening with the `ARP` requests we see above:

```bash
18:53:54.166970 ARP, Request who-has 10.1.2.3 tell 10.1.2.2, length 28
```

A request is sent out asking the network which machine should respond to the IP address `10.1.2.3`. The request is also asking that the response to this query be sent to `10.1.2.2`.

```bash
18:53:54.167080 ARP, Request who-has 10.1.2.2 tell 10.1.2.3, length 28
```

How is the machine that responds to `10.1.2.3` supposed to know who to tell their MAC address to if they don't have the MAC address of the machine that's requesting? This is a request being sent out to discover the MAC address for `10.1.2.2`.

```bash
18:53:54.167123 ARP, Reply 10.1.2.2 is-at 02:42:0a:01:02:02, length 28
```

Here's the MAC address for `10.1.2.2`, so now the machine on `10.1.2.3` knows who to respond to, which it does in the next `Reply`:

```bash
18:53:54.167168 ARP, Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
```

Now back to our regularly scheduled exploration!

### Can `server` ping `router` on the `10.1.1.0/24` network?

We've already seen that `server` can respond to `router`'s `ping`s that were issued from `router`'s interface on `10.1.2.0/24`. We can double check that `server` can initiate the `ping`, just for fun:

```bash
root@server:/# ping 10.1.2.3 -c 2
PING 10.1.2.3 (10.1.2.3) 56(84) bytes of data.
64 bytes from 10.1.2.3: icmp_seq=1 ttl=64 time=0.245 ms
64 bytes from 10.1.2.3: icmp_seq=2 ttl=64 time=0.242 ms

--- 10.1.2.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1041ms
rtt min/avg/max/mdev = 0.242/0.243/0.245/0.001 ms
```

Now... let's see if `server` is able to ping `router`'s interface on the `10.1.1.0/24` network...

```bash
root@server:/# ping 10.1.1.3
ping: connect: Network is unreachable
```

Lovely! This is because, while `router` has an interface on the `10.1.2.0/24` network and `server` and `router` can directly communicate on that network, `server` doesn't know anything about the `10.1.1.0/24` network; not even that `router` knows about it. We need to define a route for `server` that tells it how to get to the `10.1.1.0/24` network!

### Make `server` ping hosts on the `10.1.1.0/24` network

The first thing we need to do is add a route from `server` to the `10.1.1.0/24` network via `router`. Because `router` has routes to both `10.1.2.0/24` and `10.1.1.0/24`, `router` can act as the router between the two. We can manage routes on our machines using the `ip route` command:

```bash
root@server:/# ip route add 10.1.1.0/24 via 10.1.2.3
```

This command identifies the network, `10.1.1.0/24` (a.k.a. "10.1.1.0/24") and then says: "Any time you have a packet for this network, you should send it to `10.1.2.3` (a.k.a. `router`), cuz that dude knows all about it."

Now, if we check the routes that `server` knows about, we'll see the route defined in `server`'s routing table:

```bash
root@server:/# ip route
10.1.1.0/24 via 10.1.2.3 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

Now, let's try that `ping` again!

```bash
root@server:/# ping 10.1.2.3 -c 2
PING 10.1.2.3 (10.1.2.3) 56(84) bytes of data.
64 bytes from 10.1.2.3: icmp_seq=1 ttl=64 time=0.340 ms
64 bytes from 10.1.2.3: icmp_seq=2 ttl=64 time=0.266 ms

--- 10.1.2.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1028ms
rtt min/avg/max/mdev = 0.266/0.303/0.340/0.037 ms
```

Sweet! It looks like that's working! But, what does this request look like on `router`? `server` is sending the `ping` packets out its `10.1.2.0/24` interface and passing them off to `router`. `router` is receiving the packets on its `10.1.2.0/24` interface, but the destination is for `router`'s IP address on `10.1.1.0/24`.

Let's use `tcpdump` to investigate how `router` processes these packets. To do that, we'll need a couple more terminal windows open, one to run the `ping` from `server` and one for each interface on `router`.

Window 1: `server` will run `ping 10.1.1.3 -c 2`  
Window 2: `router` will run `tcpdump -ni eth0`  
Window 3: `router` will run `tcpdump -ni eth1`

`tcpdump` can only listen on one interface at a time. We discovered in Chapter 001 that the `-i` flag on the `tcpdump` command allows us to specify which interface we'd like `tcpdump` to be listening on. Because we want to know the output of BOTH interfaces, we're going to run a `tcpdump` listening on each interface in separate terminal windows.

> OUTPUT: Window 1 - `server`

```bash
root@server:/# ping 10.1.1.3 -c 2
PING 10.1.1.3 (10.1.1.3) 56(84) bytes of data.
64 bytes from 10.1.1.3: icmp_seq=1 ttl=64 time=0.354 ms
64 bytes from 10.1.1.3: icmp_seq=2 ttl=64 time=0.264 ms

--- 10.1.1.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1070ms
rtt min/avg/max/mdev = 0.264/0.309/0.354/0.045 ms
```

Exactly what we expected.

> OUTPUT: Window 2 - `router` running `tcpdump -ni eth0` <= `10.1.2.0/24` interface

```bash
18:55:02.338352 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 1, length 64
18:55:02.338420 IP 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 1, length 64
18:55:03.378631 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 2, length 64
18:55:03.378649 IP 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 2, length 64
```

`router` receiving the `ping` `ICMP echo request` and responding with and `ICMP echo reply`.

> OUTPUT: Window 3 - `router` running `tcpdump -ni eth1` <= `10.1.1.0/24` interface

NOTHING shows up here! Why? When the packets reach `router`, `router` recognizes that they have reached their destination. There's no need to send the packet through the `10.1.1.0/24` interface just to stay on the same machine. The work is done!

===

Now, what happens when we send those packets on to `client`? Add a new terminal window and `hopon client` and run `tcpdump -n`. Then, from `server`, ping `client`.

```bash
root@server:/# ping 10.1.1.2 -c 2 -w 2
PING 10.1.1.2 (10.1.1.2) 56(84) bytes of data.

--- 10.1.1.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1028ms
```

Notice that we see 100% packet loss. But, when we check `client`'s `tcpdump`, we can see that the request got to `client`:

```bash
19:01:36.666989 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
19:01:36.667005 ARP, Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
19:01:36.667023 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 37, seq 1, length 64
19:01:37.729917 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 37, seq 2, length 64
```

What happened here?

* `server` has a route into the `10.1.1.0/24` network via `router`
* `router` receives the requests and:
  * checks the destination IP
  * sees that the request is not for itself
  * checks whether or not to forward the packet
  * finds out that it should route the packets - Check the end of this chapter for [how does a machine know if it should forward packets](#how-does-a-machine-know-if-it-should-forward-packets)
  * and does an ARP request which finds `client`

`router` knows where the packets go and sends them on to `client`.  That's the first half of the process! `client` has ping packets!

But then what? `client` needs to reply to the ping, `client` knows the response needs to go to `10.1.2.2`, but `client` doesn't know where `10.1.2.2` is, just like `server` didn't know before we added the route to `10.1.1.0/24`. `client` has no entries to tell it where to send its response packets, so it just drops them on the floor.

### Tell `client` how to respond to `server`

We've already seen this in action. At this point, we need to tell `client` how to find the `10.1.2.0/24` network. We did this earlier in teaching `server` how to find the `10.1.1.0/24` network. We're going to leave this as an exercise for the reader to attempt on their own. If you need some guidance, review the [Make `server` ping hosts on the 10.1.1.0/24 network](#make-server-ping-hosts-on-the-10.1.1.0/24-network) section.

## Now let's make this routing setup automatic

We don't want to spend the time manually adding and removing routes every time we start our containers. Luckily, we can edit the [start-up.sh](./init/start-up.sh) script to conditionally add routes depending on the `hostname`, i.e. `server` or `client`. Add the following to your start-up script and `byoi-rebuild` your containers. You should be able to ping each machine on each network.

```bash
case $HOSTNAME in
  (client) ip route add 10.1.2.0/24 via 10.1.1.3;;
  (server) ip route add 10.1.1.0/24 via 10.1.2.3;;
esac
```

## Appendix: Answering Questions

### What's the difference between `ip addr` and `ip route`?

There's some similar output between the `ip addr` and `ip route` commands. `ip addr` gives us view into the network interfaces available on a machine.  `ip route` shows us the routing table on that machine.

But it looks like there's routing information in our `ip addr` output? What is the difference between a network interface and a routing table?

Looking at the output of `ip route`, we see a default gateway identified, `default via 10.1.2.1 dev eth0`. This default gateway is what will be used for any outgoing packets that are not on the otherwise defined routes. `ip route` shows routes on active interfaces. `ip addr` displays all available interfaces on a machine, even ones that are not currently active.

`ip route` deals entirely with layer 3 information; whereas `ip addr` has information about both layer 2 and layer 3.

### How does a machine know if it should forward packets?

This is a linux kernel setting within the machine. You can see it like so:

```bash
root@router:/# cat /proc/sys/net/ipv4/ip_forward
1
```

It looks like docker, by default, sets the value on every container to `1`, which means, "yeah, forward those packets!" Let's change that value to 0 and see what happens! There's a lot of permission shenanigans happening with docker...  So, in order to turn off packet forwarding on `router`, we need to change our docker-compose.yml file. docker-compose exposes `sysctls` which allows us to change default kernel settings. We have explicitly added that setting to `router` and it should currently be set to `1`. Change it to `0` to disable ip forwarding.

```yml
  router:
    build: .
    container_name: build-your-own-internet-001-router
    hostname: router
    networks:
      ten-one-net:
        ipv4_address: 10.1.1.3
      ten-two-net:
        ipv4_address: 10.1.2.3
    cap_add:
      - NET_ADMIN
    sysctls:
      - net.ipv4.ip_forward=0
```

For the sake of ensuring the rest of this chapter works as expected, we will not disable ip forwarding. HOWEVER, going forward, we are going to disable ip forwarding for any machine we do not explicitly want to be a router.

### What is happening with that `0 packets dropped by kernel` from `tcpdump` when packets were dropped?

```bash
^C
4 packets captured
4 packets received by filter
0 packets dropped by kernel
```

Each of the machines say `0 packets dropped by kernel`. Ummm… if the packets didn’t make it back to `server` and the packets weren’t dropped… where did they go? Well, `client` still dropped the packets. The `0 packets dropped by kernel` count isn't the number of packets dropped in total; it's the number of packets dropped *by tcpdump*. Specifically, `tcpdump` would drop those packets [because of buffer overflow](https://unix.stackexchange.com/questions/144794/why-would-the-kernel-drop-packets).
