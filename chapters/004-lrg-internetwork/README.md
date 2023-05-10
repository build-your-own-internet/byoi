#TODO

* [ ] Start from scratch and take more thorough notes explaining the process of
  how we uncovered the issue
* [ ] Flesh out TODOs in the old notes and incorporate them in the new README


# Let's make that Internet MOAR BIGGER!

## Goals for this section:

Let's use the tools and processes we've already discovered to make a much larger
internetwork! In this case, we'll want to be able to traverse several networks
to get machines who are not directly connected to be able to communicate with
each other. Looking at the network diagram below, we can see that the `Client` machine is connected to the `1.0.0.0/8` network. We want the `Client` machine to be able to traverse our internetwork to reach the `Server` machine connected to the `5.0.0.0/8` to request a basic HTML document. 

**TODO: describe something about where the HTML document is and how the user can see it**

Here's what we expect the internet to look like at the end of this chapter:

```
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

Simple, no?!

## Vocab

* `subnet`: 
* `prefix`: 

## Asides

### Pets v. Cattle

You might be wondering what the hell happened to our fun pets and their
personalities. Well, we are in serious business territory now and there is no
room for emotions and personality when it comes to serious business™. In other
words, when you are dealing with large infrastructure, it's much easier to
manage things when you assign roles to them that dictate how things are
configured. Hence, we have Server(s), Client(s) and Router(s) instead of our
lovable pets.

There is an industry specific phrase that matches the theme here too. Within
infrastructure industry, the popular way to see components of the infrastracture
is as "cattle, not pets". This is a mean way of saying we only care about the
larger system and we care less about details of individual components. Those
components are there to serve a purpose and once they are unable to, we can
easily replace them with other components that can serve the same role.

Since we do care about the roles, let's dive a little deeper into them and understand what we mean:

### Vocab reminders

#### Client

A client is any machine that initiates a connection/request to another machine
on the network or the larger internetwork. A common example is a browser or curl
request to a web resource. In future chapters, we might explore how clients are
protected by the network either via firewall or through other means but this
definition is sufficient for our current use case.

#### Server

A server is any machine whose purpose is to serve a network request. If the
server fails to serve the request, it can return an appropriate error back to
the client. In our case, we have built a very simple HTTP server that responds
back to any request with a simple HTML.

#### Router

A router is any machine whose purpose is to connect networks together. It does
so by forwarding packets to the next hop. Each router has a picture of what the
internetwork looks like and it makes decision on its own for the most efficient
way to send the packet to its destination. Internet, as we know today, is not
possible without numerous routers facilitating the requests.

**NOTE** The way we have our routers setup right now is inconsistent with the
*previous paragraphs assertion that a router can make decisions about which
*route to use. Our routers have a single route defined via `ip route add` to
*each network. There's no opportunity for choice.

### How to read an IP address; i.e. octets and subnets

*TODO:* describe how the network diagram above relates to the docker compose file which relates to the `ip route add` commands in the sleep.sh file.

### How to read a MAC address

*TODO*: describe how we think Docker is assigning mac address in a specific pattern where IPV4 addresses are converted to HEX. This likely should go closer to where we first start looking at MAC addresses.

## There and Back Again - a setup journey

*TODO*: finish instructions on setting up the environment so they can follow our discovery process
This needs to include an instruction to:

```
cp init/sleep-exercise.sh init/sleep.sh
```

## Now let's test out our internetwork!

We have a client. We have a server. Let's get that client making requests to our server!

First, let's `hopon client` and make sure we can reach our server with a `ping 5.0.0.100`. 

### UH OH! That shit is broken! Let's fix it.

When we see our ping go out, we get no response back... When we CTRL+c our way out of our ping, we get 100% packet loss... :thumbs-down: We need to do some investigationing to figure out where our packets are going and why they aren't going to our server. 

#### General troubleshooting thought process

We need to define a process that will help us figure out why our ping isn't succeeding. Something about our routes defined in sleep-exercise.sh isn't working. Let's think this through...

- asymetric routing makes it harder to troubleshoot (not NECESSARILY a problem)
- what are the possible causes for the ping to not go through:
  * some router along the path doesn't know how to get to the destination
  * some router along the path doesn't know how to get back to the source
  * a wrong path is defined on the path somewhere in the process (e.g. routers pointing to each other)
  * client doesn't have a route to the destination IP
  * server doesn't have a route to the source IP

Here's our strategy:

We're trying to get from Client to Server, and that's not working. But... that's traversing our whole internet. Let's make this a little simpler by starting with just Router1. Can Router1 ping Server? Yes? Sweet! Let's move one hop out and jump on Router3. Can Router3 ping server? It can't... So, let's use the tools we've explored in previous chapters to discover why!

#### A discovery process











Ok, let's look at the packets carefully and how they are being routed using `tcpdump`. We expect, based on the network diagram at the beginning of this document, that router3 should have a path to the server via router1. However, typos are common in computing so we need to figure out why the expectation does not match reality.

Towards that goal, let's hop on to router 1 and figure out which interface is on three-net.

```
ip addr
...
91: eth2@if92: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:03:00:01:01 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 3.0.1.1/8 brd 3.255.255.255 scope global eth2
       valid_lft forever preferred_lft forever
