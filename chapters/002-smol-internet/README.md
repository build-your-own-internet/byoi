# Let's make an Internet

## Goals for this section

In the previous chapter, we build a small network of 2 machines that could ping each other. Now, we want to build on that structure to add a second network. Once we have another network, we'll need to start building routes for machines on each network to be able to communicate with each other.

Here's what we expect our internet to look like by the end of this chapter:

```markdown
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
              (caternet 10.1.1.0/24)
```

You'll notice in this network diagram that we've built on the smol network from Chapter 001. Here, we've added a new network, `doggonet`, and we've added a new machine, `tara`. By the end of this chapter, we want to modify `boudi` so that machine has an [interface](../glossary.md#interface) on both `caternet` and `doggonet`.

Now that we've got a bit of an internet drawn out in our network diagram above, let's take a moment to really understand how to read what we're seeing there. Think of this diagram like a street map. Each line is a path we can take to get from one location to another. So, if we wanted to travel from `pippin` to `tara`, we'd leave `pippin` on the `caternet` network until we got to `boudi`. `boudi` is a bridge between `caternet` and `doggonet`, so we'd pass through `boudi` to get to `doggonet`. Once there, we could find `tara` and go visit that machine. We've added the IP addresses for the machines and networks to make it easier to reference and understand which machine is talking to which other machine on which network.

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

```bash
# Make sure to run this command in the root of this repository, or it won't work!
export PATH="$PATH:`pwd`/bin"
```

Running an `export` in a new window means that the variable exported only lives for the life of that session. So, if you close that window or you open a new window, that variable doesn't exist. That's a bit of a pain, so, alternatively, if you don't want to have to add the path in every window you open, you can update your PATH in your terminal profile:

```bash
export PATH=$PATH:/path/to/repo/build-your-own-internet/bin
```

#### The /final folder

You'll notice that this chapter also contains a new `/final` folder. This folder contains a couple files that show what we expect their counterparts to look like by the end of this chapter:

* [final docker-compose.yml file](./final/docker-compose.yml) is the final form of [docker-compose.yml on the root](./docker-compose.yml) of this chapter
* [the start-up.sh script](./final/start-up.sh) is the final form of the [init start-up.sh script](./init/start-up.sh)

Now, onward! To the building of the internet!

## Create a second network

What we have created so far is a single network with a couple machines that can communicate with each other. If you check the [docker-compose.yml file](./docker-compose.yml) for this chapter, you'll see that it's almost exactly what we had setup from Chapter 001. Now, we want to create a second network, `doggonet`, that cannot directly talk to the previously created network, `caternet`.

To define our new `doggonet` network, add the following to the docker-compose.yml file for this chapter under `networks`.

```yml
  doggonet:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 10.1.2.0/24
```

What's a network without a machine right? Next, let's create a lone `tara` in that docker-compose.yml under `services` to reign over the `doggonet`:

```yml
  tara:
    build: .
    hostname: tara
    networks:
      doggonet:
        ipv4_address: 10.1.2.2
    cap_add:
      - NET_ADMIN
```

### Can our networks communicate with each other?

Now we have 2 separate networks. Fantastic! An internet is a group of machines on different networks that can all communicate with each other. We have the machines, we have the networks, but before we go about getting them to talk to each other, let's make sure they can't already communicate... To do this, we're gonna reuse the same tricks we did in Chapter 001. Let's try to `ping` `boudi` from `tara`.

First, hop onto `boudi`:

```bash
hopon boudi
```

Then, run a `ping` to `tara`'s IP address on the `doggonet` network:

```bash
root@tara:/# ping 10.1.2.2
ping: connect: Network is unreachable
```

Fantastic! This error message is telling us is that `boudi` doesn't know how to send packets to a machine on the `10.1.2.0/24` network. The way that machines communicate with each other across networks is by matching the destination IP address to a network address range in their [routing table](../glossary.md#routing-table). The routing table will have a list of network address ranges defined and will associate those address ranges with a "next hop", or another machine that it thinks will get the packets closer to their destination.

If we look at the routing table for `boudi`, we can see that there is no entry for the `10.1.2.0/24` network:

```bash
root@boudi:/# ip route
10.1.1.0/24 dev eth0 proto kernel scope link src 10.1.1.3
```

The only network `boudi` knows about on its routing table is its own `caternet`, `10.1.2.0/24`. `boudi` doesn't have a default gateway assigned, so it has no hope of reaching the IP address in the `ping` we just ran. Therefore... `ping` returns a `Network is unreachable`.

## Make those networks communicate with each other

How do machines communicate across networks? Well, first they need to have a router. Sure, docker has its own built in router, but we want to build our own.  What is a router, but another machine on the network. A router just has 2 special properties that make it a router instead of just a regular machine on the network:

* an interface on more than one network
* the ability to forward packets that are not destined for itself to other machines

### Make `boudi` ping `tara`

The containers we've been building and using on our networks are machines on our network! Instead of adding a new machine to be our router, let's just repurpose `boudi`. We will need to give `boudi` those special properties.

Let's go back to our `docker-compose.yml` and give `boudi` an additional network interface by adding an IP address definition for the `doggonet` network. `boudi` should now look like:

```yml
  boudi:
    build: .
    hostname: boudi
    networks:
      caternet:
        ipv4_address: 10.1.1.3
      doggonet:
        ipv4_address: 10.1.2.3
    cap_add:
      - NET_ADMIN
```

Exit out of `tara` if you're still in that container, and let's re-build our containers and see how those changes impacted `boudi`:

```bash
restart
hopon boudi
```

How, let's check what interfaces exist on `boudi`:

```bash
root@boudi:/# ip addr
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
root@boudi:/# ip route
10.1.1.0/24 dev eth1 proto kernel scope link src 10.1.1.3
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.3
```

### Can `boudi` `ping` `tara`?

BOOM! `boudi` has routes for both the `caternet` and `doggonet` networks! Remember: `tara` still only knows about `doggonet`. So at this point, `boudi` knows how to reach machines on the `doggonet` network, but `tara` still doesn't know anything about the `caternet` network... Let's see what happens when `boudi` tries to `ping` `tara`:

```bash
root@boudi:/# ping 10.1.2.2 -c 2
PING 10.1.2.2 (10.1.2.2) 56(84) bytes of data.
64 bytes from 10.1.2.2: icmp_seq=1 ttl=64 time=0.164 ms
64 bytes from 10.1.2.2: icmp_seq=2 ttl=64 time=0.193 ms

--- 10.1.2.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1028ms
rtt min/avg/max/mdev = 0.164/0.178/0.193/0.014 ms
```

Sweet! That worked! But how? Let's open a second terminal window and check what's happening on `tara` using `tcpdump`. Run the following commands:

Terminal window for `tara`: `tcpdump -n`
Terminal window for `boudi`: ping 10.1.2.2 -c 2

And what we see in that `tcpdump` output is:

```bash
root@tara:/# tcpdump -n
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

We can see why `tara` is able to respond to `boudi` from the first line of the (non-default) output:

```bash
18:50:57.464168 IP 10.1.2.3 > 10.1.2.2: ICMP echo request, id 106, seq 1, length 64
```

Here we see the incoming `ping` or `ICMP echo request`. The source machine is `10.1.2.3`, or, if you remember what we added to our [docker-compose.yml file](./docker-compose.yml), `boudi`'s IP address on `doggonet`! This means that the request is coming from an IP address on a network that `tara` has an interface on! `tara` can respond! The next line is `tara`, `10.1.2.2` responding back to `boudi`, `10.1.2.3`, with an `ICMP echo reply`.

> **What's with those ARP requests?**

You may or may not see in your own session some odd looking packets identified as `ARP` in the tcpdump:

```bash
18:53:54.166970 ARP, Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:53:54.167080 ARP, Request who-has 10.1.2.2 tell 10.1.2.3, length 28
18:53:54.167123 ARP, Reply 10.1.2.2 is-at 02:42:0a:01:02:02, length 28
18:53:54.167168 ARP, Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
```

We go over this in more detail in [ip-and-mac-addresses.md in the appendix](../appendix/ip-and-mac-addresses.md), but let's look at a high level at what's going on here. IP addresses, like `10.1.2.3`, are used by machines for identifying where packets should be routed across an internet. So what we've been working with so far is designed to help machines communicate when there are multiple networks. HOWEVER. Within a network, machines are not identified by an IP address, but instead by a MAC address. In order for packets to be sent from one machine on a network to another machine on the same network, each machine needs to discover the MAC address that corresponds to the IP address identified in the packets. ARP, or Address Resolution Protocol, is the process by which this is done.

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

### Can `tara` ping `boudi` on the `caternet` network?

We've already seen that `tara` can respond to `boudi`'s `ping`s that were issued from `boudi`'s interface on `doggonet`. We can double check that `tara` can initiate the `ping`, just for fun:

```bash
root@tara:/# ping 10.1.2.3 -c 2
PING 10.1.2.3 (10.1.2.3) 56(84) bytes of data.
64 bytes from 10.1.2.3: icmp_seq=1 ttl=64 time=0.245 ms
64 bytes from 10.1.2.3: icmp_seq=2 ttl=64 time=0.242 ms

--- 10.1.2.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1041ms
rtt min/avg/max/mdev = 0.242/0.243/0.245/0.001 ms
```

Now... let's see if `tara` is able to ping `boudi`'s interface on the `caternet` network...

```bash
root@tara:/# ping 10.1.1.3
ping: connect: Network is unreachable
```

Lovely! This is because, while `boudi` has an interface on the `doggonet` network and `tara` and `boudi` can directly communicate on that network, `tara` doesn't know anything about the `caternet` network; not even that `boudi` knows about it. We need to define a route for `tara` that tells it how to get to the `caternet` network!

### Make `tara` ping hosts on the `caternet` network

The first thing we need to do is add a route from `tara` to the `caternet` network via `boudi`. Because `boudi` has routes to both `doggonet` and `caternet`, `boudi` can act as the router between the two. We can manage routes on our machines using the `ip route` command:

```bash
root@tara:/# ip route add 10.1.1.0/24 via 10.1.2.3
```

This command identifies the network, `10.1.1.0/24` (a.k.a. "caternet") and then says: "Any time you have a packet for this network, you should send it to `10.1.2.3` (a.k.a. `boudi`), cuz that dude knows all about it."

Now, if we check the routes that `tara` knows about, we'll see the route defined in `tara`'s routing table:

```bash
root@tara:/# ip route
10.1.1.0/24 via 10.1.2.3 dev eth0
10.1.2.0/24 dev eth0 proto kernel scope link src 10.1.2.2
```

Now, let's try that `ping` again!

```bash
root@tara:/# ping 10.1.2.3 -c 2
PING 10.1.2.3 (10.1.2.3) 56(84) bytes of data.
64 bytes from 10.1.2.3: icmp_seq=1 ttl=64 time=0.340 ms
64 bytes from 10.1.2.3: icmp_seq=2 ttl=64 time=0.266 ms

--- 10.1.2.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1028ms
rtt min/avg/max/mdev = 0.266/0.303/0.340/0.037 ms
```

Sweet! It looks like that's working! But, what does this request look like on `boudi`? `tara` is sending the `ping` packets out its `doggonet` interface and passing them off to `boudi`. `boudi` is receiving the packets on its `doggonet` interface, but the destination is for `boudi`'s IP address on `caternet`.

Let's use `tcpdump` to investigate how `boudi` processes these packets. To do that, we'll need a couple more terminal windows open, one to run the `ping` from `tara` and one for each interface on `boudi`.

Window 1: `tara` will run `ping 10.1.1.3 -c 2`
Window 2: `boudi` will run `tcpdump -ni eth0`
Window 3: `boudi` will run `tcpdump -ni eth1`

`tcpdump` can only listen on one interface at a time. We discovered in Chapter 001 that the `-i` flag on the `tcpdump` command allows us to specify which interface we'd like `tcpdump` to be listening on. Because we want to know the output of BOTH interfaces, we're going to run a `tcpdump` listening on each interface in separate terminal windows.

> OUTPUT: Window 1 - `tara`

```bash
root@tara:/# ping 10.1.1.3 -c 2
PING 10.1.1.3 (10.1.1.3) 56(84) bytes of data.
64 bytes from 10.1.1.3: icmp_seq=1 ttl=64 time=0.354 ms
64 bytes from 10.1.1.3: icmp_seq=2 ttl=64 time=0.264 ms

--- 10.1.1.3 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1070ms
rtt min/avg/max/mdev = 0.264/0.309/0.354/0.045 ms
```

Exactly what we expected.

> OUTPUT: Window 2 - `boudi` running `tcpdump -ni eth0` <= `doggonet` interface

```bash
18:55:02.338352 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 1, length 64
18:55:02.338420 IP 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 1, length 64
18:55:03.378631 IP 10.1.2.2 > 10.1.1.3: ICMP echo request, id 35, seq 2, length 64
18:55:03.378649 IP 10.1.1.3 > 10.1.2.2: ICMP echo reply, id 35, seq 2, length 64
```

`boudi` receiving the `ping` `ICMP echo request` and responding with and `ICMP echo reply`.

> OUTPUT: Window 3 - `boudi` running `tcpdump -ni eth1` <= `caternet` interface

NOTHING shows up here! Why? When the packets reach `boudi`, `boudi` recognizes that they have reached their destination. There's no need to send the packet through the `caternet` interface just to stay on the same machine. The work is done!

===

Now, what happens when we send those packets on to `pippin`? Add a new terminal window and `hopon pippin` and run `tcpdump -n`. Then, from `tara`, ping `pippin`.

```bash
root@tara:/# ping 10.1.1.2 -c 2 -w 2
PING 10.1.1.2 (10.1.1.2) 56(84) bytes of data.

--- 10.1.1.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1028ms
```

Notice that we see 100% packet loss. But, when we check `pippin`'s `tcpdump`, we can see that the request got to `pippin`:

```bash
19:01:36.666989 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
19:01:36.667005 ARP, Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
19:01:36.667023 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 37, seq 1, length 64
19:01:37.729917 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 37, seq 2, length 64
```

What happened here?

* `tara` has a route into the `caternet` network via `boudi`
* `boudi` receives the requests and:
  * checks the destination IP
  * sees that the request is not for itself
  * checks whether or not to forward the packet
  * finds out that it should route the packets - Check the end of this chapter for [how does a machine know if it should forward packets](#how-does-a-machine-know-if-it-should-forward-packets)
  * and does an ARP request which finds `pippin`

`boudi` knows where the packets go and sends them on to `pippin`.  That's the first half of the process! `pippin` has ping packets!

But then what? `pippin` needs to reply to the ping, `pippin` knows the response needs to go to `10.1.2.2`, but `pippin` doesn't know where `10.1.2.2` is. Just like `tara` didn't know before we added the route to `10.1.1.0/24`. `pippin` has no entries to tell it where to send its response packets, so it just drops them on the floor.

### Tell `pippin` how to respond to `tara`

We've already seen this in action. At this point, we need to tell `pippin` how to find the `doggonet` network. We did this earlier in teaching `tara` how to find the `caternet` network. We're going to leave this as an exercise for the reader to attempt on their own. If you need some guidance, review the [Make `tara` ping hosts on the caternet network](#make-tara-ping-hosts-on-the-caternet-network) section.

## Now let's make this routing setup automatic

We don't want to spend the time manually adding and removing routes every time we start our containers. Luckily, we can edit the [start-up.sh](./init/start-up.sh) script to conditionally add routes depending on the `hostname`, i.e. `tara` or `pippin`. Add the following to your start-up script and `restart` your containers. You should be able to ping each machine on each network.

```bash
case $HOSTNAME in
  (pippin) ip route add 10.1.2.0/24 via 10.1.1.3;;
  (tara) ip route add 10.1.1.0/24 via 10.1.2.3;;
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
root@boudi:/# cat /proc/sys/net/ipv4/ip_forward
1
```

It looks like docker, by default, sets the value on every container to `1`, which means, "yeah, forward those packets!" Let's change that value to 0 and see what happens! There's a lot of permission shenanigans happening with docker...  So, in order to turn off packet forwarding on `boudi`, we need to change our docker-compose.yml file. docker-compose exposes `sysctls` which allows us to change default kernel settings. We have explicitly added that setting to `boudi` and it should currently be set to `1`. Change it to `0` to disable ip forwarding.

```yml
  boudi:
    build: .
    hostname: boudi
    networks:
      caternet:
        ipv4_address: 10.1.1.3
      doggonet:
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

Each of the machines say `0 packets dropped by kernel`. Ummm… if the packets didn’t make it back to `tara` and the packets weren’t dropped… where did they go? Well, `pippin` still dropped the packets. The `0 packets dropped by kernel` count isn't the number of packets dropped in total; it's the number of packets dropped *by tcpdump*. Specifically, `tcpdump` would drop those packets [because of buffer overflow](https://unix.stackexchange.com/questions/144794/why-would-the-kernel-drop-packets).
