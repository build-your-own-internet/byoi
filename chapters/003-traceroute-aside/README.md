# Let's make an Internet!

## Goals for this section:

### Vocab

* `hop`: 

### Adding route to pippin on Tara

`ip route add 10.1.1.0/24 via 10.1.2.3`

### What tools besides `ping` can help us diagnose network problems?

#### traceroute

`traceroute` is a network diagnostic tool that gives a simple output to show the sequence of machines that were involved in routing a packet to its destination. The machines, as you might expect, are identified by their IP addresses. 

#### mtr

We're going to focus on using `traceroute` for now. However, `mtr` is another `traceroute` style tool with a bunch more options and utility. Once you have an understanding of how `traceroutre` works, we recommend going back through this chapter using `mtr` instead and deciphering its output.

### Ran Traceroute on Tara with TCPDUMP on all interfaces boudi supports

```
tara@root:/# traceroute 10.1.1.2
traceroute to 10.1.1.2 (10.1.1.2), 64 hops max
  1   10.1.2.3  0.004ms  0.003ms  0.002ms
  2   *  *  *
  3   *  *  *
```

Hmmmm... What's with those weird `*`s? At this point, `tara` knows how to send packets to `pippin` via `boudi`. But! `pippin` doesn't yet know how to send packets back to `tara`! So the only hop that can communicate back to `tara` that it received packets is `boudi`. We need to have a route from `pippin` to `tara` to see the rest of that network. 

So we are blackholing packets. The `*` in the output is representative of that. This is because tara knows how to send packets to pippin but pippin does not yet know how to send packets to tara.

### Explanation of tcpdump output

```
tara@root:/# tcpdump -nvi eth0
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:42:45.380503 IP (tos 0x0, ttl 1, id 16407, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33434: UDP, length 9
18:42:45.380518 IP (tos 0xc0, ttl 64, id 12252, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 16407, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33434: UDP, length 9
18:42:45.380595 IP (tos 0x0, ttl 1, id 16408, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33434: UDP, length 9
18:42:45.380601 IP (tos 0xc0, ttl 64, id 12253, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 16408, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33434: UDP, length 9
18:42:45.380620 IP (tos 0x0, ttl 1, id 16409, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33434: UDP, length 9
18:42:45.380625 IP (tos 0xc0, ttl 64, id 12254, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 16409, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33434: UDP, length 9
18:42:45.380719 IP (tos 0x0, ttl 2, id 16410, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33435: UDP, length 9
18:42:48.384705 IP (tos 0x0, ttl 2, id 16498, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33435: UDP, length 9
18:42:51.388115 IP (tos 0x0, ttl 2, id 16618, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33435: UDP, length 9
18:42:54.391637 IP (tos 0x0, ttl 3, id 16761, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33436: UDP, length 9
18:42:57.395439 IP (tos 0x0, ttl 3, id 16911, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33436: UDP, length 9
18:43:00.399034 IP (tos 0x0, ttl 3, id 17166, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33436: UDP, length 9
18:43:03.402669 IP (tos 0x0, ttl 4, id 17415, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33437: UDP, length 9
18:43:06.407196 IP (tos 0x0, ttl 4, id 17710, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33437: UDP, length 9
18:43:09.411658 IP (tos 0x0, ttl 4, id 17717, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33437: UDP, length 9
```

