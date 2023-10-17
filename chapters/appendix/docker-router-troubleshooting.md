# Let's make that Internet MOAR BIGGER

## Goals for this section

Let's use the tools and processes we've already discovered to make a much larger internetwork! In this case, we'll want to be able to traverse several networks to get machines who are not directly connected to be able to communicate with each other. Looking at the network diagram below, we can see that the `Client` machine is connected to the `1.0.0.0/8` network. We want the `Client` machine to be able to traverse our internetwork to reach the `Server` machine connected to the `5.0.0.0/8` to request a basic HTML document.

**TODO: describe something about where the HTML document is and how the user can see it**

Here's what we expect the internet to look like at the end of this chapter:

```none
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

## Asides

### Pets v. Cattle

You might be wondering what the hell happened to our fun pets and their personalities. Well, we are in serious business territory now and there is no room for emotions and personality when it comes to serious business™. In other words, when you are dealing with large infrastructure, it's much easier to manage things when you assign roles to them that dictate how things are configured. Hence, we have Server(s), Client(s) and Router(s) instead of our lovable pets.

There is an industry specific phrase that matches the theme here too. Within infrastructure industry, the popular way to see components of the infrastructure is as "cattle, not pets". This is a mean way of saying we only care about the larger system and we care less about details of individual components. Those components are there to serve a purpose and once they are unable to, we can easily replace them with other components that can serve the same role.

Since we do care about the roles, let's dive a little deeper into them and understand what we mean:

### Vocab reminders

#### Client

A client is any machine that initiates a connection/request to another machine on the network or the larger internetwork. A common example is a browser or curl request to a web resource. In future chapters, we might explore how clients are protected by the network either via firewall or through other means but this definition is sufficient for our current use case.

#### Server

A server is any machine whose purpose is to serve a network request. If the server fails to serve the request, it can return an appropriate error back to the client. In our case, we have built a very simple HTTP server that responds back to any request with a simple HTML.

#### Router

A router is any machine whose purpose is to connect networks together. It does so by forwarding packets to the next hop. Each router has a picture of what the internetwork looks like and it makes decision on its own for the most efficient way to send the packet to its destination. Internet, as we know today, is not possible without numerous routers facilitating the requests.

**NOTE** The way we have our routers setup right now is inconsistent with the *previous paragraphs assertion that a router can make decisions about which*route to use. Our routers have a single route defined via `ip route add` to *each network. There's no opportunity for choice.

### How to read an IP address; i.e. octets and subnets

*TODO:* describe how the network diagram above relates to the docker compose file which relates to the `ip route add` commands in the start-up.sh file.

### How to read a MAC address

*TODO*: describe how we think Docker is assigning mac address in a specific pattern where IPV4 addresses are converted to HEX. This likely should go closer to where we first start looking at MAC addresses.

## Now let's test out our internetwork

We have a client. We have a server. Let's get that client making requests to our server!

First, let's `hopon client` and make sure we can reach our server with a `ping 5.0.0.100`.

### UH OH! That shit is broken! Let's fix it

When we see our ping go out, we get no response back... When we CTRL+c our way out of our ping, we get 100% packet loss... :thumbs-down: We need to do some investigationing to figure out where our packets are going and why they aren't going to our server.

#### General troubleshooting thought process

We need to define a process that will help us figure out why our ping isn't succeeding. Something about our routes defined in start-up-exercise.sh isn't working. Let's think this through...

* asymetric routing makes it harder to troubleshoot (not NECESSARILY a problem)
* what are the possible causes for the ping to not go through:
  * some router along the path doesn't know how to get to the destination
  * some router along the path doesn't know how to get back to the source
  * a wrong path is defined on the path somewhere in the process (e.g. routers pointing to each other)
  * client doesn't have a route to the destination IP
  * server doesn't have a route to the source IP

Here's our strategy:

We're trying to get from Client to Server, and that's not working. But... that's traversing our whole internet. Let's make this a little simpler by starting with just Router1. Can Router1 ping Server? Yes? Sweet! Let's move one hop out and jump on Router3. Can Router3 ping server? It can't... So, let's use the tools we've explored in previous chapters to discover why!

#### A discovery process

Let's examine the `tcpdump` output from Router3 line by line:

> root@router3:/# tcpdump -ni eth1
our tcpdump command

> 17:43:05.906765 ARP, Request who-has 3.0.0.1 tell 5.0.1.1, length 28
who has the docker router on three-net, tell router1 on five-net
**followup** why is docker router involved here at all?

> 17:43:05.906829 IP 100.1.3.1 > 5.0.1.1: ICMP echo request, id 48, seq 5, length 64
ping request sent from one-hundo-net to router1 on five-net
**followup** verbose tcpdump should show mac addresses which will tell us if the packets are being sent to router1 - without verbose, we only know source and destination, with verbose, we know (via mac addresses) what the NEXT machine is (reading the next couple bits of output, the ARP request/response, tells us that it does get to the next machine, router1 on three-net, as we expect it to)

> 17:43:06.801388 ARP, Request who-has 3.0.1.1 tell 3.0.3.1, length 28
> 17:43:06.801625 ARP, Reply 3.0.1.1 is-at 02:42:03:00:01:01, length 28
what is MAC address for router1 on three-net, tell router3 on three-net
reply that mac address for router1 is _____
I.E. router3 knows that to get to 5.0.1.1, it needs to go through the 3.0.1.1 router. It needs to be able to send a message to the 3.0.1.1 router on the local network (on the ethernet interface). Before it can do that, it needs to know what the mac address of the 3.0.1.1 machine is. router3 sends out an ARP request asking who 3.0.1.1 is, and router1 replies "it me!" with it's mac address.

> 17:43:06.929647 IP 100.1.3.1 > 5.0.1.1: ICMP echo request, id 48, seq 6, length 64
Here.... we would be expecting a reply... but we're not gettin' it.

We see that router3 knew the correct next hop to get to five-net. We then see that router3 found the mac address for router1, which is the connection to five-net. We see router3 send our ping destined for router1 on five-net via router1 on three-net. We see that router3 is doing everything we expect correctly. Because we're not getting a reply to our ping request, we can assume the problem is somewhere in the route defined for router1 to one-hundo-net.

If router3 had been the problem, we would have seen either

* no output from our tcpdump because it was sending the request out the wrong interface
* we wouldn't have seen the ARP Request/Reply

So now, let's move on to the `tcpdump` from router1 listening on three-net interface

> 18:20:55.044856 02:42:03:00:03:01 > 02:42:03:00:01:01, ethertype IPv4 (0x0800), length 98: 3.0.0.1 > 5.0.1.1: ICMP echo request, id 54, seq 1, length 64
ping request coming in from docker router on three-net?? TF???

> 18:20:55.044900 02:42:03:00:01:01 > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 3.0.0.1 tell 5.0.1.1, length 28
router1 is asking docker router on three-net "who is?"
we never get a response... rude.

This is the problem here. It looks like somehow docker is doing :maaaaagiiiiiic: and translating our ping from router3 on three-net to the docker router IP address on three-net. Docker router never responds so router1 doesn't know how to reply. so rude.

It turns out, this is yet ANOTHER thing docker does for us to make it easier to use docker in NORMAL circumstances. We wanna turn that shit off. Luckily for us, [some other numbskull out there also wanted to break docker](https://forums.docker.com/t/is-it-possible-to-disable-nat-in-docker-compose/48536/2). We're just gonna steal that solution and add the following to each network definition in our `docker-compose`:

```
driver_opts:
    com.docker.network.bridge.enable_ip_masquerade: 'false'
