# Getting Started

## Goals for this section

We want to build a simple network where two machines can ping each other. To keep this simple and remote pairing friendly, we want to use docker containers to simulate machines on this network. We will use some simple common networking tools to understand the shape of our network and how and when successful communication is occurring.

Here's what we expect our network to look like by the end of this chapter:

```
   boudi             pippin
     │10.1.1.3          │10.1.1.2
     │                  │
     │                  │
─────┴──────────────────┴──────
              (squasheeba 10.1.1.0/24)
```

## Vocabulary

- `container`: a running instance of a docker image. Each container we create will be one machine on that internet.
- `machine`: any computer. Could be a server, a router, a client...
- `gateway`: a `machine` on the internet that has the ability to route.
- `host`: a `machine` on the internet that does NOT have any routing capabilities.

## Running your docker container

We got this magic [Dockerfile](Dockerfile) that gets everything set up! Neat! Without going into too much detail, our Dockerfile builds our docker image on top of the specified OS (ubuntu), installs a bunch of networking software, and then copies in a script called `start-up.sh`. Because Docker containers only stay alive for as long as it takes to process whatever commands are given to it, we're using our `start-up.sh` script to tell our Docker container to `start-up` in the background so we can pop in and out of them as we please.

To start with, we want to create 2 containers. We can use the same Docker image to generate both containers. To make it easy to differentiate between the containers, we're going to give them names. To do so:

1. `docker build .`
1. Grab the image ID (the jumble of letters and numbers following `writing image sha256:`) from the output and assign that ID to an environment variable (i.e. `export DOCKER_IMAGE=<image_id>`)
1. `docker run -d --cap-add=NET_ADMIN --name=pippin $DOCKER_IMAGE`
1. `docker run -d --cap-add=NET_ADMIN --name=boudi $DOCKER_IMAGE`

