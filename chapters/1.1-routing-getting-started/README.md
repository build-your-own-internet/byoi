# Getting Started

What needs to happen for 2 machines to communicate? First, the machines need some medium to transmit their messages over. This will usually be a cable or wire. Think about the cable connected to your modem. That cable runs between your house and some entrypoint into your Internet Service Provider. Once the cable is setup, the machines will then need to know how to send messages to each other. When 2 or more machines can communicate directly with each other, they are on what we call a 'network'. 

## Goals for this section

We want to build a simple network where two machines can "ping" each other. A "ping" is the simplest unit of message between 2 computers. Think of it like a simple "hey! are you there?" between machines.

So, we'll start with 2 machines that have a wire connecting them, but they don't know how to talk to each other yet. Then, we'll teach them how they can communicate across that wire! This will establish our network for these 2 machines!

## Understanding the Network

We want to introduce a diagram of what this network will look like by the end of this chapter. You may have never seen a network diagram before. That's cool! Take a moment to read through the [appendix on How to Read a Network Map][appendix netmap]!.

Here's what we expect our network to look like by the end of this chapter:

[![Basic Network Map][basic network map]][basic network map]

In this diagram, there are 2 machines, `client` and `server`. These machines are on a single network, `10.1.1.0/24`. What do those numbers mean? If you've ever seen an IP address before, the beginning of that block might look a little familiar. This is what's called a network address. To understand more about network addresses, check out the [appendix entry on Prefixes and Subnet Masks][appendix prefixes]. For the purposes of this chapter, it will suffice to understand that this network can have a number of machines on it, but each machine must have its own IP address in the range from `10.1.1.0` through `10.1.1.254`. Looking at that diagram, we see that there's a `.1` noted next to the `client` machine. This indicates that `client` has the IP address `10.1.1.1`. Similarly, `server` has a `.2` next to it in the image, therefore, `server` has the IP address `10.1.1.2`.

## Build a Network

To start with, we'll need to get our `client` and `server` up and running. You could go out and buy $100s of client and server hardware if you want, but... we're a fan of doing this on the cheap. Instead, for each of these chapters, we'll be building our toy internets using [virtual machines][glossary virtual-machine]. So, we'll need to boot up a set of virtual machines and then connect them together with virtual wires. Fortunately, we created a script that will boot any and all machines you need for each chapter and attach the virtual cables between them. To get started, in the chapter's directory, simply run `byoi-rebuild` in your terminal:

[![Terminal Showing Rebuild][terminal showing rebuild]][terminal showing rebuild]

### Check the current state

Now that we've got some machines up and running, let's network them together! To start with, let's just verify that `client` and `server` can't already talk to each other. We can check this by running a very simple program called [`ping`][ref ping]. 

Think of `ping` the way you might "ping" a friend in real life. It's just a text that says, "Hey! 👋" — and your friend would likely respond with something like, "What's up?". That's it! It's just two machines saying hello to each other. Much like your text-message ping, we have to give it an address. For the `ping` command, give it the IP address of the other computer.

To try this out, then, we need to get terminal sessions running on both `client` and `server`. 

#### Starting machines and connecting to them

When you start a virtual machine, like `client` and `server` in this chapter, it’s like booting up another computer *inside* your computer. To access it, you usually open a terminal (command line) and connect to that virtual computer. When you do this, your terminal session switches — you’re no longer typing commands on your **real** computer. Instead, you’re typing commands inside the virtual machine. The commands you type there will not impact your real computer.

The way you can connect to the virtual machines for each of these chapters is the `hopon` command. E.G.: `hopon client`. `hopon` is a Build Your Own Internet command that we wrote to make it easy for you participate in these chapters. Running this command will result in opening an interactive terminal session on the `client` virtual machine. 

So now, use two windows in your terminal and `hopon client` in one session, and `hopon server` in the other. In the `client` session, run your `ping` command to `server` using its IP address, `10.1.1.2`:

```bash
$ hopon client
root@client:/# ping 10.1.1.2
ping: connect: Network is unreachable
```

Perfect! we were expecting `ping` to fail. Fortunately, we get an error message that tells us what's happening: `Network is unreachable`. This means that `client` doesn't know how to send messages to the network (e.g. `10.1.1.0/24`) that the `ping` is attempting to reach. We need to configure each machine's IP address and network.

We can see the IP addresses and networks that a computer is attached to by running the [`ip address`][ref ip addr] command (`ip addr` for short):