```

Now, we can `ping` from router3 => server! Huzzah! Progress!!! But, ummmm... things still break when we try to ping from client to server. Let's continue with our diagnostic. Following the same pattern we did before, We're going to check how far down the path Client can ping before we start losing packets:

* ping client => router5 one-net :check:
* ping client => router5 hundo-net :check:
* ping client => router3 hundo-net :check:
* ping client => router3 three-net :NOPE:

It looks like we start losing packets on the route between Client and Router3 on the three-net network:

```
root@client:/# ping 3.0.3.1
PING 3.0.3.1 (3.0.3.1) 56(84) bytes of data.
^C
--- 3.0.3.1 ping statistics ---
7 packets transmitted, 0 received, 100% packet loss, time 6161ms
```

So now, let's use our old friend `tcpdump` to figure out where those packets are going and why they aren't getting where we expect them to.

First, let's get the correct ethernet interface with our old friend `ip addr`:

```
root@router3:/# ip addr
33288: eth0@if33289: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:64:01:03:01 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 100.1.3.1/16 brd 100.1.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Now, we can look at `tcpdump` output specific to that interface and see if we can spot the issue:

`root@router3:/# tcpdump -nvi eth0`

```
18:32:57.504868 IP (tos 0x0, ttl 63, id 61790, offset 0, flags [DF], proto ICMP (1), length 84)
    1.0.0.100 > 3.0.3.1: ICMP echo request, id 66, seq 1, length 64
```

router3 receives ping on `eth0` (hundo-net) interface! yay!

```
18:32:57.504895 IP (tos 0x0, ttl 64, id 17711, offset 0, flags [none], proto ICMP (1), length 84)
    3.0.3.1 > 1.0.0.100: ICMP echo reply, id 66, seq 1, length 64
```

router3 replies to ping on `eth0`. yay?!

```
18:32:58.547560 IP (tos 0x0, ttl 63, id 62284, offset 0, flags [DF], proto ICMP (1), length 84)
    1.0.0.100 > 3.0.3.1: ICMP echo request, id 66, seq 2, length 64
18:32:58.547624 IP (tos 0x0, ttl 64, id 18022, offset 0, flags [none], proto ICMP (1), length 84)
    3.0.3.1 > 1.0.0.100: ICMP echo reply, id 66, seq 2, length 64
```

and repeat

So, this looks good... what's happening? it would probably help to have the mac address of the next hop. let's run that tcpdump again, this time with the `-e` flag to get the mac addresses:

`root@router3:/# tcpdump -nvie eth0`

```
18:41:24.110439 02:42:64:01:05:01 > 02:42:64:01:03:01, ethertype IPv4 (0x0800), length 98: (tos 0x0, ttl 63, id 23157, offset 0, flags [DF], proto ICMP (1), length 84)
    1.0.0.100 > 3.0.3.1: ICMP echo request, id 67, seq 1, length 64
18:41:24.110501 02:42:64:01:03:01 > 02:42:64:01:02:01, ethertype IPv4 (0x0800), length 98: (tos 0x0, ttl 64, id 2178, offset 0, flags [none], proto ICMP (1), length 84)
    3.0.3.1 > 1.0.0.100: ICMP echo reply, id 67, seq 1, length 64
```

We see the request hitting router3 on one-hundo-net: `02:42:64:01:05:01 > 02:42:64:01:03:01`
Then we see router3 responding via router2 on one-hundo-net `02:42:64:01:03:01 > 02:42:64:01:02:01`

How was the route to router2 setup that

## TODOS

[ ] Explain network topology
    [ ] Explain octets or slash thingies
[ ] Explain the HTTP server via netcat hack
[ ] Explain the /29 choice and why we did that instead of /30 for p2p networks
