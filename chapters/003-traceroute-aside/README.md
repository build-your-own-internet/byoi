# Let's make an Internet!

## Goals for this section:

### Adding route to pippin on Tara

`ip route add 10.1.1.0/24 via 10.1.2.3`

### Ran Traceroute on Tara with TCPDUMP on all interfaces boudi supports

```
traceroute 10.1.1.2
traceroute to 10.1.1.2 (10.1.1.2), 64 hops max
  1   10.1.2.3  0.004ms  0.003ms  0.002ms
  2   *  *  *
  3   *  *  *
```

So we are blackholing packets. The `*` in the output is representative of that. This is because tara knows how to send packets to pippin but pippin does not yet know how to send packets to tara.

### Explanation of tcpdump output

```
tcpdump -nvi eth0
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
18:42:50.428588 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.2 tell 10.1.2.3, length 28
18:42:50.428666 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:42:50.428668 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:42:50.428675 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.2 is-at 02:42:0a:01:02:02, length 28
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
18:43:11.468600 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:43:11.468619 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:43:12.415175 IP (tos 0x0, ttl 5, id 17889, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33438: UDP, length 9
18:43:15.418606 IP (tos 0x0, ttl 5, id 18013, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33438: UDP, length 9
18:43:18.422125 IP (tos 0x0, ttl 5, id 18221, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33438: UDP, length 9
18:43:21.425602 IP (tos 0x0, ttl 6, id 18268, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33439: UDP, length 9
18:43:24.429129 IP (tos 0x0, ttl 6, id 18382, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33439: UDP, length 9
18:43:27.434130 IP (tos 0x0, ttl 6, id 18620, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33439: UDP, length 9
18:43:30.438890 IP (tos 0x0, ttl 7, id 18652, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33440: UDP, length 9
18:43:32.508605 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:43:32.508614 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:43:33.442837 IP (tos 0x0, ttl 7, id 18932, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33440: UDP, length 9
18:43:36.447193 IP (tos 0x0, ttl 7, id 19138, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33440: UDP, length 9
18:43:39.450725 IP (tos 0x0, ttl 8, id 19268, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33441: UDP, length 9
18:43:42.454174 IP (tos 0x0, ttl 8, id 19525, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33441: UDP, length 9
18:43:45.458159 IP (tos 0x0, ttl 8, id 19542, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33441: UDP, length 9
18:43:48.462242 IP (tos 0x0, ttl 9, id 19645, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33442: UDP, length 9
18:43:51.465684 IP (tos 0x0, ttl 9, id 19760, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33442: UDP, length 9
18:43:53.468579 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:43:53.468586 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:43:54.469039 IP (tos 0x0, ttl 9, id 19999, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33442: UDP, length 9
18:43:57.472431 IP (tos 0x0, ttl 10, id 20291, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33443: UDP, length 9
18:44:00.475982 IP (tos 0x0, ttl 10, id 20408, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33443: UDP, length 9
18:44:03.479681 IP (tos 0x0, ttl 10, id 20462, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33443: UDP, length 9
18:44:06.483191 IP (tos 0x0, ttl 11, id 20485, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33444: UDP, length 9
18:44:09.486736 IP (tos 0x0, ttl 11, id 20750, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33444: UDP, length 9
18:44:12.490577 IP (tos 0x0, ttl 11, id 20966, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33444: UDP, length 9
18:44:14.509601 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:44:14.509612 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:44:15.494006 IP (tos 0x0, ttl 12, id 21129, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33445: UDP, length 9
18:44:18.497549 IP (tos 0x0, ttl 12, id 21300, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33445: UDP, length 9
18:44:21.501312 IP (tos 0x0, ttl 12, id 21333, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33445: UDP, length 9
18:44:24.505751 IP (tos 0x0, ttl 13, id 21512, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33446: UDP, length 9
18:44:27.509264 IP (tos 0x0, ttl 13, id 21700, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33446: UDP, length 9
18:44:30.514536 IP (tos 0x0, ttl 13, id 21792, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33446: UDP, length 9
18:44:33.519955 IP (tos 0x0, ttl 14, id 21800, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33447: UDP, length 9
18:44:35.548898 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:44:35.548905 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:44:36.523251 IP (tos 0x0, ttl 14, id 21941, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33447: UDP, length 9
18:44:39.526564 IP (tos 0x0, ttl 14, id 21978, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33447: UDP, length 9
18:44:42.530213 IP (tos 0x0, ttl 15, id 22223, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33448: UDP, length 9
18:44:45.533690 IP (tos 0x0, ttl 15, id 22503, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33448: UDP, length 9
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
18:43:21.425614 IP (tos 0x0, ttl 5, id 18268, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33439: UDP, length 9
18:43:24.429143 IP (tos 0x0, ttl 5, id 18382, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33439: UDP, length 9
18:43:27.434141 IP (tos 0x0, ttl 5, id 18620, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33439: UDP, length 9
18:43:29.469015 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.1.2 tell 10.1.1.3, length 28
18:43:29.469070 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
18:43:30.438902 IP (tos 0x0, ttl 6, id 18652, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33440: UDP, length 9
18:43:33.442847 IP (tos 0x0, ttl 6, id 18932, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33440: UDP, length 9
18:43:36.447204 IP (tos 0x0, ttl 6, id 19138, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33440: UDP, length 9
18:43:39.450738 IP (tos 0x0, ttl 7, id 19268, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33441: UDP, length 9
18:43:42.454184 IP (tos 0x0, ttl 7, id 19525, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33441: UDP, length 9
18:43:45.458169 IP (tos 0x0, ttl 7, id 19542, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33441: UDP, length 9
18:43:48.462255 IP (tos 0x0, ttl 8, id 19645, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33442: UDP, length 9
18:43:51.465695 IP (tos 0x0, ttl 8, id 19760, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33442: UDP, length 9
18:43:54.469053 IP (tos 0x0, ttl 8, id 19999, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33442: UDP, length 9
18:43:57.472453 IP (tos 0x0, ttl 9, id 20291, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33443: UDP, length 9
18:44:00.475992 IP (tos 0x0, ttl 9, id 20408, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33443: UDP, length 9
18:44:03.479692 IP (tos 0x0, ttl 9, id 20462, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33443: UDP, length 9
18:44:06.483202 IP (tos 0x0, ttl 10, id 20485, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33444: UDP, length 9
18:44:08.508890 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.1.2 tell 10.1.1.3, length 28
18:44:08.508927 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
18:44:09.486750 IP (tos 0x0, ttl 10, id 20750, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33444: UDP, length 9
18:44:12.490587 IP (tos 0x0, ttl 10, id 20966, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33444: UDP, length 9
18:44:15.494017 IP (tos 0x0, ttl 11, id 21129, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33445: UDP, length 9
18:44:18.497558 IP (tos 0x0, ttl 11, id 21300, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33445: UDP, length 9
18:44:21.501323 IP (tos 0x0, ttl 11, id 21333, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33445: UDP, length 9
18:44:24.505765 IP (tos 0x0, ttl 12, id 21512, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33446: UDP, length 9
18:44:27.509279 IP (tos 0x0, ttl 12, id 21700, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33446: UDP, length 9
18:44:30.514555 IP (tos 0x0, ttl 12, id 21792, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33446: UDP, length 9
18:44:33.519967 IP (tos 0x0, ttl 13, id 21800, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33447: UDP, length 9
18:44:36.523260 IP (tos 0x0, ttl 13, id 21941, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33447: UDP, length 9
18:44:39.526574 IP (tos 0x0, ttl 13, id 21978, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33447: UDP, length 9
18:44:42.530227 IP (tos 0x0, ttl 14, id 22223, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33448: UDP, length 9
18:44:45.533700 IP (tos 0x0, ttl 14, id 22503, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.38188 > 10.1.1.2.33448: UDP, length 9
18:44:47.548556 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.1.2 tell 10.1.1.3, length 28
18:44:47.548610 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
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
18:51:53.709525 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.2 tell 10.1.2.3, length 28
18:51:53.709574 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.2.3 tell 10.1.2.2, length 28
18:51:53.709576 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.3 is-at 02:42:0a:01:02:03, length 28
18:51:53.709583 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.2.2 is-at 02:42:0a:01:02:02, length 28
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
18:51:53.709518 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.1.2 tell 10.1.1.3, length 28
18:51:53.709550 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 10.1.1.3 tell 10.1.1.2, length 28
18:51:53.709556 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.1.3 is-at 02:42:0a:01:01:03, length 28
18:51:53.709582 ARP, Ethernet (len 6), IPv4 (len 4), Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
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
18:51:53.709507 ARP, Request who-has 10.1.1.3 tell 10.1.1.2, length 28
18:51:53.709566 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
18:51:53.709570 ARP, Reply 10.1.1.2 is-at 02:42:0a:01:01:02, length 28
18:51:53.709580 ARP, Reply 10.1.1.3 is-at 02:42:0a:01:01:03, length 28
```

TODO:
* Add traceroute to Dockerfile
* See if traceroute gives a better illustration of how packetes are being routed, especially between pippin & tara