``` bash
root@client:/# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
11: eth0@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:12:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

There's a lot going on here, and we'll get more familiar with this output in future chapters. But, for now, what we're seeing is 2 network [interfaces][glossary interface] on `client`: one for "loopback", `lo`, which is used when a computer wants to send messages to itself. The other interface, `eth0` shows us that `client` has an Ethernet interface with no IP address attached to it.

### Add our own IP address configuration

Let's add IP addresses to each of these machines using the `ip addr add` command. In this exercise, we want to use the `10.1.1.0/24` network. Therefore on `client`, we use the command:

```bash
root@client:/# ip addr add 10.1.1.1/24 dev eth0
```

You'll want to repeat this process on `server`, but instead use the ip address `10.1.1.2/24`.

### Test the network connection

Here, we're going to start exploring with a networking tool called [`tcpdump`][ref tcpdump]. 
When computers are sending messages back and forth to each other, `tcpdump` gives us a way to inspect those messages as they pass to and from the network.

What we'll end up running on `server` is:

```bash
root@server:/# tcpdump -ni eth0
```

> 📝 **NOTE**: the `-ni` here is something you're going to see a lot of when running command-line tools. they're called "flags". You can often see what flags are available for any given command-line tool with the `--help` flag. In general, we're not going to explain all of these flags in these chapters unless it's particularly relevant to the topic.

In this case, the interesting flag here is: `-i eth0`, which tells `tcpdump` which network interface to use (the ethernet interface and not the loopback interface).

The initial output of this command should be:

```bash
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

This command will now sit and run, waiting for network traffic to come in over the `eth0` interface. Once it sees traffic, it will print to the terminal what it's seeing on the network. You may not see anything else until you run the `ping` from `client`.

Now it's time to verify that the two machines can reach each other, so let's use the `ping` command. On `client`, run:

```bash
root@client:/# ping -c 5 10.1.1.2
```

and you should see on `client`:

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

And, you should see some variation on the following on `server` (the packets may be in a different order, so you may see the ARP requests later in the dump):

```bash
19:52:30.295932 ARP, Request who-has 10.1.1.2 tell 10.1.1.1, length 28
19:52:30.296116 ARP, Request who-has 10.1.1.1 tell 10.1.1.2, length 28
19:52:30.297091 ARP, Reply 10.1.1.1 is-at 02:42:ac:16:00:02, length 28
19:52:30.297112 ARP, Reply 10.1.1.2 is-at 02:42:ac:16:00:03, length 28
19:52:24.811978 IP 10.1.1.1 > 10.1.1.2: ICMP echo request, id 5, seq 1, length 64
19:52:24.812031 IP 10.1.1.2 > 10.1.1.1: ICMP echo reply, id 5, seq 1, length 64
19:52:25.820736 IP 10.1.1.1 > 10.1.1.2: ICMP echo request, id 5, seq 2, length 64
19:52:25.820799 IP 10.1.1.2 > 10.1.1.1: ICMP echo reply, id 5, seq 2, length 64
19:52:26.826028 IP 10.1.1.1 > 10.1.1.2: ICMP echo request, id 5, seq 3, length 64
19:52:26.826081 IP 10.1.1.2 > 10.1.1.1: ICMP echo reply, id 5, seq 3, length 64
19:52:27.865467 IP 10.1.1.1 > 10.1.1.2: ICMP echo request, id 5, seq 4, length 64
19:52:27.865502 IP 10.1.1.2 > 10.1.1.1: ICMP echo reply, id 5, seq 4, length 64
19:52:28.887895 IP 10.1.1.1 > 10.1.1.2: ICMP echo request, id 5, seq 5, length 64
19:52:28.887926 IP 10.1.1.2 > 10.1.1.1: ICMP echo reply, id 5, seq 5, length 64
```

### Understanding `tcpdump` and `ping` output

Earlier we introduced `ping` as a simple text message between computers. Let's spend a moment to get a little more technical with how `ping` actually works. Basically, `ping` is a program that sends packets across the network using a [protocol](../glossary.md#protocol) called ICMP, which stands for Internet Control Message Protocol. `echo request` and `echo reply` are two types of ICMP message. You can read more about them [here](https://docs.netapp.com/us-en/e-series-santricity/sm-hardware/what-are-icmp-ping-responses.html) if you want to know more.

`ping` starts by sending an "Echo Request" message to the destination machine. If that machine receives a response ("Echo reply") back, then we see a line of output from the `ping` command which gives some useful information about that interaction. That output will look something like what we saw above, for example:

```bash
64 bytes from 10.1.1.2: icmp_seq=3 ttl=64 time=0.240 ms
```

The `icmp_seq` designation marks each individual request/response pair. `time` tells us exactly how much time elapsed between sending and receiving the response (in this case, less than a millisecond). The `ttl` value is something that gets involved when we start investigating large networks which we will come back to in a future chapter.

If the `ping` did **not** go through, you might see various error messages, but the most common is that the `ping` command errors out with `Request timeout for icmp_seq 0` type messages. 

