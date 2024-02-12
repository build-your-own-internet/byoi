# Name Resolution

## Preface: the shape of our internet

First, let's check out what our little internet looks like:

![our-inter-network](../img/nr-multicast.svg)

The significant things to note about this internet are that we have 2 machines on one network, `host-c` and `host-f` are on `6.0.0.0/8`, and we added a new host, `host-h` to the `4.0.0.0/8` network. `host-h` is only one hop away from `host-c` and `host-f`. This means that requests from `host-h` <=> `host-c` only need to be routed through one router. This simplifies what we're looking at when we are checking what's happening on our internet. We wanted to have a request path that involved one and only one router; adding `host-h` handled that for us.

## Goal

In the last chapter, we kinda cheated... We used our docker-compose.yaml file to insert entries into our `/etc/hosts` file for name resolution. In the real world, we don't have an option to modify the `/etc/hosts` files on every machine on the internet. In this chapter, we've removed those `/etc/hosts` entries, so we're starting back in the same place. What can we do to solve this problem without using our little Docker hack?

Let's start with the simplest thing we can do on our little internet to provide name resolution without using Docker or manually editing `/etc/hosts`. We're gonna head down the route of using a [multicast](../../../chapters/glossary.md#multicast) solution called `avahi`. By the end of this chapter, you should be able to `ping` or use `links` to reach each host on our little internet.

## Avahi and avahi-daemon

Avahi is a program which uses [multicast](../../../chapters/glossary.md#multicast) to perform name resolution on local networks with minimal configuration. If you check the [Dockerfile](./Dockerfile) for this chapter, you'll see that we added a new software, `avahi-utils`. Once you've `restart`ed for this chapter, `hopon` a host and `cat /etc/nsswitch.conf`.

You'll recall, in [chapter 1](../001-nr-getting-started/README.md#how-does-your-computer-know-where-to-go-to-resolve-a-name), we took a look at the contents of `/etc/nsswitch.conf`. We saw that the `hosts` line directed the computer how to resolve a name. It started with looking at the `files` on the system, e.g. `/etc/hosts`, then made a wider internet request on `dns`.

What looks different now? We'll see that `avahi-utils` added a couple new entries into that `hosts` line to direct name resolution requests for itself.

```bash
hosts:          files mdns4_minimal [NOTFOUND=return] dns
```

Let's look at what each of these is doing, a couple of them will be review:

* `files`: Is there an entry for this hostname in a local file? In UNIX based systems that file would be `/etc/hosts`.
* `mdns4_minimal`: can this name be resolved using a multicast resolver? This is specific to resolving hostnames in the local network.
* `[NOTFOUND=return]`: if the hostname matches the TLD for `mdns4_minimal`, e.g. `.local`, but the hostname cannot be resolved, don't send this request out to the open internet. For example, if we requested `host-x.local`, which doesn't exist, don't make an open internet request.
* `dns`: We gotta outsource this request to the larger internet; check the `/etc/resolv.conf` file for where we should send our DNS queries.

>**📝 NOTE:**
> In order to ensure that Docker wasn't trying to help us with name resolution for these chapters, we nerfed the `/etc/resolv.conf` file. Therefore the `dns` entry in `/etc/nsswitch.conf` won't do anything on these hosts.

## Using Multicast to Resolve Names

First, let's check to make sure `avahi-daemon` is already running on our hosts. Go ahead and `hopon host-c` and run `ps -aux` to get a list of processes that are currently running on the host.

```bash
root@host-c:/# ps aux | grep avahi
avahi         14  0.0  0.1   7236  2696 ?        S    18:14   0:00 avahi-daemon: running [host-c.local]
avahi         15  0.0  0.0   7136  1300 ?        S    18:14   0:00 avahi-daemon: chroot helper
root          42  0.0  0.0   3472  1792 pts/0    S+   18:20   0:00 grep --color=auto avahi
```

We can see that the `avahi-daemon` is running. Huzzah! We should be able to use it to perform local name resolution. Let's start by `ping`ing `host-f`:

```bash
root@host-c:/# ping -w2 host-f
ping: host-f: Temporary failure in name resolution
```

Oh no... As you can see, we still have a name resolution failure here. When we check the [Avahi docs](https://avahi.org/), we can see that Avahi responds to the `*.local` hostname. Let's see what happens when we run the same ping, but this time to `host-f.local`:

```bash
root@host-c:/# ping -w2 host-f.local
PING host-f.local (6.0.0.106) 56(84) bytes of data.
64 bytes from 6.0.0.106: icmp_seq=1 ttl=64 time=0.093 ms
64 bytes from 6.0.0.106: icmp_seq=2 ttl=64 time=0.113 ms

--- host-f.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1021ms
rtt min/avg/max/mdev = 0.093/0.103/0.113/0.010 ms
```

Boom! We got a `ping` there! But if we look at the network diagram pictured at the top of this chapter, we can see that `host-c` and `host-f` are on the same network. What happens if we try to `ping host-h`, which is on a different network?

```bash
root@host-c:/# ping -w2 host-h.local
ping: host-h.local: Name or service not known
```

Multicasting by default only works on local networks, in this case machines that can communicate directly with one another via ethernet ([a quick reminder on how ethernet works](../../../appendix/ip-and-mac-addresses.md)). This is because ethernet provides an ability for a machine to broadcast to all other machines on the network.

Avahi uses IP multicast, which gets translated to ethernet broadcast messages. By default, routers ignore these messages, so these messages never get sent to the broader internet. To put this more simply, `host-c` and `host-f` are on the same network, so they can exchange ethernet broadcast messages with each other directly. `host-h`, however, has to be reached through our internet, which requires routers to forward messages to it. It's possible to configure your internet to have multicast messages routed between networks, but that's not a default setting.

## Hacking some Routers

Just like with everything else in technology, there are many options on how we could approach this problem.

<here's where we're gonna do some hacking and add more content about exploring multicast>

**THIS IS WHERE WE STOPPED**

Next documention Steps:
[x] provide a pinch more infor about avahi in the paragraph above.
[x] what is avahi/avahi-daemon? what is multicasting?
[x] add multicast definition in the glossary.
[x] how does avahi work in a local network?
[] hopon on a machine, edit avahi-daemon.conf file, restart avahi-daemon - generally explore that shit (tcpdump, ping, all the tools we already know and love)
[] how do we need to hack things in order to get it to work in our internet?

[] bring in and credit use the wikipedia diagram showing the differences between various "casts" on <https://en.wikipedia.org/wiki/Anycast>

Next exploration steps:
[x] test when avahi modifies nsswitch.conf - is it when we daemonize or when we install? - ANSWER: it modifies nsswitch.conf on install
[x] do we want to start with `avahi-utils` added in the dockerfile (depending on the answer to the previous questoin) - we decided to look at the file in chapetr 1
[] look into what we need to do to configure the routers (peba recommends pim-dense gets installed on all the routers)
.
.

## Aside: Multicast V. Broadcast V. Anycast

.
.
.

## Where we are currently

We started looking at using avahi, added it to the chapter 002 docker file as an apt-get

started the daemon with `avahi-daemon --debug` and got an error:

```bash
dbus_bus_get_private(): Failed to connect to socket /var/run/dbus/system_bus_socket: No such file or directory
```

looked in `/etc/avahi/avahi-daemon.conf` and set `enable-dbus=no`

everything worked for a local setup, i.e. between host-c and host-f

able to ping with a `local` label appended to the hostname on the same network. it appears that the `.local` was unnecessary:

```bash
root@host-c:/# ping host-f
PING host-f (6.0.0.106) 56(84) bytes of data.
64 bytes from build-your-own-internet-host-f.build-your-own-internet-six-net (6.0.0.106): icmp_seq=1 ttl=64 time=0.063 ms
64 bytes from build-your-own-internet-host-f.build-your-own-internet-six-net (6.0.0.106): icmp_seq=2 ttl=64 time=0.061 ms
64 bytes from build-your-own-internet-host-f.build-your-own-internet-six-net (6.0.0.106): icmp_seq=3 ttl=64 time=0.068 ms
64 bytes from build-your-own-internet-host-f.build-your-own-internet-six-net (6.0.0.106): icmp_seq=4 ttl=64 time=0.067 ms
^C
--- host-f ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3051ms
rtt min/avg/max/mdev = 0.061/0.064/0.068/0.003 ms
```

QUESTIONS:

* how is `ping` getting the hostname and network on this output `build-your-own-internet-host-f.build-your-own-internet-six-net`
* how do we change the hostname? what are the `host-name` and `domain-name` fields in the `/etc/avahi/avahi-daemon.conf` file? They don't seem to have impact on name resolution... :shrug:

we need to get the routers in on the joke. this will require teaching the routers how to handle multicast requests

Next Steps

* [x] automatically set `enable-dbus=no` for all configs (start-up.sh)

when checking the behavior of nodes in chapter 002, we saw that `boudi` got the same tcpdump multicast business that we had on our `host-c` and `host-f` in this chapter; ip: `224.0.0.251.5353`. maybe avahi isn't doing any work? and that's why the config file changes aren't having an impact?

boudi could ping pippin with `ping pippin`:

```bash
root@boudi:/# ping pippin
PING pippin (10.1.1.2) 56(84) bytes of data.
64 bytes from build-your-own-internet-002-pippin.build-your-own-internet-002-caternet (10.1.1.2): icmp_seq=1 ttl=64 time=0.227 ms
64 bytes from build-your-own-internet-002-pippin.build-your-own-internet-002-caternet (10.1.1.2): icmp_seq=2 ttl=64 time=0.104 ms
64 bytes from build-your-own-internet-002-pippin.build-your-own-internet-002-caternet (10.1.1.2): icmp_seq=3 ttl=64 time=0.110 ms
64 bytes from build-your-own-internet-002-pippin.build-your-own-internet-002-caternet (10.1.1.2): icmp_seq=4 ttl=64 time=0.121 ms
^C
--- pippin ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3039ms
rtt min/avg/max/mdev = 0.104/0.140/0.227/0.050 ms
```

resolv.conf:

```none
search hsd1.co.comcast.net
nameserver 127.0.0.11
options edns0 trust-ad ndots:0
```

see that `nameserver` there? that's a docker dns server. turn that shit off.

added an `/init/resolv.conf` that we're dumping into the container in the `start-up.sh` script. now docker isn't getting all up in our shit.

now, with `avahi-daemon` running, we can `ping host-{x}.local`.

*next steps:*

[] expand this documentation - include description of how `resolv.conf` file is used and why it needs to be nixed (maybe have the reader do the work of commenting out the `nameserver`)
[] how does the linux box know to go to avahi-daemon for `.local` names
[] how do we get the routers in on the joke
[] verify current operating theory on how this is working

current operating theory on how this is working:

* when we start an avani-daemon on a host it does a multicast announcement
* it also begins to listen for other multicast announcements and records those names.... somewhere
* when a couple avahi-daemons are running on a local network, they will record each other's names
* when you ping anything that ends in `.local` the linux box knows to ask the avahi-daemon for the name resolution

`.local` works because of this line in `/etc/nsswitch.conf`

```none
hosts:          files mdns4_minimal [NOTFOUND=return] dns
```

remove the `mdns4_minimal` and `.local` doesn't resolve any more.

At some point link to [this ChatGPT chat](https://chat.openai.com/share/e00cee99-19db-4997-8c62-1ca2f09f82f3).

=====================

BELOW IS ALL DEFINITELY **NOT** A LIE

==================

> TODO: make sure reader knows that `avahi-daemon` is running on all machines (including routers) and why

Let's see name resolution working across networks. We can test that that's working using our old friend `ping`! The first thing `ping` will have to do is resolve the hostname to an IP address. If you review the network diagram at the beginning of this section, you'll see that `host-c` can only reach `host-h` via `router-3`. This means that `host-c` and `host-h` are on different networks but only one hop away.

Let's start by running the `ping` from host-c.

```bash
root@host-c:/# ping host-h.local -c2
PING host-h.local (4.0.0.108) 56(84) bytes of data.
64 bytes from 4.0.0.108: icmp_seq=1 ttl=63 time=0.209 ms
64 bytes from 4.0.0.108: icmp_seq=2 ttl=63 time=0.319 ms

--- host-h.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1031ms
rtt min/avg/max/mdev = 0.209/0.264/0.319/0.055 ms
```

Here we can see the name resolution was successful! That `PING host-h.local (4.0.0.108)` shows that `host-c` knows that `host-h` resolves to `4.0.0.108`. It can now send packets to that IP in order to complete the `ping`. But let's look at what was involved in performing that name resolution.

We're going to re-run that `ping` on `host-c`, but this time we need a few more terminal sessions open to watch what's happening on each machine:

* `host-h`: run `tcpdump -n`
* `router-3`: run `tcpdump -nvvvi eth0`
* `router-3`: run `tcpdump -nvvvi eth1`
* `host-c`: run `tcpdump -n`
* `host-c`: run `ping host-h.local -c2`

Make sure you keep track of which interface is on which network for `router-3`. We want to be able to examine the packets running through each machine, and knowing the interface will help you understand the story!

All this output is a little overwhelming. You can click on each command to see the full output block of what we saw when we ran these commands on our machines.

<details>
<summary><b>host-h: tcpdump -n</b></summary>

```bash
root@host-h:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.777779 IP 4.0.3.1.5353 > 224.0.0.251.5353: 0 A (QM)? host-h.local. (30)
19:58:36.782619 IP 4.0.0.108.5353 > 224.0.0.251.5353: 0*- [0q] 1/0/0 (Cache flush) A 4.0.0.108 (40)
19:58:36.787645 IP 6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 1, length 64
19:58:36.787669 IP 4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819176 IP 6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 2, length 64
19:58:37.819206 IP 4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040638 ARP, Request who-has 4.0.3.1 tell 4.0.0.108, length 28
19:58:42.040762 ARP, Request who-has 4.0.0.108 tell 4.0.3.1, length 28
19:58:42.040850 ARP, Reply 4.0.0.108 is-at 02:42:04:00:00:6a, length 28
19:58:42.040916 ARP, Reply 4.0.3.1 is-at 02:42:04:00:03:01, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

</details>

<details>
<summary><b>router-3: tcpdump -nvvvi eth0</b></summary>

```bash
root@router-3:/# tcpdump -nvvvi eth0
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.777712 IP (tos 0x0, ttl 255, id 35930, offset 0, flags [DF], proto UDP (17), length 58)
    4.0.3.1.5353 > 224.0.0.251.5353: [bad udp cksum 0xe833 -> 0x61f1!] 0 A (QM)? host-h.local. (30)
19:58:36.782772 IP (tos 0x0, ttl 255, id 50413, offset 0, flags [DF], proto UDP (17), length 68)
    4.0.0.108.5353 > 224.0.0.251.5353: [bad udp cksum 0xe5a6 -> 0x5b8d!] 0*- [0q] 1/0/0 host-h.local. (Cache flush) [2m] A 4.0.0.108 (40)
19:58:36.787610 IP (tos 0x0, ttl 63, id 24750, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 1, length 64
19:58:36.787697 IP (tos 0x0, ttl 64, id 8806, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819136 IP (tos 0x0, ttl 63, id 24918, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 2, length 64
19:58:37.819244 IP (tos 0x0, ttl 64, id 8949, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040666 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 4.0.0.108 tell 4.0.3.1, length 28
19:58:42.040748 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 4.0.3.1 tell 4.0.0.108, length 28
19:58:42.040822 ARP, Ethernet (len 6), IPv4 (len 4), Reply 4.0.3.1 is-at 02:42:04:00:03:01, length 28
19:58:42.040929 ARP, Ethernet (len 6), IPv4 (len 4), Reply 4.0.0.108 is-at 02:42:04:00:00:6a, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

</details>

<details>
<summary><b>router-3: tcpdump -nvvvi eth1</b></summary>

```bash
root@router-3:/# tcpdump -nvvvi eth1
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.776906 IP (tos 0x0, ttl 255, id 6263, offset 0, flags [DF], proto UDP (17), length 58)
    6.0.0.103.5353 > 224.0.0.251.5353: [bad udp cksum 0xe799 -> 0x628b!] 0 A (QM)? host-h.local. (30)
19:58:36.785114 IP (tos 0x0, ttl 255, id 15580, offset 0, flags [DF], proto UDP (17), length 68)
    6.0.3.1.5353 > 224.0.0.251.5353: [bad udp cksum 0xea3d -> 0x56f6!] 0*- [0q] 1/0/0 host-h.local. (Cache flush) [2m] A 4.0.0.108 (40)
19:58:36.787590 IP (tos 0x0, ttl 64, id 24750, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 1, length 64
19:58:36.787710 IP (tos 0x0, ttl 63, id 8806, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819110 IP (tos 0x0, ttl 64, id 24918, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 2, length 64
19:58:37.819264 IP (tos 0x0, ttl 63, id 8949, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040599 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 6.0.0.103 tell 6.0.3.1, length 28
19:58:42.040775 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 6.0.3.1 tell 6.0.0.103, length 28
19:58:42.040877 ARP, Ethernet (len 6), IPv4 (len 4), Reply 6.0.3.1 is-at 02:42:06:00:03:01, length 28
19:58:42.040903 ARP, Ethernet (len 6), IPv4 (len 4), Reply 6.0.0.103 is-at 02:42:06:00:00:67, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

</details>

<details>
<summary><b>host-c: tcpdump -n</b></summary>

```bash
root@host-c:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.776848 IP 6.0.0.103.5353 > 224.0.0.251.5353: 0 A (QM)? host-h.local. (30)
19:58:36.785144 IP 6.0.3.1.5353 > 224.0.0.251.5353: 0*- [0q] 1/0/0 (Cache flush) A 4.0.0.108 (40)
19:58:36.787560 IP 6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 1, length 64
19:58:36.787743 IP 4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819056 IP 6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 2, length 64
19:58:37.819299 IP 4.0.0.108 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040695 ARP, Request who-has 6.0.3.1 tell 6.0.0.103, length 28
19:58:42.040733 ARP, Request who-has 6.0.0.103 tell 6.0.3.1, length 28
19:58:42.040794 ARP, Reply 6.0.0.103 is-at 02:42:06:00:00:67, length 28
19:58:42.040942 ARP, Reply 6.0.3.1 is-at 02:42:06:00:03:01, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

</details>

Let's see if we can make sense of what we're seeing by following the timestamps in chronological order for each line of output from each machine. Look at the timestamps across all the output in all 4 windows running `tcpdump`. What's the first thing you see happening?

> **host-c:**
> 19:58:36.776848 IP 6.0.0.103.5353 > 224.0.0.251.5353: 0 A (QM)? host-h.local. (30)

Before `host-c` can send out the ICMP packets, it needs to know the IP address of the machine its sending them to. We know that `host-c` is configured through `/etct/nsswitch.conf` to use multicast to lookup any `.local` address. Any address within the `224.0.0.0/4` subnet is designated as a multicast address; specifically, `224.0.0.251` is reserved for multicast DNS requests. We can also see that it's using the port `5353`, which is also reserved for multicast DNS requests.

So, on this line, we see that `host-c` (`6.0.0.103`) is making a request to a known multicast DNS IP address and port for name resolution for `host-h.local`.

> **router-3, eth1**
> 19:58:36.776906 IP (tos 0x0, ttl 255, id 6263, offset 0, flags [DF], proto UDP (17), length 58)
    6.0.0.103.5353 > 224.0.0.251.5353: [bad udp cksum 0xe799 -> 0x628b!] 0 A (QM)? host-h.local. (30)

We see the name resolution request packet that `host-c` sent hitting `router-3`. This is exact same story we told above, except this time from `router-3`'s perspective.

> **router-3, eth0**
> 19:58:36.777712 IP (tos 0x0, ttl 255, id 35930, offset 0, flags [DF], proto UDP (17), length 58)
    4.0.3.1.5353 > 224.0.0.251.5353: [bad udp cksum 0xe833 -> 0x61f1!] 0 A (QM)? host-h.local. (30)

Here we see `router-3` generating its own request for name resolution for `host-h.local`. At first blush, this looks like the same packet we saw on `eth1` for `router-3`... but there's one big important difference. Look at the source IP address: `4.0.3.1`. That's `router-3`'s address on `4.0.0.0/8`, not `host-c`'s address on `6.0.0.0/8`...

What happened is `router-3` received `host-c`'s request. Rather than just forwarding `host-c`'s packet, `router-3` then initiated it's own name resolution process. It will respond back to `host-c` directly once it has an answer. This is textbook proxy behavior!

> **host-h**
> 19:58:36.777779 IP 4.0.3.1.5353 > 224.0.0.251.5353: 0 A (QM)? host-h.local. (30)

`host-h` receives the name resolution request from `router-3` for itself.

> **host-h**
> 19:58:36.782619 IP 4.0.0.108.5353 > 224.0.0.251.5353: 0*- [0q] 1/0/0 (Cache flush) A 4.0.0.108 (40)

`host-h` sends response packets to the multicast DNS address basically saying "IT ME!", passing its own IP address, `4.0.0.108`.

> **router-3, eth0**
> 19:58:36.782772 IP (tos 0x0, ttl 255, id 50413, offset 0, flags [DF], proto UDP (17), length 68)
    4.0.0.108.5353 > 224.0.0.251.5353: [bad udp cksum 0xe5a6 -> 0x5b8d!] 0*- [0q] 1/0/0 host-h.local. (Cache flush) [2m] A 4.0.0.108 (40)

`router-3` receives `host-h`'s response packet, which says "hey, if you have a cached response for `host-h.local`, go ahead and flush that cache and instead cache this IP address for 2m (2 minutes)".

> **router-3, eth1**
> 19:58:36.785114 IP (tos 0x0, ttl 255, id 15580, offset 0, flags [DF], proto UDP (17), length 68)
    6.0.3.1.5353 > 224.0.0.251.5353: [bad udp cksum 0xea3d -> 0x56f6!] 0*- [0q] 1/0/0 host-h.local. (Cache flush) [2m] A 4.0.0.108 (40)

`router-3` responds back to `host-c`'s initial request by letting every machine on the `6.0.0.0/8` network know that `host-h.local` is at `4.0.0.108` and that participating machines should follow the same cache protocol described above.

> **host-c**
> 19:58:36.785144 IP 6.0.3.1.5353 > 224.0.0.251.5353: 0*- [0q] 1/0/0 (Cache flush) A 4.0.0.108 (40)

`host-c` receives the packet from `router-3` to cache `4.0.0.108` as the address for `host-h.local`.

> **host-c**
> 19:58:36.787560 IP 6.0.0.103 > 4.0.0.108: ICMP echo request, id 8, seq 1, length 64

`host-c` initiates the ICMP ping request. The rest of this should be old hat to dedicated readers.

NEXT STEPS: - go back and simplify the network and what we're watching

* don't turn on avahi-daemon on all the routers
* watch name resolution fail for `host-h` from `host-c`
* have the reader manually turn it on on router-3
* watch name resolution work for `host-h.local` and watch all the tcpdumps
* see name resolution NOT work for `host-b.local`
* turn on avahi-daemon for `router-2`
* watch name resolution work for `host-b` from `host-c`, also maybe watch gossip happen from `host-h`
* exercise: how to get name resolution to work for host-a from host c?

**TODO:** consider if we should replace `ping` with an actual name resolution tool

**TODO:** add an end of the chapter exercises section. one exercise should be changing configuration settings on avahi-conf, e.g. change the hostname. maybe this explanation would help set the stage?

**TODO:** exercise: `hopon host-a`, can you see name resolution packets for `host-b` hitting `host-a`. Maybe use this line: Since this is a multicast packet, every machine on the `6.0.0.0/8` network receives the packet.

**TODO:** execise: kill avahi-daemon on `router-3` and see the name resolution fail for `host-h`.

You'll see that `avahi-utils` has been added to your Dockerfile for this chapter to install the software for you on `restart`. We also needed to be able to configure the avahi server. You'll find the configuration settings in [the avahi-daemon.conf file](./init/avahi-daemon.conf) and you'll see the file copied into our containers in [the start-up.sh script](./init/start-up.sh).
