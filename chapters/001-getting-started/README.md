# Getting Started

## Goals for this section

We want to build a simple network where two machines can ping each other. To keep this simple and remote pairing friendly, we want to use docker containers to simulate machines on this network. We will use some simple common networking tools to understand the shape of our network and how and when successful communication is occurring.

Here's what we expect our network to look like by the end of this chapter:

```markdown
   boudi             pippin
     │10.1.1.3          │10.1.1.2
     │                  │
     │                  │
─────┴──────────────────┴──────
              (squasheeba 10.1.1.0/24)
```

In this diagram, there are 2 machines, `boudi` and `pippin`, who are a single network, `squasheeba`. The network range for squasheeba is `10.1.1.0/24`, meaning: all IP addresses in the range from `10.1.1.0` through `10.1.1.255` are a part of that network. Any machine on that network will have an IP address that is within that range, so `boudi` has the IP address `10.1.1.3` and `pippin` has the IP address `10.1.1.2`.

## Running your docker container

We got this magic [Dockerfile](Dockerfile) that gets everything set up! Neat! Without going into too much detail, our Dockerfile:

- builds a docker image on top of the specified OS (ubuntu)
- installs a bunch of networking software
- copies the bash script, `start-up.sh`, from this chapter into the docker image

The `start-up.sh` script at this point is just call to run the `sleep` command forever. Why? Docker containers only stay alive for as long as it takes to process whatever commands are given to it. By running `sleep` in the background, we keep the container alive so we can pop in and out of them as we please. We will add more to this script in future chapters to create the exact docker image we need for a functional internetwork.

To start with, we want to create 2 containers. We can use the same Docker image to generate both containers. To make it easy to differentiate between the containers, we're going to name them after my cats, `boudi` and `pippin`... Because what else would you do?

To do so:

1. `docker build .`
1. Grab the image ID (the jumble of letters and numbers following `writing image sha256:`) from the output and assign that ID to an environment variable (i.e. `export DOCKER_IMAGE=<image_id>`)
1. `docker run -d --cap-add=NET_ADMIN --name=pippin $DOCKER_IMAGE`
1. `docker run -d --cap-add=NET_ADMIN --name=boudi $DOCKER_IMAGE`

