# Getting Started

## Running your docker container

We got this magic Dockerfile that gets everything set up! Neat! To run it,

1. `docker build .`
1. Grab the image ID from the output
1. `docker run -d --cap-add=NET_ADMIN <image_id>`

> NOTE: What is this `--cap-add=NET_ADMIN` all about, you ask? Check the "Problem Solving" section at the bottom for more information! Also see [this stackOverflow article](https://stackoverflow.com/questions/27708376/why-am-i-getting-an-rtnetlink-operation-not-permitted-when-using-pipework-with-d) for more details.

1. Grab the container ID from the output
1. `docker exec -it <container_id> /bin/sh`

## Simple Network

What is a network?
2 or more machines that can communicate directly with each other over a physical medium (think actual wires or actual radio signals).

What is an internetwork?
2 or more hosts on different networks that can communicate with each other. There are special devices (routers) that are used to fascilitate communication between each host.

### Create a new network

Building our initial network using [docker's bridge network](https://docs.docker.com/network/bridge/):

```bash
export NETWORK_NAME=sqasheeba
docker network create $NETWORK_NAME
```

### Move our two containers from the default bridge to our network

Sooooo, it turns out, when you create a new docker container, it is automatically assigned to a default bridge network. Neat! Except, that's not what we want for this project. First thing! Let's disconnect that shit from the default bridge network. We're gonna use some docker commands:

#### Find the docker container IDs and create env variables

command: `docker ps`

```bash
CONTAINER ID   IMAGE          COMMAND       CREATED          STATUS          PORTS     NAMES
72e335c56014   fc0281291e4a   "/sleep.sh"   28 minutes ago   Up 28 minutes             youthful_meninsky
5f1f255bf7c1   fc0281291e4a   "/sleep.sh"   28 minutes ago   Up 28 minutes             elastic_pascal
```

set your environment variables for `$CONTAINER_1` and `$CONTAINER_2`

```bash
export CONTAINER_1=72e335c56014
export CONTAINER_2=5f1f255bf7c1
```

We will be using these env variables throughout the rest of this document

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

#### inspect each container to find what network they are connected to

command: `docker inspect $CONTAINER_1 -f "{{json .NetworkSettings.Networks }}" | jq .`

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

Now, we wanna connect our containers to our happy little `squasheeba`   bridge network that we are building

#### connect that shit to OUR bridge network

```bash
docker network connect $NETWORK_NAME $CONTAINER_1
docker network connect $NETWORK_NAME $CONTAINER_2
```

you can see the state of our network with:

command: `docker network inspect $NETWORK_NAME`

```bash
[
    {
        "Name": "sqasheeba",
        "Id": "2e7d94c63310e11a831b13c6eece56b7caa8c0031a8b77f670389e367022ae5d",
        "Created": "2022-12-02T19:45:00.877455616Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "172.27.0.0/16",
                    "Gateway": "172.27.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "5f1f255bf7c1e37289ac11c1da959644ecb157760e9dcc54b7dcd894814656c2": {
                "Name": "elastic_pascal",
                "EndpointID": "12381efd1f7ff548881209f5dc61983ebcdbec34ce8e2ff013574551068f28be",
                "MacAddress": "02:42:ac:1b:00:02",
                "IPv4Address": "172.27.0.2/16",
                "IPv6Address": ""
            },
            "72e335c560145b6f836b31da4c3cc7cf68e7256d9449453ee325132153681c1e": {
                "Name": "youthful_meninsky",
                "EndpointID": "6f68be645ff22924a57238db22fbd77c492cc8759fe46368f384ee30ca997f4a",
                "MacAddress": "02:42:ac:1b:00:03",
                "IPv4Address": "172.27.0.3/16",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {}
    }
]
```

## What is going on here so far?

Okay, so we have two containers that we've started up and put onto a new docker-defined network. You'll notice that these containers have IP addresses already (the above `network inspect` command shows them; also, on the bash session with each container, if you type `ip addr`, it will show you the addresses on the machines).

You might be asking yourself: "how did these machines get and IP address?" The answer is, Docker has set up a DHCP server as well as a default-gateway and a DNS server on the network that you asked it to create for you. Since we're trying to do all of these things by hand, we really don't want this.

Actually, it would appear that this busybox machine does not have any DHCP client stuff going for it. What seems to be the most likely situation is that docker itself just contfigured the machine on its own for us without employing the DCHP protocol.

### Remove default IP address configuration

But, we can configure the network ourselves if we want to using the `ip` command on the system. First, we should remove the IP addresses that docker configured on each container. To do that, you'll first need to see what IP address docker configured on each container using the `ip addr` command, as follows:

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

`ip addr add 10.1.1.1/24 dev eth1`

You'll want to repeat this process on the other container (but in this case the ip address is `10.1.1.2/24`).

### Test the network connection

Now it's time to verify that the two containers can reach each other, so let's use the `ping` command. On the container with the ip address of `10.1.1.1`, use:

`ping 10.1.1.2`

and you should see:

```bash

```

## Problem solving:

It doesn't seem like it's possible to manually configure the IP address settings for a container. For example,

```bash
/ # ip addr add 10.1.1.1/24 dev eth1
ip: RTNETLINK answers: Operation not permitted
```

☝️ it's not possible to add an IP address to a running machine. Similarly, `ip addr del` also fails with an `Operation not permitted` error.

- it seems that we can't modify our IP addresses. Maybe that's okay, but we WILL need to be able to modify the routing table at the very minimum. It would appear that this is also currently NOT allowed by the version of docker we're running.
- Is this a licensing issue with docker?
- Is this an issue with the busybox image?
- Is this an issue with docker in general, and if so what other virtualization platforms might we look at instead?

The solution for this was adding the permission `--cap-add=NET_ADMIN` when running `docker run`.

## Next session

1. How can we manually configure our networks? Must we rely on Docker to do everything for us? Maybe that's okay and we shouldn't worry so much about manually configuring the machines.
1. Ping.
1. Make setup automated (docker compose)
1. Set up routing tables
1. Setting up tcpdump
1. Talk about ARP
