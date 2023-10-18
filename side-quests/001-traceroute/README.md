# Let's explore how we can see our internet

## Goals for this section

Explore how traceroute gives us network topology so we can see how the machines we're creating are communicating with each other.

We'll be exploring traceroute using the internet we created in Chapter 002:

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

## Examining traceroute

### How it works

#### What is traceroute?

`traceroute` is a network analysis tool that shows path a packet takes from the initiator of a request (i.e. a client) to the destination IP. This is done through sending single packets that have a preset `ttl` in the IP header. The `ttl` in IP context does not refer to a specific _time_ to live, instead, it is the maximum number of hops a packet is allowed to traverse before a router should drop it.

Let's examine the `traceroute` output from `tara` to `pippin`.

#### Dissecting traceroute output

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

```bash
18:38:04.884820 IP (tos 0x0, ttl 1, id 32336, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
```

Here, we see that `tara`, `10.1.2.2`, is attempting to send a packet to `pippin`, `10.1.1.2`. The IP header for `ttl` is set to `1`. The job of every router is to look at the `ttl` header and see if it should keep forwarding the packet to the next hop on the route to the destination. If the router _should_ forward the packet, it will decrement the `ttl` and then send it on to the next hop. If the `ttl` reaches 0 after being decremented, the router should drop the packet and send a response back to the initiator of the request saying that the `ttl` has been exceeded.

The `ttl` is set to `1` when `boudi` receives the packet. `boudi` decrements it to `0` and sees that it cannot forward the packet according to the rules of routing. `boudi`'s next step is to send an `ICMP time exceeded` packet back to `tara`.

Let's look at the next packet:

```bash
18:38:04.884853 IP (tos 0xc0, ttl 64, id 55358, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.2.3 > 10.1.2.2: ICMP time exceeded in-transit, length 45
 IP (tos 0x0, ttl 1, id 32336, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33434: UDP, length 9
```

Here, we can see that `boudi`, `10.1.2.3`, is sending the `ICMP time exceeded` packet to `tara`, `10.1.2.2`. The `ttl` is `64` because `boudi` wants to make sure the packet makes it back to the request initiator. The `ttl` on this packet is completely unrelated to the `ttl` of the first packet. The last 2 lines tell `tara` which packet `boudi` dropped; the `id 32336` is the same as the first packet we examined. The kernel on `tara` uses these lines to connect the incoming `ICMP time exceeded` packet to the `traceroute` application.

We see this pattern repeated 2 more times with the `ttl` set to `1`. `traceroute` isn't just concerned with providing a list of hops between the initiator of the packets and the destination, it also wants to show patterns in the network. If you examine the output of the `traceroute` run on `tara`, you'll see that there are 3 durations after each hop; e.g. `10.1.2.3  0.054ms  0.056ms  0.113ms`. Those numbers show the fastest, average, and longest time it took to get a response from each hop.

Then we see another packet from `tara` that has the `ttl` set to `2`:

```bash
18:38:04.885681 IP (tos 0x0, ttl 2, id 32339, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
```

The `ttl` of `2` means that the packet can make it to 2 hops before it is dropped. In this case, our final destination, `pippin` is only 2 hops away! Because we have a route setup from `pippin` back to `tara`, `pippin` can respond to `tara` with `ICMP udp port unreachable`:

```bash
18:38:04.885961 IP (tos 0xc0, ttl 63, id 6503, offset 0, flags [none], proto ICMP (1), length 65)
    10.1.1.2 > 10.1.2.2: ICMP 10.1.1.2 udp port 33435 unreachable, length 45
 IP (tos 0x0, ttl 1, id 32339, offset 0, flags [DF], proto UDP (17), length 37)
    10.1.2.2.60765 > 10.1.1.2.33435: UDP, length 9
```

Wait... What? `unreachable`? But it's right there? I see the packet and everything! What is even happening?!?!?!

OK, so it turns out `traceroute` is kinda a hack stacked on a hack stacked on a hack. We already discussed how it was hacking IP header `ttl` to show the hops on the route from `tara` to `pippin`. This `unreachable` thing is just another hack. `traceroute` is sending a request to a port on the destination machine that it is guessing isn't actually listening for incoming requests. In this case, `traceroute` is attempting to reach a process listening for packets on udp port 33435 on `pippin`; but `pippin` doesn't have any processes listening on that port... So, `pippin` responds with an `ICMP udp port unreachable`. The host machine sends this ICMP packet back to indicate that it cannot deliver packets through that port.

STOP! Analogy time! This is the equivalent of sending a message to a friends house to see where their house is. But, you're not sending the message to your friend, you're just making up some name. The friend receives the message, says "there's no one here by that name!" and hits that `return-to-sender` option. The message comes back to you, and now you know, you've reached your friend's house! Weird, but true.

As soon as `traceroute` gets that `ICMP udp port unreachable` message, it knows it has reached the destination machine and it can stop sending packets. Sweet! We can see it working! Now...

