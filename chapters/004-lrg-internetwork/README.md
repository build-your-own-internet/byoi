#TODO

* [ ] Start from scratch and take more thorough notes explaining the process of
  how we uncovered the issue
* [ ] Flesh out TODOs in the old notes and incorporate them in the new README
* [ ] Explain changes to docker-compose to make docker work correct and point to docker troubleshooting in appendix
* [ ] Whenever we see a docker troubleshooting thing, move it to the appendix


# Let's make that Internet MOAR BIGGER!

## Goals for this section:

Let's use the tools and processes we've already discovered to make a much larger
internetwork! In this case, we'll want to be able to traverse several networks
to get machines who are not directly connected to be able to communicate with
each other. Looking at the network diagram below, we can see that the `Client`
machine is connected to the `1.0.0.0/8` network. We want the `Client` machine to
be able to traverse our internetwork to reach the `Server` machine connected to
the `5.0.0.0/8` to request a some HTML. 

A bit about that HTML: If you check the `init/sleep.sh` file for this chapter,
you'll see that we added a `httpserver` function:

```bash
  while true; do
    echo -e "HTTP/1.1 200 OK\r\n$(date)\r\n\r\n<h1>hello world from $(hostname) on $(date)</h1>" | nc -vl 8080; 
  done
```

This function is basically using a `netcat` hack to respond to any requests that
come in on port 8080 with the very basic HTTP response that includes a tiny
little HTML document. It's a clever solution so we don't actually have to build
an HTTP server. If it doesn't make sense, don't worry about it... ✨_IT JUST
WORKS_✨ In the setup for the server in `sleep.sh`, you'll see the last item in
the list is a call to that `httpserver` function.

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

## Asides

### Pets v. Cattle

You might be wondering what the hell happened to our fun pets and their
personalities from the previous chapter. Well, we are in serious business
territory now and there is no room for emotions and personality when it comes to
serious business™. In other words, when you are dealing with large
infrastructure, it's much easier to manage things when you assign roles to them
that dictate how things are configured. Hence, we have Server(s), Client(s) and
Router(s) instead of our lovable pets.

There is an industry specific phrase that matches the theme here too. Within
infrastructure industry, the popular way to see components of the infrastracture
is as "cattle, not pets". This is a mean way of saying we only care about the
larger system and we care less about details of individual components. Those
components are there to serve a purpose and once they are unable to, we can
easily replace them with other components that can serve the same role.

Since we do care about the roles, let's dive a little deeper into them and
understand what we mean:

### Vocab reminders

#### Client

A client is any machine that initiates a connection/request to another machine
on the network or the larger internetwork. A common example is a browser or curl
request to a web resource. In future chapters, we might explore how clients are
protected by the network either via firewall or through other means but this
definition is sufficient for our current use case.

#### Server

A server is any machine whose purpose is to respond to a network request. If the
server fails to serve the request, it can return an appropriate error back to
the client. In our case, we have hacked together a very simple HTTP server that
responds back to any request with a simple HTML.

#### Router

A router is any machine whose purpose is to connect networks together. It does
so by forwarding packets to the next hop. Each router has a picture of what the
internetwork looks like and it makes decisions on its own for the most efficient
way to send the packet to its destination. The internet, as we know today, is not
possible without numerous routers facilitating the requests.

### How to read an IP address; i.e. octets and subnets

This requires a long and detailed description to really understand. For the sake of keeping this document brief, we've moved the explanation for this to [prefixes-and-subnet-masks.md](../appendix/prefixes-and-subnet-masks.md) in the appendix. Please read that document and come back here when you feel confident you have a basic understanding of what it contains!

### How docker handles MAC addresses

A MAC (media access control) address is the layer 2 address of a machine on a network. If you'd like to review what a MAC address is in detail, checkout the [appendix on ip v. mac addresses](../appendix/ip-and-mac-addresses.md).

Let's look at the output for one of our interfaces shown in `ip route`:

```bash
38: eth0@if39: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:0a:01:02:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.1.2.3/24 brd 10.1.2.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Here, we can see that the IP of the machine is `10.1.2.3` on a `/24` network.
The MAC address listed on the line above is `02:42:0a:01:02:03`. It appears to
keep things simple, when docker creates a new machine, it has to assign it a MAC
address for networking purposes. It takes the IP address for that machine and
converts it into a human readable version in hexidecimal for the MAC address.
So, the end of that MAC address, `0a:01:02:03`, converted from hexidecimal into
decimal is `10.1.2.3`. This is great for us. It means when we look at MAC
addresses in our tcpdump later in the chapter, it is much easier to see which
machines our packets are being routed through.

## There and Back Again - a setup journey

In order for our little internet to work, we need a way for the machines on our networks to know how and where to route packets. Each router on the network will have a definition of all other networks on the internet and how it can reach machines on those networks. Think about it like this. When a driver is navigating our interstate highways to try to get from Portland to San Francisco, they're gonna see signs that direct them which lanes of traffic will take them in right direction. The driver follows those signs and ends up eventually in the right city. Our routers need those same little signs to follow. Each router will have a "routing table", which is like a list of all our little signs. These routing tables will have entries for how to send packets to each network on our internet.

We want to create routing tables for each of the routers on the network we have diagramed at the top of this chapter. Each router will need to have entries on how to get to networks that the router does not already have a direct connection to. And, we need these routing tables to be defined as soon as we boot up our network. So, let's define all of the routes that are necessary for `router1` and let's add them to the `sleep.sh` file that is run when we `restart` our whole system.

Based on that diagram, `router1` already has connections to:

* `5.0.0.0/8`
* `200.1.1.8/29`
* `3.0.0.0/8`

So, for `router1` to participate in this internet, it needs to know how to route packets to all the networks it's not currently connected to. We can setup our `sleep.sh` file to use a similar structure to what we used in chapter 3. So, start with something like:

```bash
case $HOSTNAME in
  (router1)
    ip route add 1.0.0.0/8 via 3.0.3.1
    ip route add 100.1.0.0/16 via 3.0.3.1
    ip route add 200.1.1.0/29 via 200.1.1.11
    ip route add 200.1.1.16/29 via 3.0.3.1
    ;;
esac
```

*EXERCISE* do it yourself!

The `sleep.sh` file already has some setup in it. Build out the routes for `router3` similar to how you see the routes for `router1` being done. Once you've got the routes created in `sleep.sh`, `restart` your little internet and `hopon router1`. Can you ping router3 with `ping 3.0.3.1`? What about if we try to ping `router3` with packets that originate from `router1` on `5.0.0.0/8`? Try using `ping -I 5.0.1.1 3.0.3.1` to do this.

*TODO*
- Setup sleep.sh for how we want the chapter to open
- setup sleep-exercise.sh for how we want the chapter to close
- tie in the `ip_masquerade` investigation to the response we got from ^^^ last ping

Let's investigate what just happened there...

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

