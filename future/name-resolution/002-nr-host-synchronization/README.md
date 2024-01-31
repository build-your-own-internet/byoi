# Name Resolution

## Goal

In the last chapter, we kinda cheated... We used our docker-compose.yaml file to insert entries into our `/etc/hosts` file for name resolution. In the real world, we don't have an option to modify the `/etc/hosts` files on every machine on the internet. In this chapter, we've removed those `/etc/hosts` entries, so we're starting back in the same place. So what can we do to solve this problem without using our little Docker hack?

Let's review what our little internet looks like:

![our-inter-network](../img/nr-getting-started.svg)

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

Boom! We got a `ping` there! But if we look at the network diagram pictured at the top of this chapter, we can see that `host-c` and `host-f` are on the same network. What happens if we try to `ping host-a`, which is on a different network?

```bash
root@host-c:/# ping -w2 host-a.local
ping: host-a.local: Name or service not known
```

Multicasting by default only works on local networks, in this case machines that can communicate directly with one another via ethernet, [a quick reminder on how ethernet works](../../../appendix/ip-and-mac-addresses.md). This is because ethernet provides an ability for a machine to broadcast to all other machines on the network.

Avahi uses IP multicast, which gets translated to ethernet broadcast messages. By default, routers ignore these messages, so these messages never get sent to the broader internet. To put this more simply, `host-c` and `host-f` are on the same network, so they can exchange ethernet broadcast messages with each other directly. `host-a`, however, has to be reached through our internet, which requires routers to forward messages to it. It's possible to configure your internetwork to have multicast messages routed between networks, but that's not a default setting.

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

Maybe use later?

You'll see that `avahi-utils` has been added to your Dockerfile for this chapter to install the software for you on `restart`. We also needed to be able to configure the avahi server. You'll find the configuration settings in [the avahi-daemon.conf file](./init/avahi-daemon.conf) and you'll see the file copied into our containers in [the start-up.sh script](./init/start-up.sh).

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

BELOW IS ALL A LIE

==================

current problem:

routers don't know how to handle avahi requests because requests are being sent to a multicast IP destination
<grab a tcpdump that shows the IP address>
routers need to be taught to handle multicast requests
once they know how to handle the requests, then we'll need to teach them how to prevent packets from looping back (how to tree)

```
root@host-c:/# ping host-f.local -c2
PING host-f.local (4.0.0.106) 56(84) bytes of data.
64 bytes from 4.0.0.106: icmp_seq=1 ttl=63 time=0.209 ms
64 bytes from 4.0.0.106: icmp_seq=2 ttl=63 time=0.319 ms

--- host-f.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1031ms
rtt min/avg/max/mdev = 0.209/0.264/0.319/0.055 ms
```

```
root@router-3:/# tcpdump -nvvvi eth1
tcpdump: listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.776906 IP (tos 0x0, ttl 255, id 6263, offset 0, flags [DF], proto UDP (17), length 58)
    6.0.0.103.5353 > 224.0.0.251.5353: [bad udp cksum 0xe799 -> 0x628b!] 0 A (QM)? host-f.local. (30)
19:58:36.785114 IP (tos 0x0, ttl 255, id 15580, offset 0, flags [DF], proto UDP (17), length 68)
    6.0.3.1.5353 > 224.0.0.251.5353: [bad udp cksum 0xea3d -> 0x56f6!] 0*- [0q] 1/0/0 host-f.local. (Cache flush) [2m] A 4.0.0.106 (40)
19:58:36.787590 IP (tos 0x0, ttl 64, id 24750, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 1, length 64
19:58:36.787710 IP (tos 0x0, ttl 63, id 8806, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819110 IP (tos 0x0, ttl 64, id 24918, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 2, length 64
19:58:37.819264 IP (tos 0x0, ttl 63, id 8949, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040599 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 6.0.0.103 tell 6.0.3.1, length 28
19:58:42.040775 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 6.0.3.1 tell 6.0.0.103, length 28
19:58:42.040877 ARP, Ethernet (len 6), IPv4 (len 4), Reply 6.0.3.1 is-at 02:42:06:00:03:01, length 28
19:58:42.040903 ARP, Ethernet (len 6), IPv4 (len 4), Reply 6.0.0.103 is-at 02:42:06:00:00:67, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

```
root@host-c:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.776848 IP 6.0.0.103.5353 > 224.0.0.251.5353: 0 A (QM)? host-f.local. (30)
19:58:36.785144 IP 6.0.3.1.5353 > 224.0.0.251.5353: 0*- [0q] 1/0/0 (Cache flush) A 4.0.0.106 (40)
19:58:36.787560 IP 6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 1, length 64
19:58:36.787743 IP 4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819056 IP 6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 2, length 64
19:58:37.819299 IP 4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040695 ARP, Request who-has 6.0.3.1 tell 6.0.0.103, length 28
19:58:42.040733 ARP, Request who-has 6.0.0.103 tell 6.0.3.1, length 28
19:58:42.040794 ARP, Reply 6.0.0.103 is-at 02:42:06:00:00:67, length 28
19:58:42.040942 ARP, Reply 6.0.3.1 is-at 02:42:06:00:03:01, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

