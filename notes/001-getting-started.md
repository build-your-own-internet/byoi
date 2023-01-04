TODO: modify all /bin/sh to /bin/bash

# Getting Started

## Running your docker container

We got this magic Dockerfile that gets everything set up! Neat! To run it,

1. `docker build .`
1. Grab the image ID from the output and assign that ID to an environment variable (i.e. `export DOCKER_IMAGE=<image_id>`)
1. set two new environment variables for our container names: `export CONTAINER_1=pippin` and `export CONTAINER_2=boudi`
1. `docker run -d --cap-add=NET_ADMIN --name=$CONTAINER_1 $DOCKER_IMAGE`
1. `docker run -d --cap-add=NET_ADMIN --name=$CONTAINER_2 $DOCKER_IMAGE`

We will be using these env variables throughout the rest of this document

> NOTE: What is this `--cap-add=NET_ADMIN` all about, you ask? Check the "Problem Solving" section at the bottom for more information! Also see [this stackOverflow article](https://stackoverflow.com/questions/27708376/why-am-i-getting-an-rtnetlink-operation-not-permitted-when-using-pipework-with-d) for more details.

## Simple Network

What is a network?
2 or more machines that can communicate directly with each other over a physical medium (think actual wires or actual radio signals).

What is an internetwork?
2 or more hosts on different networks that can communicate with each other. There are special devices (routers) that are used to fascilitate communication between each host.

### Create a new network

Building our initial network using [docker's bridge network](https://docs.docker.com/network/bridge/):

```bash
export NETWORK_NAME=squasheeba
docker network create $NETWORK_NAME
```

### Move our two containers from the default bridge to our network

Sooooo, it turns out, when you create a new docker container, it is automatically assigned to a default bridge network. Neat! Except, that's not what we want for this project. First thing! Let's disconnect that shit from the default bridge network. We're gonna use some docker commands:

#### Find the network ID of your default bridge network

command: `docker network ls`

```bash
NETWORK ID     NAME           DRIVER    SCOPE
25e6144d0a17   bridge         bridge    local                    <===== this one looks like the default, let's make sure it's the correct one!
ec4b573914fe   host           host      local
cac4377cf367   none           null      local
2e7d94c63310   squasheeba     bridge    local
```

```bash
export DEFAULT_BRIDGE=25e6144d0a17
```

#### inspect each container to find network they are connected to

command: `docker inspect $CONTAINER_1 -f "{{json .NetworkSettings.Networks }}" | jq .`

> TODO: modify this to be a `jq` command

```bash
{
  "bridge": {
    "IPAMConfig": {},
    "Links": null,
    "Aliases": [],
    "NetworkID": "25e6144d0a17c40a8b1d2a64289e778bdfeef18ee540974b9038eb34287cee37",                <======= Look at this network ID!
    "EndpointID": "3d9ef1f1b79165f8eebf6a60be93e437fdc750d725ac9fa63e9fc6588f5c2b70",
    "Gateway": "172.17.0.1",
    "IPAddress": "172.17.0.2",
    "IPPrefixLen": 16,
    "IPv6Gateway": "",
    "GlobalIPv6Address": "",
    "GlobalIPv6PrefixLen": 0,
    "MacAddress": "02:42:ac:11:00:02",
    "DriverOpts": {}
  }
}
```

#### disconnect that shit from the default bridge network

```bash
docker network disconnect $DEFAULT_BRIDGE $CONTAINER_1
docker network disconnect $DEFAULT_BRIDGE $CONTAINER_2 
```

Now, we wanna connect our containers to our happy little `squasheeba` bridge network that we are building

#### connect that shit to OUR bridge network

```bash
docker network connect $NETWORK_NAME $CONTAINER_1
docker network connect $NETWORK_NAME $CONTAINER_2
```

you can see the state of our network:

command: `docker network inspect $NETWORK_NAME | jq ".[].Containers"`

```bash
{
  "77fe9c3490c57478ee24af7a2690ad50b982788cea22ad0068196be596384140": {
    "Name": "pippin",
    "EndpointID": "57fefce7ccf959bb61aae6d2e9faa7f30479dd4d98fb6ffa7ed4292128a3e9f0",
    "MacAddress": "02:42:ac:15:00:02",
    "IPv4Address": "172.21.0.2/16",
    "IPv6Address": ""
  },
  "d3c564cacb698f8cfaa310f6d35e18d50b040d2b43a91b850ae883676771f585": {
    "Name": "boudi",
    "EndpointID": "3afb5192f5fb5c6743876fafd8d4d4855627e082f58bfb0403138f16bdfc60e4",
    "MacAddress": "02:42:ac:15:00:03",
    "IPv4Address": "172.21.0.3/16",
    "IPv6Address": ""
  }
}
```

### Interlude: What is going on here so far?

Okay, so we have two containers that we've started up and put onto a new docker-defined network. You'll notice that these containers have IP addresses already (the above `network inspect` command shows them; also, on the bash session with each container, if you type `ip addr`, it will show you the addresses on the machines).

You might be asking yourself: "how did these machines get and IP address?" The answer is, Docker has set up a DHCP server as well as a default-gateway and a DNS server on the network that you asked it to create for you. Since we're trying to do all of these things by hand, we really don't want this.

Actually, it would appear that this busybox machine does not have any DHCP client stuff going for it. What seems to be the most likely situation is that docker itself just contfigured the machine on its own for us without employing the DCHP protocol.

## Set up and test our new containers

We now need to interact with these two containers directly. To do that, you'll want to open two distinct terminal windows: one for each container. Then, in each window, start an interactive session with your container.

1. in window 1, run `docker exec -it $CONTAINER_1 /bin/sh`
1. in window 2, run `docker exec -it $CONTAINER_2 /bin/sh`

### Remove default IP address configuration

Next, configure the network ourselves using the `ip` command on the container. First, we should remove the IP addresses that docker configured on each container. To do that, you'll first need to see what IP address docker configured on each container using the `ip addr` command, as follows:

```bash
/ # ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: tunl0@NONE: <NOARP> mtu 1480 qdisc noop qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0
3: ip6tnl0@NONE: <NOARP> mtu 1452 qdisc noop qlen 1000
    link/tunnel6 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00 brd 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00
27: eth1@if28: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
    link/ether 02:42:ac:13:00:03 brd ff:ff:ff:ff:ff:ff
    inet 172.19.0.3/16 brd 172.19.255.255 scope global eth1
       valid_lft forever preferred_lft forever
```

You can see that on this host, `eth1` is associated with the IP address `172.19.0.3/16`. We can remove this IP address using the `ip addr del` command:

`ip addr del 172.19.0.3 dev eth1`

You'll want to repeat this process on the other container (using `ip addr` to show the IP and `ip addr del` to remove it).

### Add our own IP address configuration

NEXT, let's add IP addresses to each of these containers using the `ip addr add`
command. In this example, we want to use the `10.1.1.0/24` network for these
containers. (NOTE: we are choosing this IP address because the `10.0.0.0/8`
network is one of the networks identified in [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) that is exclusively used for
*private* networking. This means that any IP packet that reaches the internet
with this IP address will be dropped. This is helpful in our tutorial becuase if
our system is misconfigured to route to the Internet, we don't want a
false-positive for ping tests). Therefore on the first container, we use the
command

`ip addr add 10.1.1.3/24 dev eth1`

You'll want to repeat this process on the other container (but in this case the ip address is `10.1.1.2/24`).

### Test the network connection

On the CONTAINER_1 machine, run `tcpdump -n -i eth1`. This will run a program which "sniffs" ethernet frames on the same network interface that we just added the 10.1.1.3 address to. The `-n` flag to `tcpdump` tells that program not to try to resolve hostnames via DNS. The `-i eth1` flag tells `tcpdump` which interface to use.

The initial output of this command should be:

```bash
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

This command should not output anything else until we ping that container, at which time you'll see each packet detected on the eth1 network interface shown on its own line.

Now it's time to verify that the two containers can reach each other, so let's use the `ping` command. On the CONTAINER_2 machine, run:

`ping -c 5 10.1.1.3`

and you should see on CONTAINER_2:

```bash
PING 10.1.1.3 (10.1.1.3) 56(84) bytes of data.
64 bytes from 10.1.1.3: icmp_seq=1 ttl=64 time=0.341 ms
64 bytes from 10.1.1.3: icmp_seq=2 ttl=64 time=0.223 ms
64 bytes from 10.1.1.3: icmp_seq=3 ttl=64 time=0.240 ms
64 bytes from 10.1.1.3: icmp_seq=4 ttl=64 time=0.091 ms
64 bytes from 10.1.1.3: icmp_seq=5 ttl=64 time=0.199 ms

--- 10.1.1.3 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4096ms
rtt min/avg/max/mdev = 0.091/0.218/0.341/0.080 ms
```

And, you should see the following on CONTAINER 1:

```bash
19:52:30.295932 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
19:52:30.296116 ARP, Request who-has 10.1.1.3 tell 10.1.1.2, length 28
19:52:30.297091 ARP, Reply 10.1.1.3 is-at 02:42:ac:16:00:02, length 28
19:52:30.297112 ARP, Reply 10.1.1.2 is-at 02:42:ac:16:00:03, length 28
19:52:24.811978 IP 10.1.1.2 > 10.1.1.3: ICMP echo request, id 5, seq 1, length 64
19:52:24.812031 IP 10.1.1.3 > 10.1.1.2: ICMP echo reply, id 5, seq 1, length 64
19:52:25.820736 IP 10.1.1.2 > 10.1.1.3: ICMP echo request, id 5, seq 2, length 64
19:52:25.820799 IP 10.1.1.3 > 10.1.1.2: ICMP echo reply, id 5, seq 2, length 64
19:52:26.826028 IP 10.1.1.2 > 10.1.1.3: ICMP echo request, id 5, seq 3, length 64
19:52:26.826081 IP 10.1.1.3 > 10.1.1.2: ICMP echo reply, id 5, seq 3, length 64
19:52:27.865467 IP 10.1.1.2 > 10.1.1.3: ICMP echo request, id 5, seq 4, length 64
19:52:27.865502 IP 10.1.1.3 > 10.1.1.2: ICMP echo reply, id 5, seq 4, length 64
19:52:28.887895 IP 10.1.1.2 > 10.1.1.3: ICMP echo request, id 5, seq 5, length 64
19:52:28.887926 IP 10.1.1.3 > 10.1.1.2: ICMP echo reply, id 5, seq 5, length 64
```

### Interlude: how to read tcpdump and ping output

From `CONTAINER_2`, we see some ping output like this:

```bash
64 bytes from 10.1.1.3: icmp_seq=3 ttl=64 time=0.240 ms
```

basically, all you need to know about this is that "ping" is a program that sends packets across the network using a protocol called ICMP (which stands for Internet Control Message Protocol): "echo request" and "echo reply" are two types of ICMP message [read more about them here](https://docs.netapp.com/us-en/e-series-santricity/sm-hardware/what-are-icmp-ping-responses.html). What we see here in this ping message is that it has both sent a packet to the destination, and the destination has replied. The `icmp_seq=3` designation marks each individual request/response pair. If the ping did not go through, you might see various error messages, but the most common is that the `ping` command replies with `Request timeout for icmp_seq 0` type messages.

On the container that is being pinged (`CONTAINER_1`), we see quite a bit more information from tcpdump. First, we see a series of messages that have `ARP` in them. ARP is a protocol that you can learn all about on the internet, but here is [a link](https://www.fortinet.com/resources/cyberglossary/what-is-arp). Basically, it allows a machine that is connected locally on one network to talk to another machine that is also connected to that same network (as opposed to a machine that wants to communicate over multiple networks).

We then, after seeing the ARP packets go back and forth (which establish the ability for those two containers to talk to each other on the local network), we see the ICMP echo-request and echo-reply packets go back and forth.

## Automate that shit!

At this point, there are a whole bunch of manual steps to get all this going. Now that we have proven to ourselves that we know how to do this all manually, let's automate it! We have a whole bunch more containers to bring up and networks to build, and doing that all by hand will be a lot of toil.

We are going to use the `docker compose` command which uses the `docker-compose.yml` file in this repository to build, configure, and start our two containers on our network.

You will use the following command: `docker compose up -d` (the `-d` flag tells docker compose that you want to continue using your terminal. When you're done with this session, you'll want to run `docker compose stop` in the same directory as the `docker-compose.yml` file.

There are a few differences with the system that docker creates using `docker compose` as compared to when we did this manually:

- the network it creates has the same name as the directory you ran this from - with the network name as defined in the `docker-compose.yml` file (i.e. `squasheeba`) appended to it (so, in our case, `build-your-own-internet_squasheeba`).
- Similarly, each container has that same label prepended to it (e.g. `build-your-own-internet-pippin-1`).
- Docker has added a router in this network which connects both of these containers to the Internet. That router has the IP address of `10.1.1.1`. Each container also has a default-gateway pointed to that IP address which enables you to run a command like `ping 4.2.2.2`, which will successfully ping a DNS machine on the internet.

Now you can repeat the tests we did above by connecting to each container (this time with commands `docker exec -it build-your-own-internet-boudi-1 /bin/bash` and `docker exec -it build-your-own-internet-pippin-1 /bin/bash`) and run the same tcpdump and ping commands as earlier with the same results.

## Appendix: Problem solving

tl;dr We initially could not edit our IP addresses for the containers within the network. The solution for the problem was adding the permission `--cap-add=NET_ADMIN` when running `docker run` to allow us to be able to edit them.

It doesn't seem like it's possible to manually configure the IP address settings for a container. For example,

```bash
/ # ip addr add 10.1.1.3/24 dev eth1
ip: RTNETLINK answers: Operation not permitted
```

☝️ it's not possible to add an IP address to a running machine. Similarly, `ip addr del` also fails with an `Operation not permitted` error.

- it seems that we can't modify our IP addresses. Maybe that's okay, but we WILL need to be able to modify the routing table at the very minimum. It would appear that this is also currently NOT allowed by the version of docker we're running.
- Is this a licensing issue with docker?
- Is this an issue with the busybox image?
- Is this an issue with docker in general, and if so what other virtualization platforms might we look at instead?

## TODOs

* WE LEFT OFF HERE!

0. Use `dumb-init` instead of our weird sleep hack in our Dockerfile

## Next session/branch

1. Set up routing tables

## Pre-requisites

- understand a little bit about docker (Course link)
- understand a little bit about terminals and environment variables (course link)
- optional: understand how `jq` works (if you feel motivated)
- get some software installed
  - docker desktop for mac™ (hopefully something else)
  - `jq` by whatever means necessary
