# Name Resolution

## Goal

Stop cheating (remove `extra_hosts` from docker-compose) and implement a name resolution like service on each machine and see name-resolution work.

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

- how is `ping` getting the hostname and network on this output `build-your-own-internet-host-f.build-your-own-internet-six-net`
- how do we change the hostname? what are the `host-name` and `domain-name` fields in the `/etc/avahi/avahi-daemon.conf` file? They don't seem to have impact on name resolution... :shrug:

we need to get the routers in on the joke. this will require teaching the routers how to handle multicast requests

Next Steps

- [x] automatically set `enable-dbus=no` for all configs (start-up.sh)
- look into what we need to do to configure the routers (peba recommends pim-dense gets installed on all the routers)

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

- when we start an avani-daemon on a host it does a multicast announcement
- it also begins to listen for other multicast announcements and records those names.... somewhere
- when a couple avahi-daemons are running on a local network, they will record each other's names
- when you ping anything that ends in `.local` the linux box knows to ask the avahi-daemon for the name resolution

`.local` works because of this line in `/etc/nsswitch.conf`

```none
hosts:          files mdns4_minimal [NOTFOUND=return] dns
```

remove the `mdns4_minimal` and `.local` doesn't resolve any more.

=====================

BELOW IS ALL A LIE

==================

current problem:

routers don't know how to handle avahi requests because requests are being sent to a multicast IP destination
<grab a tcpdump that shows the IP address>
routers need to be taught to handle multicast requests
once they know how to handle the requests, then we'll need to teach them how to prevent packets from looping back (how to tree)
