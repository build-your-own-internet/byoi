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

Go ahead and `byoi-rebuild` to get this chapter's internet up and running. Then, `hopon host-dns` and we'll start working on the configuration files.

Knot needs 2 files in order to know how to answer our DNS queries. The first is a `knot.conf` file. When Knot was installed, it came with a file in the `config` directory, `knot.sample.conf`. We can reference this file to build out our own `knot.conf` file. In `/config/knot.sample.conf`, there are a number of headings that we can use to make Knot perform how we want:

**TODO:** come back and give descriptions of each of these (maybe?t)

* `server`:
* `log`
* `database`
* `remote`
* `template`
* `zone`

For our super simple installation, we're only interested in `server` and `zone`.

As you saw, there's a `listen` option in `server` that allows you to specify an IP address. This configures Knot to answer DNS queries that come in on that IP address or subnet. We're going to have Knot listen on the IP address that we've defined for this server on our little internet (`2.0.0.107`).

`@53`??? What's that? Port 53 is the [RFC identified](https://www.rfc-editor.org/rfc/rfc1035#page-32) port for handling DNS queries. So, in the address above, we're telling Knot to listen on all interfaces on TCP and UDP port 53!

Next up, we need to tell Knot where to find how to turn names into DNS responses. We can do this by pointing Knot to any zonefiles in the `zone` section.

<!--TODO: fix this paragraph. Is poopy garbage.-->

So, what's a `zone`? The short answer is zones are a way to delegate responsibility for hostnames around the internet. We can think of a zone as any domain and its subdomains, e.g. `example.com`, `www.example.com`, `api.example.com`. The organization who owns `example.com` needs to be able to insert and update DNS records for any of the domains that exist in that zone. We'll be looking at zones in more detail in the next chapter when we look at internet scale DNS.

The zone we'll create for this chapter is going to cover `byoi.net`. We'll add some A records (IPv4 address) for the hostnames that exist on our little internet with the `byoi.net` suffix, e.g. `host-a.byoi.net`.

So let's go ahead and get our small internet Knot set up. We'll need to start by creating a new Knot config file and we'll add the `server` and `zone` configurations to it.

```bash
nano /config/knot.conf
```

Inside that file:

```bash
# Define the server options
server:
  # Listen on all interfaces
  listen: 2.0.0.107@53

# Define the zone
zone:
  - domain: byoi.net
    file: "/etc/knot/byoi.net.zone"
    storage: "/var/lib/knot"
```

Ok, as you can see, in the `zone` definition, we've referenced a zonefile, `/etc/knot/byoi.net.zone`. But that file doesn't exist yet! We need to make a file that defines the `byoi.net` zone!

```bash
mkdir /etc/knot
nano /etc/knot/byoi.net.zone
```

And inside that file:

```bash
@       IN SOA (
                host-dns.byoi.net.  ; MNAME
                admin.byoi.net.     ; RNAME
                2024041501          ; serial
                3600                ; refresh (1 hour)
                900                 ; retry (15 minutes)
                604800              ; expire (1 week)
                86400               ; minimum (1 day)
                )

host-a     IN A    1.0.0.101
host-b     IN A    5.0.0.102
host-c     IN A    6.0.0.103
host-d     IN A    7.0.0.104
host-e     IN A    8.0.0.105
host-f     IN A    6.0.0.106
host-h     IN A    4.0.0.108

host-dns   IN A    2.0.0.107
```

This file is called a `zonefile`. A zonefile defines all the DNS responses for a given zone, e.g. all the subdomains of `byoi.net`. In this file, we just added the IP address for each host on our internet.