On the other side of the connection, `server`'s `tcpdump` has much more going on! First, we see a series of messages that have `ARP` in them:

```bash
19:52:30.295932 ARP, Request who-has 10.1.1.2 tell 10.1.1.1, length 28
19:52:30.296116 ARP, Request who-has 10.1.1.1 tell 10.1.1.2, length 28
19:52:30.297091 ARP, Reply 10.1.1.1 is-at 02:42:ac:16:00:02, length 28
19:52:30.297112 ARP, Reply 10.1.1.2 is-at 02:42:ac:16:00:03, length 28
```

ARP, which stands for Address Resolution Protocol, allows two machines on the same network to know where to send messages to each other. ARP is a way for a computer to find the physical location of another device on the same network when it only knows its IP address. It does this by asking, “Who has this IP?” and the device with that address replies with its location. Without ARP, devices couldn’t actually deliver data to each other on a local network even if they knew each other’s IP addresses.

To learn more about ARP, check out the [prefixes and subnet masks appendix][appendix prefixes].

After seeing the ARP packets go back and forth, we next see the ICMP `echo request` and `echo reply` packets go back and forth in our `tcpdump` output:

```bash
19:52:24.811978 IP 10.1.1.2 > 10.1.1.1: ICMP echo request, id 5, seq 1, length 64
19:52:24.812031 IP 10.1.1.1 > 10.1.1.2: ICMP echo reply, id 5, seq 1, length 64
```

## Closing

We did it! We got two machines to talk to each other! Here are the basic concepts we learned:

1. What IP addresses and network addresses are for
2. How to configure IP addressing for two machines on the same network
3. What ARP does
4. How `ping` works
5. How to use `tcpdump`

At this point, if you had two machines at home with an ethernet cable connecting them, you should be able to use these tools to get them to establish basic network communications with each other. 

## Exercises

Now that you know how this works, let's struggle through some similar activities and see if you can interpret what is happening in each case.

### Ping `10.1.1.12`

From the `client` machine, run:

```bash
root@client:/# ping -c 5 10.1.1.12
```

What do you see in the output from this command? What do you see in the output from the `tcpdump` command that is running on `server`?

Take a moment and think about what might be happening here. It's okay if you don't understand yet.

### Add another IP address on the same subnet to one of the machines and try pinging that

In this chapter you learned how to set a new ethernet interface on a machine. Go back and review the commands for this chapter. 

Let's add the IP address that was failing on the previous exercise to the `server` machine.

```bash
root@server:/# ip addr add 10.1.1.12/24 dev eth0
```

Now if you run the `ping` command from the previous exercise, you should see a successful response!

### Pinging `100.100.100.100` from `client`

This is very similar to the first exercise, except this time you're pinging a much different IP address:

```bash
root@client:/# ping -c 5 100.100.100.100
```

Notice that there is one major difference in the output of the `tcpdump` command on the `server` machine between this exercise and the first exercise. Can you find it?

Take a moment and think about what this means.

### Add `100.100.100.100` to the `server` machine

Okay, we've been successful in solving this problem in the past, let's try to fix this the same way we did before. Let's just add `100.100.100.100` to the `server` machine:

```bash
root@server:/# ip addr add 100.100.100.100/24 dev eth0
```

And try pinging `100.100.100.100` from `client`. You will find that it still does not work.

Why is that?

Well, if you noticed in the previous exercise, the missing output from the `tcpdump` command was that the `server` machine **no longer saw ARP requests**. That is because 

## Troubleshooting

<!-- Links, reference style, inside docset -->

[basic network map]:        ../../img/network-maps/basic-network-map.svg
[terminal showing rebuild]: ../../img/terminal.png
[appendix netmap]:          ../../appendix/how-to-read-a-network-map.md
[appendix prefixes]:        ../../appendix/prefixes-and-subnet-masks.md
[ref ip addr]:              ../command-reference-guide.md#ip-addr
[ref ping]:                 ../command-reference-guide.md#ping
[ref tcpdump]:              ../command-reference-guide.md#tcpdump
[glossary interface]:       ../glossary.md#interface
[glossary virtual-machine]: ../glossary.md#virtual-machine

<!-- Links, reference style, to external resources -->
[ext icmp responses]:        https://docs.netapp.com/us-en/e-series-santricity/sm-hardware/what-are-icmp-ping-responses.html
[RFC 1918]:                  https://www.rfc-editor.org/rfc/rfc1918
                             "RFC 1918"
[stackoverflow rtnetlink]:   https://stackoverflow.com/questions/27708376/why-am-i-getting-an-rtnetlink-operation-not-permitted-when-using-pipework-with-d
                             "Stackoverflow post on RTNETLINK and Docker"
<!-- end of file -->
