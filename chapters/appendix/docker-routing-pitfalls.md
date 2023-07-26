# Docker Routing Pitfalls

## Here's what happened when we tried testing our internetwork

If you'd like to follow along with the discovery process, try deleting this block from each network definition in the `docker-compose.yml` file chapter 4:

```bash
driver_opts:
  com.docker.network.bridge.enable_ip_masquerade: 'false'
```

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

Let's examine the `tcpdump` output from Router3 line by line:

```bash
> root@router3:/# tcpdump -ni eth1
```

our tcpdump command

```bash
> 17:43:05.906765 ARP, Request who-has 3.0.0.1 tell 5.0.1.1, length 28
```

who has the docker router on three-net, tell router1 on five-net
**followup** why is docker router involved here at all? 

```bash
> 17:43:05.906829 IP 100.1.3.1 > 5.0.1.1: ICMP echo request, id 48, seq 5, length 64
```

ping request sent from one-hundo-net to router1 on five-net
**followup** verbose tcpdump should show mac addresses which will tell us if the packets are being sent to router1 - without verbose, we only know source and destination, with verbose, we know (via mac addresses) what the NEXT machine is (reading the next couple bits of output, the ARP request/response, tells us that it does get to the next machine, router1 on three-net, as we expect it to)

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

```
driver_opts:
    com.docker.network.bridge.enable_ip_masquerade: 'false'
```

Now, we can `ping` from router3 => server! Huzzah! Progress!!!