But what's that big block at the top? `SOA`, or **S**tart **O**f **A**uthority, is a DNS record that provides zone configuration and other information. The details of this block aren't necessary to go into for our minimal DNS configuration for this chapter. We'll need to look at a few of these values next chapter. If you're gunning to learn more before then, checkout [this awesome document](https://www.cloudflare.com/learning/dns/dns-records/dns-soa-record/).

## Get Knot running

Now it's time to get our Knot server up and running! Still on the `host-dns` machine, run the following command:

```bash
/usr/sbin/knotd -c /config/knot.conf
```

This will run Knot in the foreground. Meaning, if you `CTRL + C` out of that, the server stops running. The benefit of running it in the foreground is that you get to see all the logs of what happens during startup. If you see an error, you can `CTRL + C` out of the server, fix the problem, and try again.

You can either leave Knot running in the foreground and open a new terminal session to continue working, or you can daemonize the Knot server by restarting it and adding the `--daemonize` flag:

```bash
/usr/sbin/knotd -c /config/knot.conf --daemonize
```

Sweet, now that we have told knot to start up with the configuration in place, let's make sure that it is indeed listening for DNS queries. We can do that with the help of [`netstat`](../../../chapters/000-getting-started/command-reference-guide.md#netstat) command. In your `host-dns` container, run the following:

```
root@host-dns:/# netstat -lnp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 2.0.0.107:53            0.0.0.0:*               LISTEN      21/knotd
tcp        0      0 127.0.0.11:33947        0.0.0.0:*               LISTEN      -
udp        0      0 127.0.0.11:56006        0.0.0.0:*                           -
udp        0      0 2.0.0.107:53            0.0.0.0:*                           21/knotd
udp        0      0 2.0.0.107:53            0.0.0.0:*                           21/knotd
udp        0      0 2.0.0.107:53            0.0.0.0:*                           21/knotd
udp        0      0 2.0.0.107:53            0.0.0.0:*                           21/knotd
udp        0      0 2.0.0.107:53            0.0.0.0:*                           21/knotd
udp        0      0 2.0.0.107:53            0.0.0.0:*                           21/knotd
Active UNIX domain sockets (only servers)
Proto RefCnt Flags       Type       State         I-Node   PID/Program name     Path
unix  2      [ ACC ]     STREAM     LISTENING     129228   21/knotd             /rundir/knot.sock
```

As you can glean from the output, the command displays all of the `programs` that are `listening` for network connections and the port they are listening on. You can see that `knot` is listening on `2.0.0.107` on port `53` for both `TCP` and `UDP` protocols. As you may recall from other chapters, port `53` is the standard port used for `DNS` requests. You will also see the `PID` (Process ID) for the `knot` server, i.e. `21`, in this output. The `PID` when you run the same command might be different.

You might be wondering why we have `udp 0 0 2.0.0.107:53 0.0.0.0:* 21/knotd` represented not just once but 6 (SIX) times! We wondered the same thing! This is why we are best friends! Turns out, knot is multi-threaded, which means each one of those 6 (SIX) lines in the output points to a different thread that can handle the DNS request simultaneously.

We are almost there! Before we can issue a `dig` command to see the DNS request working, we have one more thing to take care of.

## Update your host-dns's `/etc/resolv.conf` file

Finally, in order to use the Knot server's information about the names on our internet, we need to tell the `host-dns` machine to use **itself** to resolve hostnames. The configuration we have done so far is to get knot running. Now, we need to configure host-dns to know how to resolve names. This pattern should be familiar since we had to configure either `/etc/hosts` or `/etc/nsswitch.conf` for similar ends in our earlier exploration of name resolution.

We talked in [chapter 1 of this section](../../../chapters/name-resolution/1-nr-getting-started/README.md#how-does-your-computer-know-where-to-go-to-resolve-a-name) about how a machine knows who to ask to resolve a name. Take a moment and have a look at the `/etc/resolv.conf` file on the `host-dns` machine:

```bash
nano /etc/resolv.conf
```

You'll see the contents of this file as follows:

```/etc/resolv.conf
nameserver 127.0.0.11
options edns0 trust-ad ndots:0
```

This configuration file is generated for you by Docker, because it's trying to be "helpful." The IP address for the nameserver (`127.0.0.11`) is the one that Docker set up for you to provide name-services for all your docker containers. We don't want that because we're doing this *ourselves.* 💪🏼💪🏼💪🏼

Let's edit that IP address, changing it from `127.0.0.11` to `2.0.0.107`.

The IP address `2.0.0.107` should look familiar. Where have you seen this before? The task of answering this question is left to you, the reader, as an exercise. 😊

This will tell your `host-dns` machine to start using the Knot server that you just configured instead of Docker's weird DNS stuff.

## See it working

Sweet! We got our Knot DNS server up and running. Let's run a `dig` and see what we get back:

```bash
root@host-dns:/# dig host-a.byoi.net

; <<>> DiG 9.18.24-1-Debian <<>> host-a.byoi.net
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 22124
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;host-a.byoi.net.		IN	A

;; ANSWER SECTION:
host-a.byoi.net.	3600	IN	A	1.0.0.101

;; Query time: 0 msec
;; SERVER: 2.0.0.107#53(2.0.0.107) (UDP)
;; WHEN: Wed May 08 18:59:48 UTC 2024
;; MSG SIZE  rcvd: 60
```

Ok, there's a lot of information in that `dig` output. First, let's acknowledge that the dig output is a bit of a mystery wrapped in an enigma. Why are there `;`s at the beginning of every line? Who knows? Who cares?

But... this is the most commonly used tool for diagnosing DNS configurations. So, we're gonna use it. Let's take second to understand the basics of it. We'll pull out some particularly useful things to note. We'll DIG (:D) into `dig` output further in this chapter as more sections become relevant.

> ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 22124

First, `HEADER`. Any time you see `header`, you're looking at metadata. This section is just giving us some high level information about the response that we're going to be looking at.

The most important bit in this line of the `HEADER` is `status`. The `status` header tells us whether or not a request was able to return a response, and in cases where it couldn’t, why it couldn’t return a response.  The most common `status`es are:

* `NOERROR`: The request for a domain was able to be successfully routed to an authoritative DNS server. The authoritative server did not error out when looking up the name requested.
* `SERVFAIL`: The domain requested exists, but the DNS server either doesn’t have data or has bad data for it.
* `NXDOMAIN`: The domain requested doesn’t exist. The `NX` here stands for `Non-eXistent`.
* `REFUSED`: The authoritative DNS server refused the request. The domain doesn’t exist and the server refuses to process requests for domains that do not exist.

> ;; QUESTION SECTION:
> ;host-a.byoi.net.  IN A

This is the question you sent to to your [resolver](../../../chapters/glossary.md#resolver). A resolver is a piece of software that performs DNS lookups. We'll discuss more about the different types of resolvers in the next chapter. In this case, the `QUESTION` is asking the resolver to return the A record for the indicated hostname.

What is an `A record`, you ask? Excellent question. The A in A record stands for `address`. An A record is just DNS shorthand for an IPv4 address, so an address that looks like `127.0.0.1`. There are [a plethora of DNS record types](https://en.wikipedia.org/wiki/List_of_DNS_record_types) if you want to look up more of them!

`dig`, by default, sends a query for an `A record`, thus, our `QUESTION SECTION` shows us that we were querying `host-a.byoi.net` for an `A` record.

> ;; ANSWER SECTION:
> host-a.byoi.net. 3600 IN A 1.0.0.101

The `ANSWER SECTION` provides the answer to the DNS query. Duh! So, if you reference the zonefile we configured Knot with, you'll see that we defined `host-a` with `host-a     IN A    1.0.0.101`. Knot looked at the hostname in the `QUESTION SECTION`, saw that the *T*op *L*evel *D*omain was `byoi.net`, and went and found the zonefile it had been configured with for that zone. It then found the answer to the query in that file.

What happens if you send a query for a domain that isn't defined in that file? Can you decipher the output? HINT: the `status` in the `HEADER` will give you a lot of context! Take a look at the output for the following queries.

* `dig host-x.byoi.net` (a name that *could* ostensibly be in the `byoi.net` zone)
* `dig host-a.foo.net` (a name that our Knot instance knows nothing about)

> ;; SERVER: 2.0.0.107#53(2.0.0.107) (UDP)

This line tells us the IP address (`2.0.0.107`), port (`53`), and protocol (`UDP`) for the resolver that answered our DNS query. Let's start with the IP address: `2.0.0.107`. What's this address? Why was this used?

**NEXT STEPS**

* [x] finish dig descriptions
* [x] run `netstat -nlp` to show what's listening on `host-dns`
* what happens when we run this query from `host-c`?
* failure. use `dig @`.
* update `resolv.conf` on `host-c`

## Configure hosts to use `host-dns` as the DNS server

but that's not efficient! let's update our handy `resolv.conf`!
maybe do this for a couple other hosts
update start-up to reference a saved `resolv.conf` file

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
# Define the server options
server:
  # Listen on all interfaces
  listen: 0.0.0.0@53

# Define the zone
zone:
  - domain: byoi.com
    file: "/etc/knot/byoi.com.zone"
    storage: "/var/lib/knot"
EOF
```

```bash
mkdir -p /etc/knot
```

```bash
cat > /etc/knot/byoi.com.zone <<EOF
@       IN SOA  ns1.byoi.com. admin.byoi.com. (
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
EOF
```

```bash
/usr/sbin/knotd -c /config/knot.conf -d
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
* create a 'definition of done' list for promoting future => chapters
* create a 'how to move a chapter to the chapters folder' checklist