```
root@router-3:/# tcpdump -nvvvi eth0
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.777712 IP (tos 0x0, ttl 255, id 35930, offset 0, flags [DF], proto UDP (17), length 58)
    4.0.3.1.5353 > 224.0.0.251.5353: [bad udp cksum 0xe833 -> 0x61f1!] 0 A (QM)? host-f.local. (30)
19:58:36.782772 IP (tos 0x0, ttl 255, id 50413, offset 0, flags [DF], proto UDP (17), length 68)
    4.0.0.106.5353 > 224.0.0.251.5353: [bad udp cksum 0xe5a6 -> 0x5b8d!] 0*- [0q] 1/0/0 host-f.local. (Cache flush) [2m] A 4.0.0.106 (40)
19:58:36.787610 IP (tos 0x0, ttl 63, id 24750, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 1, length 64
19:58:36.787697 IP (tos 0x0, ttl 64, id 8806, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819136 IP (tos 0x0, ttl 63, id 24918, offset 0, flags [DF], proto ICMP (1), length 84)
    6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 2, length 64
19:58:37.819244 IP (tos 0x0, ttl 64, id 8949, offset 0, flags [none], proto ICMP (1), length 84)
    4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040666 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 4.0.0.106 tell 4.0.3.1, length 28
19:58:42.040748 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 4.0.3.1 tell 4.0.0.106, length 28
19:58:42.040822 ARP, Ethernet (len 6), IPv4 (len 4), Reply 4.0.3.1 is-at 02:42:04:00:03:01, length 28
19:58:42.040929 ARP, Ethernet (len 6), IPv4 (len 4), Reply 4.0.0.106 is-at 02:42:04:00:00:6a, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

```
root@host-f:/# tcpdump -n
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
19:58:36.777779 IP 4.0.3.1.5353 > 224.0.0.251.5353: 0 A (QM)? host-f.local. (30)
19:58:36.782619 IP 4.0.0.106.5353 > 224.0.0.251.5353: 0*- [0q] 1/0/0 (Cache flush) A 4.0.0.106 (40)
19:58:36.787645 IP 6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 1, length 64
19:58:36.787669 IP 4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 1, length 64
19:58:37.819176 IP 6.0.0.103 > 4.0.0.106: ICMP echo request, id 8, seq 2, length 64
19:58:37.819206 IP 4.0.0.106 > 6.0.0.103: ICMP echo reply, id 8, seq 2, length 64
19:58:42.040638 ARP, Request who-has 4.0.3.1 tell 4.0.0.106, length 28
19:58:42.040762 ARP, Request who-has 4.0.0.106 tell 4.0.3.1, length 28
19:58:42.040850 ARP, Reply 4.0.0.106 is-at 02:42:04:00:00:6a, length 28
19:58:42.040916 ARP, Reply 4.0.3.1 is-at 02:42:04:00:03:01, length 28
^C
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

Observations:

> 19:58:36.776848 IP 6.0.0.103.5353 > 224.0.0.251.5353: 0 A (QM)? host-f.local. (30)

host-c makes an mDNS request into 224.0.0.251:5353 for name resolution on host-f.local

>

router-3 makes an mDNS request on both netwoks for host-f

* host-c makes an mDNS request into 224.0.0.251:5353 for name resolution on host-f.local
* router-3 receives the request from host-c and says hang on a sec
* router-3 generates its own mDNS request to 224.0.0.251:5353 on four-net to resolve host-f
* host-f receives the mDNS request from router-3 and responds "it me!"
* router-3 caches the response (assumed) and responds back to host-c
* host-c caches the response (assumed) and initiates ICMP requests
* standard ICMP behavior follows from here