>**NOTE:**
> What is this `--cap-add=NET_ADMIN` all about, you ask? Check the "Problem Solving" section at the bottom for more information! Also see [this Stack Overflow post](https://stackoverflow.com/questions/27708376/why-am-i-getting-an-rtnetlink-operation-not-permitted-when-using-pipework-with-d) for more details.

## Simple Network

> What is a network?

2 or more machines that can communicate directly with each other over a physical medium (think actual wires or actual radio signals).

> What is an internetwork?

2 or more machines on different networks that can communicate with each other. There are special devices (routers) that are used to fascilitate communication between each machine.

### Wait... There's a default network?

When we initially started exploring building out our network, we were surprised to see that we could already `ping` between our containers. But that's not what we want. Instead, we want the experience of manually building out the network.  Part of this is teaching the hosts on the network how to reach each other. We don't want our hosts to be able to `ping` each other!

Sooooo, it turns out, when you create a new docker container, it is automatically assigned to a default bridge network. The first thing we need to do is disconnect our containers from the default bridge network. We're gonna use some docker commands.

_SUGGESTION_: Finish this chapter and learn about our discovery process. Then, clear out all the docker images and containers. Start this chapter over and see if you can use the tools we employed in this chapter to discover how we saw the containers networked together.

#### Find the network ID of your default bridge network

command: `docker network ls`

```bash
NETWORK ID     NAME           DRIVER    SCOPE
25e6144d0a17   bridge         bridge    local     <===== this one looks like the default, let's make sure it's the correct one!
ec4b573914fe   host           host      local
cac4377cf367   none           null      local
```

```bash
export DEFAULT_BRIDGE=25e6144d0a17
```

#### Inspect each container to find network they are connected to

command: `docker inspect pippin -f "{{json .NetworkSettings.Networks }}" | jq .`

```bash
{
  "bridge": {
    "IPAMConfig": {},
    "Links": null,
    "Aliases": [],
    "NetworkID": "25e6144d0a17c40a8b1d2a64289e778bdfeef18ee540974b9038eb34287cee37",    <======= Look at this network ID!
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

#### Disconnect that shit from the default bridge network

```bash
docker network disconnect $DEFAULT_BRIDGE pippin
docker network disconnect $DEFAULT_BRIDGE boudi 
```

### Create a new network

Building our initial network using [docker's bridge network](https://docs.docker.com/network/bridge/):

```bash
export NETWORK_NAME=squasheeba
docker network create $NETWORK_NAME
```

Now, we wanna connect our containers to our happy little `squasheeba` bridge network!

#### Connect that shit to OUR bridge network

```bash
docker network connect $NETWORK_NAME pippin
docker network connect $NETWORK_NAME boudi
```

You can see the state of our network:

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

Okay, so we have two containers that we've started up and put onto a new docker-defined network. You'll notice that these containers have IP addresses already. The above `network inspect` command shows them; also, on the bash session with each container, if you run the `ip addr` command, it will show you the addresses on the machines (shown in a few paragraphs).

You might be asking yourself: "how did these machines get an IP address?" The answer is, Docker has set up a DHCP server as well as a default-gateway and a DNS server on the network that you asked it to create for you. Since we're trying to do all of these things by hand, we really don't want this. Let's look at how we can manage these configurations ourselves.

## Set up and test our new containers

We now need to interact with these two containers directly. To do that, we need to open two distinct terminal windows: one for each container. Then, in each window, start an interactive session with your container.

1. in window 1, run `docker exec -it pippin /bin/bash`
1. in window 2, run `docker exec -it boudi /bin/bash`

### Remove default IP address configuration

Next, let's configure the network ourselves using the `ip` command on each container. First, we should remove the IP addresses that docker configured on each container. To do that, we need to see what IP address docker configured on each container using the `ip addr` command, as follows:

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

>**NOTE:**
>`ip addr` is an abbreviation for the actual command, `ip address`

There is a bit of a tradition within networking CLIs to allow users to abbreviate commands (cisco CLIs are famous for this), and the `ip` command carries this forward.

### Add our own IP address configuration

NEXT, let's add IP addresses to each of these containers using the `ip addr add` command. In this example, we want to use the `10.1.1.0/24` network for these containers. _NOTE_: we are choosing this IP address because the `10.0.0.0/8` network is one of the networks identified in [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) that is exclusively used for _private_ networking. This means that any IP packet that reaches the internet with this IP address will be dropped. This is helpful in our tutorial because if our system is misconfigured to route to the Internet, we don't want a false-positive for ping tests. Therefore on the first container, we use the command

`ip addr add 10.1.1.3/24 dev eth1`

You'll want to repeat this process on the other container (but in this case the ip address is `10.1.1.2/24`).

### Test the network connection

On the `pippin` machine, run `tcpdump -ni eth1`. This will run a program which "sniffs" ethernet frames on the same network interface that we just added the 10.1.1.3 address to. The `-n` flag to `tcpdump` tells that program not to try to resolve hostnames via DNS. The `-i eth1` flag tells `tcpdump` which network interface to use.

The initial output of this command should be:

```bash
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

This command should not output anything else until we ping that container, at which time you'll see each packet detected on the eth1 network interface shown on its own line.

Now it's time to verify that the two containers can reach each other, so let's use the `ping` command. On the boudi machine, run:

`ping -c 5 10.1.1.3`

and you should see on boudi:

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

And, you should see the following on pippin:

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

From `boudi`, we see some ping output like this:

```bash
64 bytes from 10.1.1.3: icmp_seq=3 ttl=64 time=0.240 ms
```

Basically, all you need to know about this is that `ping` is a program that sends packets across the network using a protocol called ICMP, which stands for Internet Control Message Protocol. `echo request` and `echo reply` are two types of ICMP message. You can read more about them [here](https://docs.netapp.com/us-en/e-series-santricity/sm-hardware/what-are-icmp-ping-responses.html) if you want to know more. What we see here in this ping message is that it has both sent a packet to the destination (echo request), and the destination has replied (echo reply). The `icmp_seq=3` designation marks each individual request/response pair. If the ping did not go through, you might see various error messages, but the most common is that the `ping` command replies with `Request timeout for icmp_seq 0` type messages.

On the container that is being pinged (pippin), we see quite a bit more information from tcpdump. First, we see a series of messages that have `ARP` in them. ARP, which stands for Address Resolution Protoco,  is a protocol that allows a machine that is connected locally on one network to talk to another machine that is also connected to that same network (as opposed to a machine that wants to communicate over multiple networks). We will talk about this crucial protocol more over the coming chapters, but you can get a head start learning about ARP [here](https://www.fortinet.com/resources/cyberglossary/what-is-arp) if you are interested in diving deeper.

After seeing the ARP packets go back and forth (which establish the ability for those two containers to talk to each other on the local network), we see the ICMP echo-request and echo-reply packets go back and forth in our `tcpdump` output.

## Automate that shit

At this point, there are a whole bunch of manual steps to get all this going.  Now that we have proven to ourselves that we know how to do this all manually, let's automate it! We have more containers to bring up and networks to build, and doing that all by hand will be a lot of toil.

We are going to use the `docker compose` command which uses the `docker-compose.yml` file in this directory to build, configure, and start our two containers on our network.

You will use the following command:

`docker compose up -d`

The `-d` flag tells docker compose that you want to continue using your terminal. When you're done with this session, you'll want to run `docker compose stop` in the same directory as the `docker-compose.yml` file.

There are a few differences with the system that docker creates using `docker compose` as compared to when we did this manually:

- the network it creates has the same name as the directory you ran this from - with the network name as defined in the `docker-compose.yml` file (i.e. `squasheeba`) appended to it (so, in our case, `build-your-own-internet_squasheeba`).
- Similarly, each container has that same label prepended to it (e.g. `build-your-own-internet-pippin-1`).
- Docker has added a router in this network which connects both of these containers to the Internet. That router has the IP address of `10.1.1.1`. Each container also has a default-gateway pointed to that IP address which enables you to run a command like `ping 4.2.2.2`, which will successfully ping a DNS machine on the internet.

Now you can repeat the tests we did above by connecting to each container (this time with commands `docker exec -it build-your-own-internet-boudi-1 /bin/bash` and `docker exec -it build-your-own-internet-pippin-1 /bin/bash`) and run the same tcpdump and ping commands as earlier with the same results.

## Aside: Troubleshooting

### Weird container errors?

Sometimes, when experimenting with our containers and trying new things with our images, we don't get the results we expect. Rather than putting together a course on troubleshooting docker, here's a few CTRL + ALT + DEL options to try to just nuke the current setup and start over:

_Kill All Containers_

```
docker container ls
```

Grab the container ID for each container and run

```
docker container kill <container_id>
```

_Kill All Networks_

```
docker network prune
```

_Clean Sweep The System_

```
docker system prune
```

### Cannot edit IP addresses?

tl;dr We initially could not edit our IP addresses for the containers within the network. The solution for the problem was adding the permission `--cap-add=NET_ADMIN` when running `docker run` to get docker to allow us to be able to edit them.

It doesn't seem like it's possible to manually configure the IP address settings for a container. For example,

```bash
/ # ip addr add 10.1.1.3/24 dev eth1
ip: RTNETLINK answers: Operation not permitted
```

☝️ it's not possible to add an IP address to a running machine. Similarly, `ip addr del` also fails with an `Operation not permitted` error.
