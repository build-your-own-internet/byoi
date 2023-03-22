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

### How to read an IP address; i.e. octets and subnets


*TODO:* describe how the network diagram above relates to the docker compose file which relates to the `ip route add` commands in the sleep.sh file. 

General troubleshooting technique for why the setup in sleep-exercise.sh isn't working
- asymetric routing makes it harder to troubleshoot (not NECESSARILY a problem)
- what are the possible causes for the ping to not go through:
  * some router along the path doesn't know how to get to the destination
  * some router along the path doesn't know how to get back to the source
  * a wrong path is defined on the path somewhere in the process (e.g. routers pointing to each other)
  * client doesn't have a route to the destination IP
  * server doesn't have a route to the source IP

one strategy
- start with all routers that are immediately adjacent to five-net and make sure they can connect properly to Server

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
- no output from our tcpdump because it was sending the request out the wrong interface
- we wouldn't have seen the ARP Request/Reply

## tcpdump from router1 listening on three-net interface

> 18:20:55.044856 02:42:03:00:03:01 > 02:42:03:00:01:01, ethertype IPv4 (0x0800), length 98: 3.0.0.1 > 5.0.1.1: ICMP echo request, id 54, seq 1, length 64
ping request coming in from docker router on three-net?? TF???

> 18:20:55.044900 02:42:03:00:01:01 > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 3.0.0.1 tell 5.0.1.1, length 28
router1 is asking docker router on three-net "who is?"
we never get a response... rude.

this is the problem here. it looks like somehow docker is doing :maaaaagiiiiiic: and translating our ping from router3 on three-net to the docker router IP address on three-net. Docker router never responds so router1 doesn't know how to reply. so rude.

where is docker taking over in this process? 

NEXT TIME: figure out where docker is stepping in on this process
HOMEWORK: read this https://www.metricfire.com/blog/understanding-dockers-net-host-option/#:~:text=NAT%20is%20used%20to%20provide,cost%20related%20to%20using%20NAT


## TODOS

[ ] Explain network topology
    [ ] Explain octets or slash thingies
[ ] Explain the HTTP server via netcat hack
[ ] Explain the /29 choice and why we did that instead of /30 for p2p networks
