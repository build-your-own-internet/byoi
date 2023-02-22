# Let's make an Internet!

## Goals for this section:

Explore how traceroute gives us network topology so we can see how the machines we're creating are communicating with each other.

## Vocab

* `hop`: 

### Examining traceroute

#### What is traceroute? 

`traceroute` is a network analysis tool that shows path a packet takes from the initiator of a request (i.e. a client) to the destination IP. This is done through sending single packets that have a preset `ttl` in the IP header. The `ttl` in IP context does not refer to a specific _time_ to live, instead, it is the maximum number of hops a packet is allowed to traverse before a router should drop it. 

Let's examine the `traceroute` output from `tara` to `pippin`. 

#### Discecting traceroute output

```bash
root@tara:/# traceroute 10.1.1.2
traceroute to 10.1.1.2 (10.1.1.2), 64 hops max
  1   10.1.2.3  0.054ms  0.056ms  0.113ms
  2   10.1.1.2  0.062ms  0.112ms  0.121ms
```

NEAT! We can see that the packets were routed to `boudi`, `10.1.2.3`, who then routed them to `pippin`, `10.1.1.2`! But what was happening on each of those machines? Let's take a look using our old friend `tcpdump`.

#### tcpdump on boudi's doggonet interface

```bash
root@boudi:/# tcpdump -nvi eth0
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:38:04.884820 IP (tos 0x0, ttl 1, id 32336, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
18:38:04.884853 IP (tos 0xc0, ttl 64, id 55358, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 32336, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
18:38:04.885139 IP (tos 0x0, ttl 1, id 32337, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
18:38:04.885170 IP (tos 0xc0, ttl 64, id 55359, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 32337, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
18:38:04.885347 IP (tos 0x0, ttl 1, id 32338, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
18:38:04.885374 IP (tos 0xc0, ttl 64, id 55360, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 32338, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
18:38:04.885681 IP (tos 0x0, ttl 2, id 32339, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
18:38:04.885961 IP (tos 0xc0, ttl 63, id 6503, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 32339, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
18:38:04.886271 IP (tos 0x0, ttl 2, id 32340, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
18:38:04.886411 IP (tos 0xc0, ttl 63, id 6504, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 32340, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
18:38:04.886740 IP (tos 0x0, ttl 2, id 32341, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
18:38:04.886881 IP (tos 0xc0, ttl 63, id 6505, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
	IP (tos 0x0, ttl 1, id 32341, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
```

That's a lot... Let's look at this output packet by packet:

```
18:38:04.884820 IP (tos 0x0, ttl 1, id 32336, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
```

Here, we see that `tara`, `10.1.2.2`, is attempting to send a packet to `pippin`, `10.1.1.2`. The IP header for `ttl` is set to `1`.The job of every router is to look at the `ttl` header and see if it should keep forwarding the packet to the next hop on the route to the destination. If the router _should_ forward the packet, it will decrement the `ttl` and then send it on to the next hop. If the `ttl` reaches 0 after being decremented, the router should drop the packet and send a response back to the initiator of the request saying that the `ttl` has been exceeded. 

The `ttl` is set to `1` when `boudi` receives the packet. `boudi` decrements it to `0` and sees that it cannot forward the packet according to the rules of routing. `boudi`'s next step is to send an `ICMP time exceeded` packet back to `tara`.

Let's look at the next packet:

```
18:38:04.884853 IP (tos 0xc0, ttl 64, id 55358, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
	IP (tos 0x0, ttl 1, id 32336, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
```

Here, we can see that `boudi`, `10.1.2.3`, is sending the `ICMP time exceeded` packet to `tara`, `10.1.2.2`. The `ttl` is `64` because `boudi` wants to make sure the packet makes it back to the request initiator. The last 2 lines tell `tara` which packet `boudi` dropped; the `id 32336` is the same as the first packet we examined.

We see this pattern repeated 2 more times with the `ttl` set to `1`. Then we see another packet from `tara` that has the `ttl` set to `2`:

```
18:38:04.885681 IP (tos 0x0, ttl 2, id 32339, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
```


NEXT STEPS: 
* Finish discecting tcpdump output
* remove the route `pippin` => `tara`
* document how traceroute "fails"
* remove the route `tara` => `pippin`
* show error message


TODO:
* [DONE] Add traceroute to Dockerfile
* [DONE] See if traceroute gives a better illustration of how packetes are being routed, especially between pippin & tara
* document the output from traceroute
* edit docker-compose to add routes between pippin and tara
* rearrange chapter 003 to show it working correctly first. Then remove the route and show it broken.
* think about what chapter 004 will be (may not want the routes between pippin and tara)
    - large internetwork using static routes? use this as a jumping off point to see the necessity of dynamic routing.
    - route summarization?