```
root@boudi:/# tcpdump -nvi eth1
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:42:40.829824 IP6 (hlim 255, next-header ICMPv6 (58) payload length: 16) fe80::28cd:62ff:fe0e:98d5 > ff02::2: [icmp6 sum ok] ICMP6, router solicitation, length 16
	  source link-address option (1), length 8 (1): 2a:cd:62:0e:98:d5
18:42:45.380726 IP (tos 0x0, ttl 1, id 16410, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33435: UDP, length 9
18:42:48.384717 IP (tos 0x0, ttl 1, id 16498, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33435: UDP, length 9
18:42:50.428578 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.1.2 tell 10.1.1.3, length 28
18:42:50.428672 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
18:42:51.388127 IP (tos 0x0, ttl 1, id 16618, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33435: UDP, length 9
18:42:54.391651 IP (tos 0x0, ttl 2, id 16761, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33436: UDP, length 9
18:42:57.395449 IP (tos 0x0, ttl 2, id 16911, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33436: UDP, length 9
18:43:00.399044 IP (tos 0x0, ttl 2, id 17166, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33436: UDP, length 9
18:43:03.402680 IP (tos 0x0, ttl 3, id 17415, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33437: UDP, length 9
18:43:06.407206 IP (tos 0x0, ttl 3, id 17710, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33437: UDP, length 9
18:43:09.411669 IP (tos 0x0, ttl 3, id 17717, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33437: UDP, length 9
18:43:12.415188 IP (tos 0x0, ttl 4, id 17889, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33438: UDP, length 9
18:43:15.418616 IP (tos 0x0, ttl 4, id 18013, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33438: UDP, length 9
18:43:18.422135 IP (tos 0x0, ttl 4, id 18221, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33438: UDP, length 9
```

### Tell pippin how to send packets to tara via boudi

You know how to do this


### Run traceroute again

```
traceroute 10.1.1.2
traceroute to 10.1.1.2 (10.1.1.2), 64 hops max
  1   10.1.2.3  0.004ms  0.002ms  0.003ms
  2   10.1.1.2  0.004ms  0.004ms  0.004ms
```

YESSSSSS! This illustrates that the route tara is sending packets to pipin (`10.1.1.2`) is via boudi (`10.1.2.3`).

```
root@boudi:/# tcpdump -nvi eth0
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:51:48.693720 IP (tos 0x0, ttl 1, id 43407, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33434: UDP, length 9
18:51:48.693740 IP (tos 0xc0, ttl 64, id 44098, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 43407, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33434: UDP, length 9
18:51:48.693789 IP (tos 0x0, ttl 1, id 43408, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33434: UDP, length 9
18:51:48.693796 IP (tos 0xc0, ttl 64, id 44099, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 43408, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33434: UDP, length 9
18:51:48.693834 IP (tos 0x0, ttl 1, id 43409, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33434: UDP, length 9
18:51:48.693842 IP (tos 0xc0, ttl 64, id 44100, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 43409, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33434: UDP, length 9
18:51:48.693967 IP (tos 0x0, ttl 2, id 43410, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694021 IP (tos 0xc0, ttl 63, id 11222, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 43410, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694146 IP (tos 0x0, ttl 2, id 43411, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694190 IP (tos 0xc0, ttl 63, id 11223, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 43411, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694290 IP (tos 0x0, ttl 2, id 43412, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694319 IP (tos 0xc0, ttl 63, id 11224, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 43412, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
```

```
root@boudi:/# tcpdump -nvi eth1
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:51:48.693978 IP (tos 0x0, ttl 1, id 43410, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694017 IP (tos 0xc0, ttl 64, id 11222, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 43410, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694152 IP (tos 0x0, ttl 1, id 43411, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694186 IP (tos 0xc0, ttl 64, id 11223, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 43411, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694294 IP (tos 0x0, ttl 1, id 43412, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694315 IP (tos 0xc0, ttl 64, id 11224, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 43412, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
```

```
root@pippin:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:51:48.693989 IP 10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694010 IP 10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
18:51:48.694162 IP 10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694178 IP 10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
18:51:48.694299 IP 10.1.2.2.46076 > 10.1.1.2.33435: UDP, length 9
18:51:48.694308 IP 10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
```

TODO:
* [DONE] Add traceroute to Dockerfile
* [DONE] See if traceroute gives a better illustration of how packetes are being routed, especially between pippin & tara
* document the output from traceroute
* edit docker-compose to add routes between pippin and tara
* rearrange chapter 003 to show it working correctly first. Then remove the route and show it broken.
* think about what chapter 004 will be (may not want the routes between pippin and tara)
    - large internetwork using static routes? use this as a jumping off point to see the necessity of dynamic routing.
    - route summarization?
