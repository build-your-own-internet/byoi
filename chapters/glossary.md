# Glossary

You might run into terms that you don't know the definition to. Sometimes they are properly defined when they are first used, and sometimes they are not. Maybe you put this text down for a while and can't remember if we ever talked about it. Either way, we will do our best to define terms here!

- [Glossary](#glossary)
  - [client](#client)
  - [container](#container)
  - [daemon (or daemonize)](#daemon-or-daemonize)
  - [dns zone](#dns-zone)
  - [docker](#docker)
  - [hop](#hop)
  - [host](#host)
  - [interface](#interface)
  - [internet (or internetwork)](#internet-or-internetwork)
  - [IP address](#ip-address)
  - [MAC address](#mac-address)
  - [machine](#machine)
  - [multicast](#multicast)
  - [name resolution](#name-resolution)
  - [neighbor (in a routing context)](#neighbor-in-a-routing-context)
  - [network](#network)
  - [packets (a.k.a `IP packets`)](#packets-aka-ip-packets)
  - [proxy](#proxy)
  - [resolver](#resolver)
  - [router (a.k.a `gateway`)](#router-aka-gateway)
  - [routing table](#routing-table)
  - [service](#service)
  - [server](#server)
  - [TCP (Transmission Control Protocol)](#tcp-transmission-control-protocol)
  - [UDP (User Datagram Protocol)](#udp-user-datagram-protocol)

## client

A client is any host that initiates a connection/request to a server on the network or the larger internet. A common example is a browser or curl request to a web resource. In future chapters, we might explore how clients are protected by the network either via firewall or through other means but this definition is sufficient for our current use case.

## container

A container is a virtual machine, typically (but not necessarily) being run and managed by Docker. A container, being a virtual machine, will also have virtual network interfaces.

## daemon (or daemonize)

Daemons (or sometimes "demons") are pieces of software that run in the "background," meaning they run continuously on a machine without producing interactive text. They are typically used to provide network services. Examples of daemons include: name servers, web servers, and routing software.

Typically, a program that can run as a daemon will have both "interactive" modes and "daemonize" modes. The interactive mode (which is typically default) will run the program and output all of its messages to the screen. This means it will take over your terminal session. When this is happening, you won't be able to do anything else with that terminal unless you type `ctrl` + `c` (or open another terminal).

When you run a daemon in its more "natural" daemonize mode, then it runs in the background and doesn't make a peep. It typically still generates log messages, but those messages are funneled into a file somewhere on the machine's hard disk (often something like `/var/log/messages`). Check the daemon's documentation for details on where it puts its messages when running in the background.

## dns zone

First, the technical description: In DNS, a zone is a specific, contiguous portion of the DNS namespace for which administrative responsibility has been delegated to a single manager or organization. Think of it as a segment of the DNS hierarchy that a particular entity controls and maintains.

Imagine the internet as a giant atlas filled with maps of varying detail, from world maps to city street maps. When you seek a specific address like "804 S. 17th Ave, Chicago IL, USA" you start with the world map, which doesn’t show that level of detail but directs you to the map of the United States. From there, you move to the map of Illinois, then to Chicago, and finally to the exact street address.

In this analogy, a DNS zone is like a specific map within this atlas. The divisions between maps — world, country, state, city — represent DNS zones in the Domain Name System. The dots in a domain name (like `www.example.com`) act like the commas and spaces in a physical address, signaling transitions from one DNS zone to another, just as you move from one map to the next for more detailed information.

When you type a domain name into your browser, your computer starts by asking the root DNS servers (the world map) for directions. The root servers don’t have the exact address but point you to the top-level domain servers (country map), such as `com.`. These servers then direct you to the authoritative DNS servers for the domain (state or city map), which provide the specific IP address you’re seeking. This step-by-step process mirrors flipping through an atlas to find a specific location.

Breaking down the internet into DNS zones, much like dividing maps in an atlas, makes navigating and managing the vast network feasible. Each DNS zone is responsible for a segment of the domain name space, ensuring efficient resolution of domain names without overloading any single server. This hierarchical structure helps computers across the internet collaborate to find any website you want to visit.

In essence, DNS zones function like the different maps in an atlas, each providing a layer of detail that guides you to your destination. By moving through these zones or maps, you efficiently locate the exact address you’re looking for on the internet.

## docker

Docker is a piece of software that runs and manages containers. It also creates virtual networking environments and will often try to butt in and do more network interference than you want it to.

## hop

A hop refers to a machine between the source and destination that a packet traverses through. The number of machines that a packet goes through before reaching the destination is the hop count.

## host

A "host" is a machine that does not route packets. There are two sub-types of hosts: `clients`, which only originate requests on a network, and `servers` which only respond to network requests on a network.

## interface

An `interface` (or, more properly said, `network interface`) is (typically) an ethernet port on a machine which allows it to send packets on an ethernet network. In a Docker environment, this interface is virtual, and not physical. Outside of docker, this interface will be connected to a physical wire or radio (WiFi) signal. In more exotic networking environments (such as a data-center), you may even see network interfaces other than Ethernet. Also, it's possible for a machine to have more than one interface, but that's uncommon (and typical only of routers).

## internet (or internetwork)

An internet is a set of networks joined together by routers so that machines can communicate across those networks to one other.

## IP address

An IP (Internet Protocol) address is the layer 3 address of a machine on a network.
<!-- TODO: write a definition for IP address -->

## MAC address

A MAC (Media Access Control) address is the layer 2 address of a machine on a network. If you'd like to read more about what a MAC address is in technical terms, checkout [Appendix: IP and MAC addresses](../appendix/ip-and-mac-addresses.md).
<!-- TODO: write a definition for MAC address, and perhaps create this appendix -->

## machine

A machine is any computer that (at least for the purpose of this document) is more-or-less permanently attached to a network and does not move around from one network to another. Could be a host or a router.

## multicast

For the purpose of this document, a multicast message is anything with a destination IP in the range of `224.0.0.0/4`. When a host sends a packet to an IP within that range, two things happen on the ethernet network the host is on:

1. The packet broadcasts to ALL machines on that ethernet network.
2. If there are any routers configured to route multicast, they'll pick up the packet and forward it out of the ethernet network to any other routers that are configured to support multicast routing.

This tends to be a private network solution because hosts can't really trust the open internet.

## name resolution

Name-resolution is the process of converting a human-friendly name into the IP address machines need to be able to route traffic across the Internet.

## neighbor (in a routing context)

When two routers each have interfaces on the same network, they can communicate directly with each other over Ethernet. This makes them "neighbors."

## network

A "network" is a slightly overloaded term. Strictly speaking, a network consists of a set of machines that are all directly connected to one another through a common physical medium. The most common network medium is Ethernet. So if two machines are on the same network, they should be able to communicate directly with one another using Ethernet packets (or "frames").

Typically a network will have a "network address" which (if we're using version 4 of IP), will be four numbers separated by dots with a slash and another number (e.g. 10.1.1.0/24).

Sometimes when people use the term "network," they mean "internet." Since "internet" is a lot of syllables, it's a lot easier to just shorten the word.

## packets (a.k.a `IP packets`)

All traffic on an internet is wrapped up in IP packets. IP packets provide a header that contains a bit of metadata that is necessary to be able to correctly route and manage the data container within the packet.

## proxy

A proxy is a stand-in for something else. In computing, a proxy is a system that understands a network protocol and acts as an endpoint. A proxy will pretend to be the real system that is being communicated with while secretly relying on the real entity to serve the request.

## resolver

A resolver is a piece of software that performs DNS lookups.

## router (a.k.a `gateway`)

A router is any machine whose purpose is to connect networks together. It does so by forwarding packets further toward their destination. Each router has a routing table which serves much like a sign post on a highway: it tells the router where to send packets next on their way to their final destination. Each router makes decisions on its own for the most efficient way to send the packet to its destination. The internet, as we know today, is not possible without numerous routers facilitating the requests.

## routing table

A routing table is a list of known network IP address ranges, and every machine connected to an internet has a routing table to reference. Machines use routing tables to determine what the next [hop](#hop) should be when they're sending [packets](#packets-aka-ip-packets) towards a destination IP address. If the routing table does not have a matching route for the destination IP address, the request can be sent out the default gateway in the hopes that another machine on that internet will know how to get the packets to their destination. Check [prefixes-and-subnet-masks.md in the appendix](../appendix/prefixes-and-subnet-masks.md) for more details on how routing tables work.

## service

A process on a server which responds to requests. E.g. a website, API, DNS, TLS terminator, ssh, etc.

## server

A server is any machine whose purpose is to serve a network request to a client. If the server fails to serve the request, it can return an appropriate error back to the client.

## TCP (Transmission Control Protocol)

## UDP (User Datagram Protocol)
