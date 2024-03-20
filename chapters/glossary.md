# Glossary

You might run into terms that you don't know the definition to. Sometimes they are properly defined when they are first used, and sometimes they are not. Maybe you put this text down for a while and can't remember if we ever talked about it. Either way, we will do our best to define terms here!

- [Glossary](#glossary)
  - [client](#client)
  - [container](#container)
  - [docker](#docker)
  - [hop](#hop)
  - [host](#host)
  - [interface](#interface)
  - [internet (or internetwork)](#internet-or-internetwork)
  - [machine](#machine)
  - [multicast](#multicast)
  - [name resolution](#name-resolution)
  - [network](#network)
  - [packets (a.k.a `IP packets`)](#packets-aka-ip-packets)
  - [router (a.k.a `gateway`)](#router-aka-gateway)
  - [routing table](#routing-table)
  - [service](#service)
  - [server](#server)

## client

A client is any host that initiates a connection/request to a server on the network or the larger internet. A common example is a browser or curl request to a web resource. In future chapters, we might explore how clients are protected by the network either via firewall or through other means but this definition is sufficient for our current use case.

## container

A container is a virtual machine, typically (but not necessarily) being run and managed by Docker. A container, being a virtual machine, will also have virtual network interfaces.

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

## machine

A machine is any computer that (at least for the purpose of this document) is more-or-less permanently attached to a network and does not move around from one network to another. Could be a host or a router.

## multicast

For the purpose of this document, a multicast message is anything with a destination IP in the range of `224.0.0.0/4`. When a host sends a packet to an IP within that range, two things happen on the ethernet network the host is on:

1. The packet broadcasts to ALL machines on that ethernet network.
2. If there are any routers configured to route multicast, they'll pick up the packet and forward it out of the ethernet network to any other routers that are configured to support multicast routing.

This tends to be a private network solution because hosts can't really trust the open internet.

## name resolution

Name-resolution is the process of converting a human-friendly name into the IP address machines need to be able to route traffic across the Internet.

## network

A "network" is a slightly overloaded term. Strictly speaking, a network consists of a set of machines that are all directly connected to one another through a common physical medium. The most common network medium is Ethernet. So if two machines are on the same network, they should be able to communicate directly with one another using Ethernet packets (or "frames").

Typically a network will have a "network address" which (if we're using version 4 of IP), will be four numbers separated by dots with a slash and another number (e.g. 10.1.1.0/24).

Sometimes when people use the term "network," they mean "internet." Since "internet" is a lot of syllables, it's a lot easier to just shorten the word.

## packets (a.k.a `IP packets`)

All traffic on an internet is wrapped up in IP packets. IP packets provide a header that contains a bit of metadata that is necessary to be able to correctly route and manage the data container within the packet.

## proxy

A proxy is a stand-in for something else. In computing, a proxy is a system that understands a network protocol and acts as an endpoint. A proxy will pretend to be the real system that is being communicated with while secretly relying on the real entity to serve the request.

## router (a.k.a `gateway`)

A router is any machine whose purpose is to connect networks together. It does so by forwarding packets further toward their destination. Each router has a routing table which serves much like a sign post on a highway: it tells the router where to send packets next on their way to their final destination. Each router makes decisions on its own for the most efficient way to send the packet to its destination. The internet, as we know today, is not possible without numerous routers facilitating the requests.

## routing table

A routing table is a list of known network IP address ranges, and every machine connected to an internet has a routing table to reference. Machines use routing tables to determine what the next [hop](#hop) should be when they're sending [packets](#packets-aka-ip-packets) towards a destination IP address. If the routing table does not have a matching route for the destination IP address, the request can be sent out the default gateway in the hopes that another machine on that internet will know how to get the packets to their destination. Check [prefixes-and-subnet-masks.md in the appendix](../appendix/prefixes-and-subnet-masks.md) for more details on how routing tables work.

## service

A process on a server which responds to requests. E.g. a website, API, DNS, TLS terminator, ssh, etc.

## server

A server is any machine whose purpose is to serve a network request to a client. If the server fails to serve the request, it can return an appropriate error back to the client.
