# Name Resolution

## Goal

In the last chapter, we kinda cheated... We used our docker-compose.yaml file to insert entries into our `/etc/hosts` file for name resolution. In the real world, we don't have an option to modify the `/etc/hosts` files on every machine on the internet. In this chapter, we've removed those `/etc/hosts` entries, so we're starting back in the same place. So what can we do to solve this problem without using our little Docker hack?

Let's review what our little internet looks like:

![our-inter-network](../img/nr-getting-started.svg)

Let's start with the simplest thing we can do on our little internet to provide name resolution without using Docker or manually editing `/etc/hosts`. We're gonna head down the route of using a [multicast](../../../chapters/glossary.md#multicast) solution called `avahi`. By the end of this chapter, you should be able to `ping` or use `links` to reach each host on our little internet.

## Avahi and avahi-daemon

Avahi is a program which uses multicast to perform name resolution on local networks with minimal configuration.

[] test when avahi modifies nsswitch.conf - is it when we daemonize or when we install?
[] do we want to start with `avahi-utils` added in the dockerfile (depending on the answer to the previous questoin)
[] provide a pinch more infor about avahi in the paragraph above.

## install and configure avahi/-daemon

more text on installing things

now the below section on exploring what's happening with avahi

### Name Resolution on Linux (or any Unix like system)

We've already discussed the `/etc/hosts` file in our previous chapter, but how does that file get hooked into the name resolution process as a whole? Let's start with the command `ping host-f`... what happens? Your computer needs to figure out where to send the packets, which means turning `host-f` into an IP address. It will start by referencing the `/etc/nsswitch.conf` file, which (on Ubuntu Jammy) contains a line related to `hosts`:

```bash
hosts:          files mdns4_minimal [NOTFOUND=return] dns
```

What we see here is the sequence, from left to right, that will be followed in resolving the name. As soon as the resolution process finds an entry, we have successfully converted the name into an IP address and we don't need to keep looking.

Let's pick this apart piece by piece:

* `files`: is there an entry for this hostname in `/etc/hosts`?
* `mdns4_minimal`: can this name be resolved using a multicast resolver? This is specific to resolving hostnames in the local network.
* `[NOTFOUND=return]`: if the hostname matches the TLD for `mdns4_minimal`, e.g. `.local`, but the hostname cannot be resolved, don't send this request out to the open internet. For example, if we requested `host-x.local`, which doesn't exist, don't make an open internet request.
* `dns`: we gotta outsource this request to the larger internet; check the `/etc/resolv.conf` file for where we should send our DNS queries.

**THIS IS WHERE WE STOPPED**

Next documention Steps:
[] what is avahi/avahi-daemon? what is multicasting?
[x] add multicast definition in the glossary.
[] how does avahi work in a local network?
[] hopon on a machine, edit avahi-daemon.conf file, restart avahi-daemon - generally explore that shit (tcpdump, ping, all the tools we already know and love)
[] how do we need to hack things in order to get it to work in our internet?

[] bring in and credit use the wikipedia diagram showing the differences between various "casts" on <https://en.wikipedia.org/wiki/Anycast>

Next exploration steps:
[] how do we get the routers in on the joke
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
* look into what we need to do to configure the routers (peba recommends pim-dense gets installed on all the routers)

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
