# Discovery: rp_filter

These are rough notes of a problem we investigated on our internetwork in chapter 4. We were attempting to break out internetwork and we did... but not in the way we expected. We changed a route on router4, and the packets were just disappearing... After much investigation and consulting with the inimitable MABrown, we discovered another Linux setting, `rp_filter`, that was behaving in a way that would likely be preferable in the contained Docker environment, but, it wasn't the best for our scenario.

## Begin Notes

let's start from the Client. Let's run a `ping` from Client to each of the routers on our internetwork. If we get a successful response back, we know that's not where the problem is.

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

> **EXERCISE:**
> Now that you know where the problem is, go into `sleep-exercise.sh` for this chapter, fix the route, and `restart` your containers! Can you ping Server from Client now?

Notes:

Another tool that could be used is `tcpdump`. is a heavier tool. networks aren't quiet, so you have to filter. `ping` is simple and tells us exactly what we're looking at.