...
```

`eth2` is the interface. Router3 and router1 both have interfaces listening on three-net. We would expect packets from router3 to router1 going over three-net as that is the most efficient route. So we are going to watch for those packets on router1 on it's three-net interface (`eth2`) to ensure that they are arriving where they should be. To do that, we will hop on to router1 and run `tcpdump` listening on `eth2` interface. With that running, in a separate terminal session, we will hop on to router3 and issue a ping to server. We also need to run `tcpdump` on router3 for each of it's interfaces to prove packets are leaving as expected.

```
root@router3:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1005ms
```

Here we can see that our ping has 100% packet loss. Not good... Let's resend that ping while we listen on all of router3s interfaces to see what's happening with our packets:

```
root@router3:/# tcpdump -nvi eth2
tcpdump: listening on eth2, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

```
root@router3:/# tcpdump -nvi eth1
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

```
root@router3:/# tcpdump -nvi eth0
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
18:42:43.059083 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 100.1.2.1 tell 100.1.3.1, length 28
18:42:43.059123 ARP, Ethernet (len 6), IPv4 (len 4), Reply 100.1.2.1 is-at 02:42:64:01:02:01, length 28
18:42:46.831414 IP (tos 0x0, ttl 64, id 60255, offset 0, flags [DF], proto ICMP (1), length 84)
    100.1.3.1 > 5.0.0.100: ICMP echo request, id 15, seq 1, length 64
18:42:47.858788 IP (tos 0x0, ttl 64, id 60352, offset 0, flags [DF], proto ICMP (1), length 84)
    100.1.3.1 > 5.0.0.100: ICMP echo request, id 15, seq 2, length 64
18:43:04.658990 IP6 (hlim 255, next-header ICMPv6 (58) payload length: 16) fe80::ec1e:56ff:fe3e:ae11 > ff02::2: [icmp6 sum ok] ICMP6, router solicitation, length 16
	  source link-address option (1), length 8 (1): ee:1e:56:3e:ae:11
```

Interesting! Here we're seeing the ICMP ping requests going out on the one-hundo-net interface! Uh oh! We were expecting these to go out the three-net interface! Let's look at the routing table for router3 in sleep.sh:

```
  (router3)
    ip route add 5.0.0.0/8 via 100.1.2.1
    ip route add 1.0.0.0/8 via 100.1.2.1
    ip route add 200.1.1.8/29 via 3.0.1.1
    ip route add 200.1.1.0/29 via 100.1.2.1
    ip route add 200.1.1.16/29 via 100.1.4.1
    ;;
```

Here, we can see we have the route to five-net defined as going through the one-hundo-net interface. Let's change that to go out the three-net interface instead; `3.0.1.1`. Once that's updated, let's `restart` our routers and `hopon router3` again to test that ping:

```
root@router3:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.
64 bytes from 5.0.0.100: icmp_seq=1 ttl=63 time=0.087 ms
64 bytes from 5.0.0.100: icmp_seq=2 ttl=63 time=0.199 ms

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1016ms
rtt min/avg/max/mdev = 0.087/0.143/0.199/0.056 ms
```

HAHA! Victory! Can the client reach the server now? 

```
root@client:/# ping 5.0.0.100 -w 2
PING 5.0.0.100 (5.0.0.100) 56(84) bytes of data.
64 bytes from 5.0.0.100: icmp_seq=1 ttl=61 time=0.277 ms
64 bytes from 5.0.0.100: icmp_seq=2 ttl=61 time=0.335 ms

--- 5.0.0.100 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1057ms
rtt min/avg/max/mdev = 0.277/0.306/0.335/0.029 ms
```

YESSSS! If this hadn't resolved the issue, we could have continued the pattern of hopon a router slightly further away from the server until we found a router where the ping was not successful. At that point, we would use the same combination of `ping`, `tcpdump`, and `ip addr` to troubleshoot where in the network the problem was coming from. Perhaps we could even make a checklist of requests that we would expect to be successful, and run through them, like so:

* ping client => router5 one-net :check:
* ping client => router5 hundo-net :check:
* ping client => router3 hundo-net :check:
* ping client => router3 three-net :NOPE:



*TODO*: at least define, if not explore:
* default gateways
* route summarization (rather than listing each small network, point to a larger subnet that covers them all)