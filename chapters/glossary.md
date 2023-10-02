# Glossary

You might run into terms that you don't know the definition to. Sometimes they are properly defined when they are first used, and sometimes they are not. Maybe you put this text down for a while and can't remember if we ever talked about it. Either way, we will do our best to define terms here!

## client

A client is any host that initiates a connection/request to a server on the network or the larger internetwork. A common example is a browser or curl request to a web resource. In future chapters, we might explore how clients are protected by the network either via firewall or through other means but this definition is sufficient for our current use case.

## container

A container is a virtual machine, typically (but not necessarily) being run and managed by Docker. A container, being a virtual machine, will also have virtual network interfaces.

## docker

Docker is a piece of software that runs and manages containers. It also creates virtual networking environments and will often try to butt in and do more network interference than you want it to.

## host

A "host" is a machine that does not route packets. There are to sub-types of hosts: `clients`, which only originate requests on a network, and `servers` which only respond to network requests on a network.

## interface

`interface` (or, more properly said, `network interface`): This is (typically) an ethernet port on a machine which allows it to send packets on an ethernet network. In a Docker environment, this interface is virtual, and not physical. Outside of docker, this interface will be connected to a physical wire or radio (WiFi) signal. In more exotic networking environments (such as a data-center), you may even see network interfaces other than Ethernet. Also, it's possible for a machine to have more than one interface, but that's uncommon (and typical only of routers).

## internet (or internetwork)

An internetwork is a set of networks joined together by routers so that machines can communicate across those networks to one other.

## machine

A machine is any computer that (at least for the purpose of this document) is more-or-less permanently attached to a network and does not move around from one network to another. Could be a host or a router.

## network

A "network" is a slightly overloaded term. Strictly speaking, a network consists of a set of machines that are all directly connected to one another through a common physical medium. The most common network medium is Ethernet. So if two machines are on the same network, they should be able to communicate directly with one another using Ethernet packets (or "frames").

Typically a network will have a "network address" which (if we're using version 4 of IP), will be four numbers separated by dots with a slash and another number (e.g. 10.1.1.0/24).

Sometimes when people use the term "network," they mean "internetwork." Since "internetwork" is a lot of syllables, it's a lot easier to just shorten the word.

## router (also known as a `gateway`)

A router is any machine whose purpose is to connect networks together. It does so by forwarding packets further toward their destination. Each router has a routing table which serves much like a sign post on a highway: it tells the router where to send packets next on their way to their final destination. Each router makes decisions on its own for the most efficient way to send the packet to its destination. The internet, as we know today, is not possible without numerous routers facilitating the requests.

## server

A server is any machine whose purpose is to serve a network request to a client. If the server fails to serve the request, it can return an appropriate error back to the client.