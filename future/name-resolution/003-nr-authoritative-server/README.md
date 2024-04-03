# Name Resolution

Okay, so much for anarchy and populism. In a real-world Internet, we can’t trust people to come up with their own names. Avahi is a cool solution, but it doesn’t scale into a huge, international network in which people don’t trust each other. Because of these reasons:

* Scaling: you can't get a broadcast on your network every time someone wants to know your name
* Availability: there would be no central authority governing who owns which name, so people would have to fight over names

So rather than life being “nasty, brutish, and having the inability to know people’s names,” (to paraphrase Hobbes), we need to appoint a sheriff over this internetwork to manage names for us.

## Goal: A Single Authoritative Name Server

For this chapter, we want to build a single server that is responsible for knowing the IP address for any hostname on our internet. When each machine is added to the internet, it will need its hostname and IP address registered with the authoritative server. Then, when any machine wants to send packets to another machine, it will perform name resolution by querying the authoritative server to learn the IP address of the destination machine.

![our-inter-network](../img/basic-dns-internet.svg)

Notice that our internet now has a server called `DNS` at `2.0.0.107`. This server provides Authoritative DNS services for our internet. If you check the directory for this chapter, you'll see that there's a new Dockerfile entry: `Dockerfile_dns`. This Dockerfile builds its image from a base image that includes DNS server software called `knot`. To achieve our goal for this chapter, we will need to:

* Configure `knot` on our DNS server to answer DNS queries
* Create a database of names to IP addresses that `knot` can use to answer DNS queries
* Configure each host and router on our internet to point to our DNS server for DNS queries

## What is knot? Why are we using knot?

maybe we do this section? maybe not?

### Why knot?

* commonly used server
* people on this team are already familiar with this software
* free open source
* high performance/internet scale

possible alternatives:

* bind
* tiny DNS

### Why is this a good next step

==================================

# NOTES

running different dockerfiles for different machine builds (see the definition for `host-knot`)

<https://hub.docker.com/r/cznic/knot> (image docs)
**NOTE** we may want to use a volume at the end of this chapter to load a bunch of names => IP addresses?

* docker run -it  cznic/knot  /bin/bash
  * root@1f9423931147:/# knotc conf-init

```bash
root@1f9423931147:/# knotd
2024-03-27T18:46:49+0000 info: Knot DNS 3.3.3 starting
2024-03-27T18:46:49+0000 info: loaded configuration database '/storage/confdb', mapsize 500 MiB
2024-03-27T18:46:49+0000 warning: no network interface configured
2024-03-27T18:46:49+0000 info: loading 0 zones
2024-03-27T18:46:49+0000 warning: no zones loaded
2024-03-27T18:46:49+0000 info: starting server
2024-03-27T18:46:49+0000 info: control, binding to '/rundir/knot.sock'
2024-03-27T18:46:49+0000 info: server started in the foreground, PID 9
^C2024-03-27T18:46:55+0000 info: stopping server
2024-03-27T18:46:55+0000 info: updating persistent timer DB
2024-03-27T18:46:55+0000 info: shutting down
root@1f9423931147:/# knotd --help
Usage: knotd [-c | -C <path>] [options]

Config options:
 -c, --config <file>        Use a textual configuration file.
                             (default /config/knot.conf)
 -C, --confdb <dir>         Use a binary configuration database directory.
                             (default /storage/confdb)
Options:
 -m, --max-conf-size <MiB>  Set maximum size of the configuration database (max 10000 MiB).
                             (default 500 MiB)
 -s, --socket <path>        Use a remote control UNIX socket path.
                             (default /rundir/knot.sock)
 -d, --daemonize=[dir]      Run the server as a daemon (with new root directory).
 -v, --verbose              Enable debug output.
 -h, --help                 Print the program help.
 -V, --version              Print the program version.
```

Next Steps:

* now we need different runtime instructions (edit Dockerfile_dns)
* figure out how to configure knot
  * chatgpt instructions: <https://chat.openai.com/share/a281dd4b-67f6-4888-be0b-ecbd5aafa000>
* figure out how to add entries into knot
* figure out how to point other hosts to knot for NR

## Configure knot

```bash
cat > /config/knot.conf <<EOF
> # Define the server options
server:
  # Listen on all interfaces
  listen: 0.0.0.0@53

# Define the zone
zone:
  - domain: byoi.com
    file: "/etc/knot/byoi.com.zone"
    storage: "/var/lib/knot"
> EOF
```

```bash
cat > /etc/knot/byoi.com.zone <<EOF
> @       IN SOA  ns1.byoi.com. admin.byoi.com. (
                2023010101 ; serial
                3600       ; refresh (1 hour)
                900        ; retry (15 minutes)
                604800     ; expire (1 week)
                86400      ; minimum (1 day)
                )
        IN NS   ns1.byoi.com.
        IN NS   ns2.byoi.com.

ns1     IN A    192.0.2.1
ns2     IN A    192.0.2.2
> EOF
```

```bash
kdig -t SOA byoi.com @127.0.0.1
;; ->>HEADER<<- opcode: QUERY; status: NOERROR; id: 4187
;; Flags: qr aa rd; QUERY: 1; ANSWER: 1; AUTHORITY: 0; ADDITIONAL: 0

;; QUESTION SECTION:
;; byoi.com.             IN SOA

;; ANSWER SECTION:
byoi.com.            3600 IN SOA ns1.byoi.com. admin.byoi.com. 2023010101 3600 900 604800 86400

;; Received 72 B
;; Time 2024-03-27 19:12:34 UTC
;; From 127.0.0.1@53(UDP) in 0.3 ms
```

```bash
kdig -t NS byoi.com @127.0.0.1
;; ->>HEADER<<- opcode: QUERY; status: NOERROR; id: 53692
;; Flags: qr aa rd; QUERY: 1; ANSWER: 2; AUTHORITY: 0; ADDITIONAL: 2

;; QUESTION SECTION:
;; byoi.com.             IN NS

;; ANSWER SECTION:
byoi.com.            3600 IN NS ns1.byoi.com.
byoi.com.            3600 IN NS ns2.byoi.com.

;; ADDITIONAL SECTION:
ns1.byoi.com.        3600 IN A 192.0.2.1
ns2.byoi.com.        3600 IN A 192.0.2.2

;; Received 94 B
;; Time 2024-03-27 19:12:53 UTC
;; From 127.0.0.1@53(UDP) in 0.3 ms
```

```bash
vim /etc/resolv.conf

nameserver 2.0.0.107
# options edns0 trust-ad ndots:0
```

TODOS:

* update knot's resolv.conf to point to itself? Or nerf it? Or think on this.
* update each host to point to knot's IP (`2.0.0.107`)
* update knot's zonefile for each host & router in our internet
* [x]change server name references to `knot` => `dns`
