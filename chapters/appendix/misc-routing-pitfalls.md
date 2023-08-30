# Misc Routing Pitfalls

This document contains discovery on a number of routing issues we encountered in setting up our internetwork. We moved these notes out of the main chapters they started in because they had more to do with discovering tangential details of how docker, linux, or other systems worked than they had to do with actual networking fundamentals. These issues were occurring because we're hacking together an internet using docker containers rather than actual hardware that is designed specifically to be a router.

The learning here is valuable, but it isn't directly relevant to learning how to create an internet. We didn't want to completely lose the discovery process, so we started dumping our notes in another file to puruse later. Some of the notes are rough, but we'll do our best to flesh them out as we can.

## Docker is helpful... until it isn't

### Docker wants to do all your routing for you

In almost every case, engineers don't want to have to deal with setting up routing minutia between the containers running their applications. To make it easy for us lazy engineers, Docker uses a default router that connects all our networks together. This is great! Unless you're trying to use docker to hack together your own internet...

Here's what happened when Docker insisted on using it's own default router for requests between our machines (or in Docker lingo, "containers").

If you'd like to follow along with the discovery process, try deleting this block from each network definition in the `docker-compose.yml` file chapter 4:

```bash
driver_opts:
  com.docker.network.bridge.enable_ip_masquerade: 'false'
```

We have a client. We have a server. Let's get that client making requests to our server!

First, let's `hopon client` and make sure we can reach our server with a `ping 5.0.0.100`.

#### UH OH! That shit is broken! Let's fix it.

When we see our ping go out, we get no response back... When we CTRL+c our way out of our ping, we get 100% packet loss... :thumbs-down: We need to do some investigationing to figure out where our packets are going and why they aren't going to our server.

##### General troubleshooting thought process

We need to define a process that will help us figure out why our ping isn't succeeding. Something about our routes defined in sleep-exercise.sh isn't working. Let's think this through...

- asymetric routing makes it harder to troubleshoot (not NECESSARILY a problem (in theory))
- what are the possible causes for the ping to not go through:
  * some router along the path doesn't know how to get to the destination
  * some router along the path doesn't know how to get back to the source
  * a wrong path is defined on the path somewhere in the process (e.g. routers pointing to each other)
  * client doesn't have a route to the destination IP
  * server doesn't have a route to the source IP

Here's our strategy:

We're trying to get from Client to Server, and that's not working. But... that's traversing our whole internet. Let's make this a little simpler by starting with just Router1. Can Router1 ping Server? Yes? Sweet! Let's move one hop out and jump on Router3. Can Router3 ping server? It can't... So, let's use the tools we've explored in previous chapters to discover why!

##### A discovery process

First, let's see what's happening with our packets. Let's examine a `tcpdump` output from Router3 line by line:

```bash
> root@router3:/# tcpdump -ni eth1
```

our tcpdump command

```bash
> 17:43:05.906765 ARP, Request who-has 3.0.0.1 tell 5.0.1.1, length 28
```

The output in plain English: ARP request, who is `3.0.0.1`, please tell Router1 on five-net

Wait.. That's not one of the machines we defined. It must be something that docker added to help us.
**TODO** why is docker router involved here at all?

Aside: What even is this ARP request? We're seeing some IP addresses asking where other IP addresses are, what's that? ARP is the protocol that translates IP addresses (internet addresses) into MAC addresses (local network addresses). This is a much larger concept that isn't necessary to understand the rest of this page. If you want to understand more about why ARP requests are necessary read up on ARP and addressing in [IP and Mac Addresses](../appendix/ip-and-mac-addresses.md).

```bash
> 17:43:05.906829 IP 100.1.3.1 > 5.0.1.1: ICMP echo request, id 48, seq 5, length 64
```

The output in plain English: ping request sent from router3 on one-hundo-net to router1 on five-net
**TODO** Go back and run these commands again with the `-e` flag on tcpdump, which should show mac addresses which will tell us if the packets are being sent to router1. Without this flag, we only know source and destination IP addresses. With it, we know (via mac addresses) what the NEXT machine is (reading the next couple bits of output, the ARP request/response, tells us that it does get to the next machine, router1 on three-net, as we expect it to).

We just grabbed this output wholesale from the initial `tcpdump` shown above and will need to go back to show what the `-e` flag would add.

