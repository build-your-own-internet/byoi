# Name Resolution

Okay, so much for anarchy and populism. In a real-world Internet, we can’t trust people to come up with their own names. Avahi is a cool solution, but it doesn’t scale into a huge, international network in which people don’t trust each other. Because of these reasons:

* Scaling: you can't get a broadcast on your network every time someone wants to know your name
* Availability: there would be no central authority governing who owns which name, so people would have to fight over names

So rather than life being “nasty, brutish, and having the inability to know people’s names,” (to paraphrase Hobbes), we need to appoint a sheriff over this internetwork to manage names for us. Enter: DNS.

## Goal: A Single Authoritative Name Server

For this chapter, we want to build a single server that is responsible for knowing the IP address for any hostname on our internet. This is known as an "authoritative server". When each machine is added to the internet, it will need its hostname and IP address registered with the authoritative server. Then, when any machine wants to send packets to another machine, it will perform name resolution by querying the authoritative server to learn the IP address of the destination machine.

Let's look at the internet we'll be working with for this chapter:

![our-inter-network](../img/basic-dns-internet.svg)

<!--TODO: should we change 'DNS' to a different hostname to be less confusing-->

Notice that our internet now has a server called `DNS` at `2.0.0.107`. This server provides Authoritative DNS services for our internet. If you check the directory for this chapter, you'll see that there's a new Dockerfile entry: `Dockerfile_dns`. This Dockerfile builds its image from a base image that includes DNS server software called `knot`. To achieve our goal for this chapter, we will need to:

* Configure `knot` on our DNS server to answer DNS queries
* Create a database of names to IP addresses that `knot` can use to answer DNS queries
* Configure each host and router on our internet to point to our DNS server for DNS queries

## Prequel

### What is DNS?

We've used this term DNS several times now. What are we talking about when we mention DNS???

DNS, or domain name service, is the name resolution process that scales to the size of The Internet™. Just like with everything else we've explored, there are many ways to implement DNS. The simplest solution is to have a single DNS server which manages name resolution for the entire internet. Obviously, that wouldn't scale, but that's a topic for another chapter.

Because this is an open standard, there are a lot of choices for which software you can use to implement your DNS server. We decided to use software called [knot](https://www.knot-dns.cz/).

### What is knot? Why are we using knot?

From the Knot DNS website:

> Knot DNS is a high-performance authoritative-only DNS server which supports all key features of the modern domain name system.

So why did we choose to go with Knot for our DNS server? Well, there are several reasons:

* It's a very commonly used server
* The people on this team are already familiar with this software
* It's free and open source
* It's high performance/internet scale

If you wanted to look at possible alternatives to implement on your own, here are some of the most commonly used DNS server software on the internet:

* [BIND (Berkeley Internet Name Domain)](https://www.isc.org/bind/)
* [Unbound](https://nlnetlabs.nl/projects/unbound/about/)
* [PowerDNS](https://www.powerdns.com/)
* [CoreDNS](https://coredns.io/)

## Let's configure some Knot

As we mentioned at the start of the chapter, we designated one of the machines on the internet to be our authoritative DNS server. That machine was built with a different docker image that included the Knot DNS software. While that software was installed and is ready to be used, we still need to do some configuration in order for it to serve our little internet.

Go ahead and `restart` to get this chapter's internet up and running. Then, `hopon host-dns` and we'll start working on the configuration files.

Knot needs 2 files in order to know how to answer our DNS queries. The first is a `knot.conf` file. When Knot was installed, it came with a file in the `config` directory, `knot.sample.conf`. We can reference this file to build out our own `knot.conf` file. In `/config/knot.sample.conf`, there are a number of headings that we can use to make Knot perform how we want:

**TODO:** come back and give descriptions of each of these (maybe?t)

* `server`:
* `log`
* `database`
* `remote`
* `template`
* `zone`

For our super simple installation, we're only interested in `server` and `zone`.

As you saw, there's a `listen` option in `server` that allows you to specify an IP address. This configures Knot to answer DNS queries that come in on that IP address or subnet. For the sake of simplifying our little internet, we're just going to have Knot listen for ANYTHING AND EVERYTHING that hits our server. We're going to set that listen to `0.0.0.0@53`.

`@53`??? What's that? Port 53 is the [RFC identified](https://www.rfc-editor.org/rfc/rfc1035#page-32) port for handling DNS queries. So, in the address above, we're telling Knot to listen on all interfaces on TCP and UDP port 53!

Next up, we need to tell Knot where to find how to turn names into DNS responses. We can do this by pointing Knot to any zonefiles in the `zone` section.

<!--TODO: fix this paragraph. Is poopy garbage.-->

So, what's a `zone`? The short answer is zones are a way to delegate responsibility for hostnames around the internet. We can think of a zone as any domain and its subdomains, e.g. `example.com`, `www.example.com`, `api.example.com`. The organization who owns `example.com` needs to be able to insert and update DNS records for any of the domains that exist in that zone. We'll be looking at zones in more detail in the next chapter when we look at internet scale DNS.

The zone we'll create for this chapter is going to cover `byoi.org`. We'll add some A records (IPv4 address) for the hostnames that exist on our little internet with the `byoi.org` suffix, e.g. `host-a.byoi.org`.

So let's go ahead and get our small internet Knot set up. We'll need to start by creating a new Knot config file and we'll add the `server` and `zone` configurations to it.

```bash
nano /config/knot.conf
```

Inside that file:

```bash
# Define the server options
server:
  # Listen on all interfaces
  listen: 0.0.0.0@53

# Define the zone
zone:
  - domain: byoi.org
    file: "/etc/knot/byoi.org.zone"
    storage: "/var/lib/knot"
```

Ok, as you can see, in the `zone` definition, we've referenced a zonefile, `/etc/knot/byoi.org.zone`. But that file doesn't exist yet! We need to make a file that defines the `byoi.org` zone!

```bash
mkdir /etc/knot
nano /etc/knot/byoi.org.zone
```

And inside that file:

```bash
@       IN SOA  ns1.byoi.org. admin.byoi.org. (
                2023010101 ; serial
                3600       ; refresh (1 hour)
                900        ; retry (15 minutes)
                604800     ; expire (1 week)
                86400      ; minimum (1 day)
                )
        IN NS   ns1.byoi.org.
        IN NS   ns2.byoi.org.

ns1 IN A 2.0.0.107
ns2 IN A 2.0.0.107

host-a     IN A    1.0.0.101
host-b     IN A    5.0.0.102
host-c     IN A    6.0.0.103
host-d     IN A    7.0.0.104
host-e     IN A    8.0.0.105
host-f     IN A    6.0.0.106
host-h     IN A    4.0.0.108

host-dns   IN A    2.0.0.107
```

This file is called a `zonefile`.

now we need to start running knot. daemon.

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