### Let's break that shit

Now we know what to expect when traceroute is successfully navigating a path from the initiator machine to the destination machine. Let's see what happens when that path is broken. We added a new software to our Dockerfile, `iptables`. `iptables` is a powerful tool for managing network traffic. If you want to play with more options after you finish this introduction, [check out this blog post](https://www.cyberciti.biz/tips/linux-iptables-9-allow-icmp-ping.html). At a basic level, `iptables` allows you to write rules for handling packets that are incoming, forwarding, or outgoing. You can see a list of your current rules with `iptables -L`:

```bash
root@pippin:/# iptables -L
# Warning: iptables-legacy tables present, use iptables-legacy to see them
Chain INPUT (policy ACCEPT)
target     prot opt source               destination

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
```

Currently, `pippin` has no rules for handling any packets in any special way. We now know that `traceroute` is using a hack to find the destination machine. What happens if we don't allow the destination machine, `pippin` to send `ICMP` packets in response? First, we're going to use `iptables` to tell `pippin` to drop any ICMP port unreachable packets that are leaving the machine:

```bash
root@pippin:/# iptables -A OUTPUT -p icmp --icmp-type port-unreachable -j DROP
```

If we re-check the list of rules in `iptables` now, we'll see that there is a new rule defined to `DROP` any `OUTPUT` packets of type `icmp port-unreachable`:

```bash
root@pippin:/# iptables -L OUTPUT
# Warning: iptables-legacy tables present, use iptables-legacy to see them
Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
DROP       icmp --  anywhere             anywhere             icmp port-unreachable
```

Now, when we run out `traceroute` on `tara`, we get an interesting response:

```bash
root@tara:/# traceroute 10.1.1.2
traceroute to 10.1.1.2 (10.1.1.2), 64 hops max
  1   10.1.2.3  0.071ms  0.071ms  0.071ms
  2   *  *  *
  3   *  *
```

`traceroute` on `tara` sends it's packets trying to reach the destination machine, `10.1.1.2`, `pippin`. `boudi` receives the packets and forwards them on to `pippin`. But... `pippin` can't respond back. `tara` waits and doesn't get a response, so it tries again, the same 3 times that we saw before with a `ttl` of `2`. It never sees a response, so it tries again, this time with a `ttl` of `3`. `traceroute` on `tara` will keep trying to see if it can reach the destination machine until it reaches its `64 hops max`.

Now let's see what was happening on `pippin` while `traceroute` on `tara` was trying to reach it.

```bash
root@pippin:/# tcpdump -ni eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:59:48.889288 IP 10.1.2.2.37754 > 10.1.1.2.33435: UDP, length 9
19:59:51.896751 IP 10.1.2.2.37754 > 10.1.1.2.33435: UDP, length 9
19:59:54.903139 IP 10.1.2.2.37754 > 10.1.1.2.33435: UDP, length 9
19:59:57.907917 IP 10.1.2.2.37754 > 10.1.1.2.33436: UDP, length 9
20:00:00.913735 IP 10.1.2.2.37754 > 10.1.1.2.33436: UDP, length 9
```

We can see the packets from `tara`, `10.1.2.2` coming in, but there is no corresponding response back to `tara`. We've effectively blocked our ICMP port unreachable response! But!!! Because we wrote our `iptables` rule to only block `ICMP port unreachable` OUTPUT, we can still `ping` `pippin` because its response to the `ping` is an `ICMP echo reply`:

```bash
root@tara:/# ping 10.1.1.2
PING 10.1.1.2 (10.1.1.2) 56(84) bytes of data.
64 bytes from 10.1.1.2: icmp_seq=1 ttl=63 time=0.095 ms
64 bytes from 10.1.1.2: icmp_seq=2 ttl=63 time=0.178 ms
64 bytes from 10.1.1.2: icmp_seq=3 ttl=63 time=0.168 ms
```

```bash
root@pippin:/# tcpdump -ni eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
20:23:01.691654 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 1, seq 1, length 64
20:23:01.691675 IP 10.1.1.2 > 10.1.2.2: ICMP echo reply, id 1, seq 1, length 64
20:23:02.713588 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 1, seq 2, length 64
20:23:02.713611 IP 10.1.1.2 > 10.1.2.2: ICMP echo reply, id 1, seq 2, length 64
20:23:03.756758 IP 10.1.2.2 > 10.1.1.2: ICMP echo request, id 1, seq 3, length 64
20:23:03.756791 IP 10.1.1.2 > 10.1.2.2: ICMP echo reply, id 1, seq 3, length 64
```

### Exercises for the reader

* `restart` everything and see what happens when you use `ip route` to remove the route `pippin` => `tara`. Where do you see changes in the output?
* What about `tara` => `pippin`? How does the output change?
* How else can you use `iptables` to block the connection between `tara` and `pippin`?
* How does `mtr` function differently than `traceroute`? Use the help (`H` key when it's running) to figure out how to change the protocol that's used!