>**NOTE:**
> What is this `--cap-add=NET_ADMIN` all about, you ask? Check the "Problem Solving" section at the bottom for more information! Also see [this Stack Overflow post](https://stackoverflow.com/questions/27708376/why-am-i-getting-an-rtnetlink-operation-not-permitted-when-using-pipework-with-d) for more details.

## Build a Network

Now that we've got some machines up and running, let's network them together! To start with, let's just verify that `boudi` and `pippin` can't already talk to each other. We can check this by running a very simple program called `ping`. We can provide `ping` with an IP address and it will see if it can send a simple request to the machine at the address provided. If a machine receives the type of request `ping` sends, it will send a response back. We're expecting there to be no response when `boudi` tries to `ping` `pippin`.

### Check the current state

Let's start by hopping onto `pippin`:

```bash
docker exec -it pippin /bin/bash
```

In order for `boudi` to `ping` `pippin`, we'll need to get `pippin`'s IP address. Let's start by seeing what IP address configuration Docker automatically created for `pippin` when it created the machine. There's a very simple command with a lot of confusing output that we can run to get this: `ip addr`.

``` bash
root@3daaaf641c2d:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
858: eth0@if859: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

There's a lot going on here, and we'll get more familiar with this output in future chapters. But, for now, what we're seeing is 2 network [interfaces](../glossary.md#interface) on `pippin`, one for loopback, `lo`, which is used in networking for routing queries back to the machine that made the initial query. The other interface, `eth0` shows us that `pippin` already has an IP address, `172.17.0.2`, on an existing network, `172.17.0.2/16`. The exact address may be different on your machine, but the principles are the same.

Uh oh... Let's hopon `boudi` and see if that machine is on the same network:

```bash
docker exec -it boudi /bin/bash
```

```bash
root@0513ee69aca0:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
860: eth0@if861: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:11:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.3/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

Yup... It looks like `eth0` on `boudi` is defined on the `172.17.0.3/16` network. If we run a `ping` from `boudi` to `pippin` at `172.17.0.2`, we'll see that we're getting response packets:

```bash
root@0513ee69aca0:/# ping 172.17.0.2 -w 2
PING 172.17.0.2 (172.17.0.2) 56(84) bytes of data.
64 bytes from 172.17.0.2: icmp_seq=1 ttl=64 time=0.341 ms
64 bytes from 172.17.0.2: icmp_seq=2 ttl=64 time=0.456 ms

--- 172.17.0.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1048ms
rtt min/avg/max/mdev = 0.341/0.398/0.456/0.057 ms
```

Well that's not what we want! For this chapter, we want the experience of manually building out the network. Part of this is teaching the hosts on the network how to reach each other. We don't want our hosts to be able to `ping` each other without us doing the work to make that happen!

### Cleanup what docker created

Sooooo, it turns out, when you create a new docker container, it is automatically assigned to a default bridge network. The first thing we need to do is disconnect our containers from the default network.

### Remove default IP address configuration

As we just discovered, on `pippin`, `eth0` is associated with the IP address `172.17.0.2/16`. We want to remove this IP address so we can manually configure our network. Let's do that by using the `ip addr del` command. Remember to update the IP address to match what you see returned in your `ip addr` command:

```bash
ip addr del 172.17.0.2/16 dev eth0
```

Now, if we hop onto `boudi` and try to `ping` `pippin`, we'll see that we have 100% packet loss:

```bash
root@0513ee69aca0:/# ping 172.17.0.2 -w 2
PING 172.17.0.2 (172.17.0.2) 56(84) bytes of data.

--- 172.17.0.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1077ms
```

To complete this, go ahead and remove the IP address configuration on `boudi` as well. Once you've removed the current configuration, try running your `ping` to `pippin` again. You should get an error message instead of packet loss:

```bash
root@0513ee69aca0:/# ping 172.17.0.2 -w 2
ping: connect: Network is unreachable
```

As the message indicates, that network is no longer available. `boudi` doesn't know how to send packets out to be able to have a hope of reaching that network, so instead of the packets disappearing into the ether, we get an error message indicating that the network isn't defined in any way `boudi` knows how to reach.

>**NOTE:**
>`ip addr` is an abbreviation for the actual command, `ip address`
> There is a bit of a tradition within networking CLIs to allow users to abbreviate commands (cisco CLIs are famous for this), and the `ip` command carries this forward.

### Add our own IP address configuration

Now that we've removed the default network docker created, let's get started creating a network of our own! Let's add IP addresses to each of these containers using the `ip addr add` command. In this example, we want to use the `10.1.1.0/24` network for these containers. `10.0.0.0/8` is one of the networks identified in [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) that is exclusively used for _private_ networking. This means that any IP packet that reaches the internet with an IP address in this range will be dropped. This is helpful in our tutorial because if our system is misconfigured to route to the Internet, we don't want a false-positive for ping tests. Therefore on `pippin`, we use the command

`ip addr add 10.1.1.2/24 dev eth0`

You'll want to repeat this process on `boudi`, but in this case the ip address is `10.1.1.3/24`.

But wait... why are we ending our addresses with `.2` and `.3`? Why aren't we starting with `.0` or `.1`??? In networking spaces, there are reserved IP addresses that can only be used for specific kinds of machines. Generally speaking, the first address in a network, in our case `10.1.1.0`, is the network address and cannot be used to identify specific machines. Similarly, the last address in a network space is reserved and cannot be used to identify specific machines.

### Test the network connection

Here, we're going to start exploring with a networking tool called `tcpdump`. `tcpdump` "sniffs" ethernet frames on the network interface identified in the command. What we'll end up running on `pippin` is:

```bash
tcpdump -ni eth0
```

Let's take a quick look at the flags used in that command:

- `-n`: tells that program not to try to resolve hostnames via DNS
- `-i eth0`: tells `tcpdump` which network interface to use

The initial output of this command should be:

```bash
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

This command command will sit and run, waiting for network traffic to come in over the `eth0` interface. Once it sees traffic, it will print to the terminal what it's sniffing on the network. You may not see anything else until you run the `ping` from `boudi`.

Now it's time to verify that the two containers can reach each other, so let's use the `ping` command. On `boudi`, run:

`ping -c 5 10.1.1.2`

and you should see on `boudi`:

```bash
PING 10.1.1.2 (10.1.1.2) 56(84) bytes of data.
64 bytes from 10.1.1.2: icmp_seq=1 ttl=64 time=0.341 ms
64 bytes from 10.1.1.2: icmp_seq=2 ttl=64 time=0.223 ms
64 bytes from 10.1.1.2: icmp_seq=3 ttl=64 time=0.240 ms
64 bytes from 10.1.1.2: icmp_seq=4 ttl=64 time=0.091 ms
64 bytes from 10.1.1.2: icmp_seq=5 ttl=64 time=0.199 ms

--- 10.1.1.2 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4096ms
rtt min/avg/max/mdev = 0.091/0.218/0.341/0.080 ms
```

And, you should see some variation on the following on `pippin` (the packets may be in a different order, so you may see the ARP requests later in the dump):

```bash
19:52:30.295932 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
19:52:30.296116 ARP, Request who-has 10.1.1.3 tell 10.1.1.2, length 28
19:52:30.297091 ARP, Reply 10.1.1.3 is-at 02:42:ac:16:00:02, length 28
19:52:30.297112 ARP, Reply 10.1.1.2 is-at 02:42:ac:16:00:03, length 28
19:52:24.811978 IP 10.1.1.3 > 10.1.1.2: ICMP echo request, id 5, seq 1, length 64
19:52:24.812031 IP 10.1.1.2 > 10.1.1.3: ICMP echo reply, id 5, seq 1, length 64
19:52:25.820736 IP 10.1.1.3 > 10.1.1.2: ICMP echo request, id 5, seq 2, length 64
19:52:25.820799 IP 10.1.1.2 > 10.1.1.3: ICMP echo reply, id 5, seq 2, length 64
19:52:26.826028 IP 10.1.1.3 > 10.1.1.2: ICMP echo request, id 5, seq 3, length 64
19:52:26.826081 IP 10.1.1.2 > 10.1.1.3: ICMP echo reply, id 5, seq 3, length 64
19:52:27.865467 IP 10.1.1.3 > 10.1.1.2: ICMP echo request, id 5, seq 4, length 64
19:52:27.865502 IP 10.1.1.2 > 10.1.1.3: ICMP echo reply, id 5, seq 4, length 64
19:52:28.887895 IP 10.1.1.3 > 10.1.1.2: ICMP echo request, id 5, seq 5, length 64
19:52:28.887926 IP 10.1.1.2 > 10.1.1.3: ICMP echo reply, id 5, seq 5, length 64
```

### Understanding tcpdump and ping output

From `boudi`, we see some ping output like this:

```bash
64 bytes from 10.1.1.2: icmp_seq=3 ttl=64 time=0.240 ms
```

Basically, all you need to know about this is that `ping` is a program that sends packets across the network using a protocol called ICMP, which stands for Internet Control Message Protocol. `echo request` and `echo reply` are two types of ICMP message. You can read more about them [here](https://docs.netapp.com/us-en/e-series-santricity/sm-hardware/what-are-icmp-ping-responses.html) if you want to know more. What we see here in this ping message is that it has both sent a packet to the destination (echo request), and the destination has replied (echo reply). The `icmp_seq=3` designation marks each individual request/response pair. If the ping did not go through, you might see various error messages, but the most common is that the `ping` command replies with `Request timeout for icmp_seq 0` type messages.

`pippin`'s tcpdump has much more going on. First, we see a series of messages that have `ARP` in them.

```bash
19:52:30.295932 ARP, Request who-has 10.1.1.2 tell 10.1.1.3, length 28
19:52:30.296116 ARP, Request who-has 10.1.1.3 tell 10.1.1.2, length 28
19:52:30.297091 ARP, Reply 10.1.1.3 is-at 02:42:ac:16:00:02, length 28
19:52:30.297112 ARP, Reply 10.1.1.2 is-at 02:42:ac:16:00:03, length 28
```

ARP, which stands for Address Resolution Protocol,  is a protocol that allows a machine that is connected locally on one network to talk to another machine that is also connected to that same network (as opposed to a machine that wants to communicate over multiple networks). To learn more about ARP, checkout the [prefixes and subnet masks appendix](../appendix/prefixes-and-subnet-masks.md).

After seeing the ARP packets go back and forth (which establish the ability for those two containers to talk to each other on the local network), we see the ICMP echo-request and echo-reply packets go back and forth in our `tcpdump` output.

```bash
19:52:24.811978 IP 10.1.1.2 > 10.1.1.3: ICMP echo request, id 5, seq 1, length 64
19:52:24.812031 IP 10.1.1.3 > 10.1.1.2: ICMP echo reply, id 5, seq 1, length 64
```

## Automate that shit

At this point, there are a whole bunch of manual steps to get all this going.  Now that we have proven to ourselves that we know how to do this all manually, let's automate it! We have more containers to bring up and networks to build, and doing that all by hand will be a lot of toil.

We are going to use the `docker compose` command which uses the [docker-compose.yml](docker-compose.yml) file in this directory to build, configure, and start our two containers on our network.

You will use the following command:

```bash
docker compose up -d
```

The `-d` flag tells docker compose that you want to continue using your terminal. When you're done with this session, you'll want to run `docker compose stop` in the same directory as the [docker-compose.yml](docker-compose.yml) file.

There are a few differences with the system that docker creates using `docker compose` as compared to when we did this manually:

- the network it creates has the same name as the directory you ran this from with the network name as defined in the `docker-compose.yml` file appended to it. So, in this chapter, `001-getting-started_squasheeba`.
- Similarly, each container has that same label prepended to it; e.g. `001-getting-started-pippin-1`.
- Docker has added a router in this network which connects both of these containers to the Internet. That router has the IP address of `10.1.1.1`. Each container also has a default-gateway pointed to that IP address which enables you to run a command like `ping 4.2.2.2`, which will successfully ping a DNS machine on the internet.

Now you can repeat the tests we did above by connecting to each container (this time with commands `docker exec -it 001-getting-started-boudi-1 /bin/bash` and `docker exec -it 001-getting-started-pippin-1 /bin/bash`) and run the same `tcpdump` and `ping` commands as earlier with the same results.

## Aside: Troubleshooting

### Weird container errors?

Sometimes, when experimenting with our containers and trying new things with our images, we don't get the results we expect. Rather than putting together a course on troubleshooting docker, here's a few CTRL + ALT + DEL options to try to just nuke the current setup and start over:

#### Kill All Containers

```bash
docker container ls
```

Grab the container ID for each container and run

```bash
docker container kill <container_id>
```

#### Kill All Networks

```bash
docker network prune
```

#### Clean Sweep The System

```bash
docker system prune
```

### Cannot edit IP addresses?

tl;dr We initially could not edit our IP addresses for the containers within the network:

```bash
/ # ip addr add 10.1.1.3/24 dev eth1
ip: RTNETLINK answers: Operation not permitted
```

The solution for the problem was adding the permission `--cap-add=NET_ADMIN` when running `docker run` to get docker to allow us to be able to edit them.