```bash
> 17:43:06.801388 ARP, Request who-has 3.0.1.1 tell 3.0.3.1, length 28
> 17:43:06.801625 ARP, Reply 3.0.1.1 is-at 02:42:03:00:01:01, length 28
```

what is MAC address for router1 on three-net, tell router3 on three-net
reply that mac address for router1 is _____
I.E. router3 knows that to get to 5.0.1.1, it needs to go through the 3.0.1.1 router. It needs to be able to send a message to the 3.0.1.1 router on the local network (on the ethernet interface). Before it can do that, it needs to know what the mac address of the 3.0.1.1 machine is. router3 sends out an ARP request asking who 3.0.1.1 is, and router1 replies "it me!" with it's mac address.

```bash
> 17:43:06.929647 IP 100.1.3.1 > 5.0.1.1: ICMP echo request, id 48, seq 6, length 64
```

Here.... we would be expecting a reply... but we're not gettin' it.
We see that router3 knew the correct next hop to get to five-net. We then see that router3 found the mac address for router1, which is the connection to five-net. We see router3 send our ping destined for router1 on five-net via router1 on three-net. We see that router3 is doing everything we expect correctly. Because we're not getting a reply to our ping request, we can assume the problem is somewhere in the route defined for router1 to one-hundo-net.
If router3 had been the problem, we would have seen either
- no output from our tcpdump because it was sending the request out the wrong interface
- we wouldn't have seen the ARP Request/Reply

So now, let's move on to the `tcpdump` from router1 listening on three-net interface

```bash
> 18:20:55.044856 02:42:03:00:03:01 > 02:42:03:00:01:01, ethertype IPv4 (0x0800), length 98: 3.0.0.1 > 5.0.1.1: ICMP echo request, id 54, seq 1, length 64
```

ping request coming in from docker router on three-net?? TF???

```bash
> 18:20:55.044900 02:42:03:00:01:01 > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 3.0.0.1 tell 5.0.1.1, length 28
```

router1 is asking docker router on three-net "who is?"
we never get a response... rude.

This is the problem here. It looks like somehow docker is doing :maaaaagiiiiiic: and translating our ping from router3 on three-net to the docker router IP address on three-net. Docker router never responds so router1 doesn't know how to reply. so rude.

where is docker taking over in this process? 

It turns out, this is yet ANOTHER thing docker does for us to make it easier to use docker in NORMAL circumstances. We wanna turn that shit off. Luckily for us, [some other numbskull out there also wanted to break docker](https://forums.docker.com/t/is-it-possible-to-disable-nat-in-docker-compose/48536/2). We're just gonna steal that solution and add the following to each network definition in our `docker-compose`:

```yml
driver_opts:
    com.docker.network.bridge.enable_ip_masquerade: 'false'
```

Now, we can `ping` from router3 => server! Huzzah! Progress!!!

## Asymmetric routing woes

When we initially created our broken set up for troubleshooting network problems in Chapter 4, we found that packets were getting mysteriously dropped where we weren't expecting them to be... Here's the deal. We had set up an asymmetric routing situation where one router was pointing to another over a peer-to-peer route, but the router receiving the request had a different route back for the response. This is a necessary thing in the wild; it allows flexibility in the internetwork. However, linux, the operating system we're starting our machines with, has opinions on this. If our linux machines see that they should send response packets out a different interface than the request packets came in on, by default, they will drop them on the floor.

To fix this problem, we need to override this configuration. If you look in your [docker-compose.yml file](../004-lrg-internetwork/docker-compose.yml) for Chapter 4, you'll see that each router has some more `sysctl` configuration setup that look something like:

```yml
- net.ipv4.conf.all.rp_filter=0
- net.ipv4.conf.eth0.rp_filter=0
- net.ipv4.conf.eth1.rp_filter=0
```

The system setting we need to change is called `rp_filter`, or "reverse path" filter. This setting is designed to prevent IP source address spoofing and it is desired to have this setting turned on on a server. But routers... they need flexibility. Turning it off on the machines we've identified as 'router's allows us to perform asymmetric routing, which is something we definitely want. You can read more about the `rp_filter` setting in this [frozentux document](https://www.frozentux.net/ipsysctl-tutorial/ipsysctl-tutorial.html#AEN634).
