# Recursive DNS

In our previous chapter, we made a promise that we were going to build out a solution that could scale to the entire internet. But then, all we did was build a single DNS server. That single server is not particularly scalable to our internet. In our real world internet, we have millions of machines trying to access apps, sites, APIs, and general content all around the world. In order to do so, they need to convert those easy-for-humans-to-understand domain names into IP addresses. A single DNS server would fall over and cry in pain if it tried to handle all that traffic.

Not only that... We have a system where we don't really trust other people/organizations to manage our domain names for us. We need to have a system where people can be autonomous in managing their domains.

## Goals

0. Understand how recursive DNS works
1. Explore and make changes to the DNS infrastructure of our internet
2. Learn how to troubleshoot DNS errors
3. Build a recursive DNS infrastructure from scratch

## Disclaimer

In previous chapters, we have taken the approach of building our internet interactively where we mixed conversations about how things worked with sections focussed on building out the infrastructure. Given the complexity of DNS and the various systems involved, it feels like that approach won't get you, our audience, to see the value until much later. So, we are taking a new approach in this chapter, where we play with a built out infrastructure to learn about the details of recursive DNS and DNS configuration more broadly. Once you understand that, we will get to build the infrastructure together!

## What is the system we are working with?

This leads us to our map. If you need help understanding this map, check out our [appendix on how to read network maps](../../../appendix/how-to-read-a-network-map.md).

![Network map of a large internetwork](./nr-recursive-dns.png)

There are some new categories of machines we have added to this network. All of the machines are part of the DNS infrastructure, including:

* Root Nameservers
* Top Level Domain (TLD) Nameservers
* Authoritative Nameservers
* Recursive Resolvers

<!-- TODO: We don't like that an appendix is load bearing to understanding of this section. Come back to it! -->
We go deeper into what roles these different machines play in the context of Recursive DNS in our [appendix on the subject](../../../appendix/recursive-dns.md).

<!--TODO: Ensure that the appendix clearly spells out why recursive DNS is useful -->

## Let's explore how this all works

As promised, we are going to teach you how to use the system before we build the system. Towards that end, we have created sections on useful or interesting things people do when it comes to managing their DNS. So let's dive right in!

### Add a new name

<!-- TODO: write a high level overview of what we're about to do -->

Our current internet has a few names already defined in the DNS. We want to add another one, `www.awesomecat.com`. For most people, they just go to the registrar to add a new name. However, we are in the business of digging deep. So we will explore what happens behind the scenes!

To get started, go ahead and `byoi-rebuild` to bring up the internet we'll be using for this chapter.

Now, where do we start? If you recall the recursive DNS lookup process, a resolver will start by asking the root server where the domain is. The root server will point the resolver to the Top Level Domain (TLD) server for that domain. In this case, `com.`. We know that the root servers in our toy internet already know where the `com.` TLD server is, so we don't need to do that step. Let's go see what the response is to a `dig` for our domain.

First, let's `hopon client-c1` so we can run our query:

```bash
root@client-c1:/# dig www.awesomecat.com

; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> www.awesomecat.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 17867
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;www.awesomecat.com.  IN A

;; AUTHORITY SECTION:
com.   3600 IN SOA tlddns-g.google.com. tlddns-g.google.com. 2024041501 3600 900 604800 86400

;; Query time: 7 msec
;; SERVER: 1.2.0.100#53(1.2.0.100) (UDP)
;; WHEN: Wed Nov 06 21:23:54 UTC 2024
;; MSG SIZE  rcvd: 99
```

Ok, there's several things we learn from this response. First, `status: NXDOMAIN` and `ANSWER: 0` tells us that this domain does not yet exist on our toy internet. Then, in the `AUTHORITY SECTION`, we see that the last machine our recursive resolver could hit was the `com.` TLD server:

```bash
com.   3600 IN SOA tlddns-g.google.com. tlddns-g.google.com. 2024041501 3600 900 604800 86400
```

This also tells us the name of the TLD server for `com.`: `tlddns-g.google.com.`. Now we know we need to `hopon tlddns-g` in order to start adding our DNS records for `www.awesomecat.com`. The software that we use to run our DNS servers for this toy internet is called [knot](https://www.knot-dns.cz/). If you didn't know the software that was running, you could run a simple `netstat` command:

```bash
root@tlddns-g:/# netstat -tulpn
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 8.2.0.100:53            0.0.0.0:*               LISTEN      20/knotd
tcp        0      0 127.0.0.11:39525        0.0.0.0:*               LISTEN      -
udp        0      0 8.2.0.100:53            0.0.0.0:*                           20/knotd
udp        0      0 8.2.0.100:53            0.0.0.0:*                           20/knotd
udp        0      0 127.0.0.11:34177        0.0.0.0:*                           -
```

You'll notice that `knotd` is running on port `53` on a number of these lines (both TCP and UDP). Port 53 is the standard port used for all DNS queries. This confirms that we're running `knot` as our DNS server.

Now, let's look at what the full command is that started this process:

```bash
root@tlddns-g:/# ps aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   3924  2944 ?        Ss   19:38   0:00 /bin/bash /dns-start-up.sh
root          20  0.1  0.0 1546476 6176 ?        Ssl  19:38   0:00 /usr/sbin/knotd --config /config/knot.conf --daemonize
root          21  0.0  0.0   2484  1152 ?        S    19:38   0:00 /usr/bin/sleep infinity
root          38  0.0  0.0   4188  3456 pts/0    Ss   19:39   0:00 /bin/bash
root          50 25.0  0.0   8088  4096 pts/0    R+   19:45   0:00 ps aux
```

So, here we see `/usr/sbin/knotd --config /config/knot.conf --daemonize`, which tells us that the knot server was started using the config file in `/config/knot.conf`. Let's take a look at that file.

```bash
root@tlddns-g:/# cat /config/knot.conf
# Define the server options
server:
  listen: 8.2.0.100@53

# Define the zone
zone:
  - domain: com
    file: "/etc/knot/com.zone"
    storage: "/var/lib/knot"
```

The first thing to notice is that knot is only listening for requests that come in on IP address `8.2.0.100` on port `53`. The IP address there is the address for this machine on our toy internet.

Then we have a list of [zones](../../../chapters/glossary.md#dns-zone). In this config, there is only one zone: `com`. When this server receives a DNS request for a domain, it will check the next label of the name (`awesomecat`) against the file for that zone, `"/etc/knot/com.zone"`. If it finds the name in that file, it can send back the IP address for the server that is the authority over that next label. So let's take a look what currently exists in the `com` zonefile:

```bash
root@tlddns-g:/# cat /etc/knot/com.zone
$ORIGIN com.
@       IN SOA (
                tlddns-g.google.com.     ; MNAME
                tlddns-g.google.com.     ; RNAME
                2024041501               ; serial
                3600                     ; refresh (1 hour)
                900                      ; retry (15 minutes)
                604800                   ; expire (1 week)
                86400                    ; minimum (1 day)
                )

; Top-level domain delegations
com.    IN NS   tlddns-g.google.com.

; All the labels that the TLD knows about
comcast         IN NS  authoritative-s.supercorp.com.
supercorp       IN NS  authoritative-s.supercorp.com.
aws             IN NS  authoritative-a.aws.com.
google          IN NS  authoritative-a.aws.com.

; glue records for the authoritative DNS servers that the TLD knows about
; i.e. if google is using the same authoritative server as aws, it's one glue record
authoritative-a.aws.com.           IN A   4.1.0.100
authoritative-s.supercorp.com.     IN A   9.1.0.100
```

The first thing we should look at is the block for the `SOA`, or Start of Authority. An SOA record indicates to any interested party which server is the authority over all records within a particular zone. In this case, the zone is `com`, and the server is our `tlddns-g.google.com` server.

The next set of records that we see look like what we would expect in the `ANSWER` section of a `dig`. The type of record we see for `com.`, `comcast`, `supercorp`, etc are all `NS` records, which stands for NameServer records. This record type tells resolvers that we haven't reached the end of our yet. Instead, send another query to the server that is the authority over the next label.

If you look at `comcast`, for example, you'll see that it's pointing to `authoritative-s.supercorp.com.`, which you'll find in the Supercorp network of our network map. But, that name doesn't actually help the resolver make it's query. The resolver still needs an IP address to know where to send it's next DNS query. A few lines below, we see the glue records for the authoritative servers on our toy internet. Glue records are A or AAAA records that point to another server that a resolver will need to query in order to continue the process of resolving a name. By including the IP addresses for the authoritative servers in this zone file, the DNS server can respond to DNS queries for names it knows about with BOTH the NS record and the IP address for the server the resolver needs to query next.

So the next thing we need to do is add our `awesomecat` label to this zone file. We want to use the `authoritative-a` server in our AWS network as the authority for this name. Add a new line below the entry for `google` that looks like:

```unset
awesomecat      IN NS  authoritative-a.aws.com.
```

Note: Why aren't we including the `com.` after each of our labels? If you look at the beginning of the file, you'll see a line, `$ORIGIN com.`. This tells our DNS server to add the `com.` label to any entry that does not already include it.

OK, let's make sure we added this record correctly. But... we added a new entry to a file that knot loaded on startup. That means if we run our `dig` again now, we'll still see that the resolver was only able to make it as far as `tlddns-g`. Because even though we added the entry to the file, knot still doesn't know about it. We need to make sure knot on `tlddns-g` knows about the new entry, but we need to do that without interrupting any potential traffic on our super busy toy internet. Let's use the `kill -HUP` command, which tells the machine to re-read any config files for the process.

First, let's get the process ID again:

```bash
root@tlddns-g:/# ps aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   3924  2944 ?        Ss   19:38   0:00 /bin/bash /dns-start-up.sh
root          20  0.1  0.0 1546476 6176 ?        Ssl  19:38   0:00 /usr/sbin/knotd --config /config/knot.conf --daemonize
root          21  0.0  0.0   2484  1152 ?        S    19:38   0:00 /usr/bin/sleep infinity
root          38  0.0  0.0   4188  3456 pts/0    Ss   19:39   0:00 /bin/bash
root          50 25.0  0.0   8088  4096 pts/0    R+   19:45   0:00 ps aux
```

We can see that knot is process ID is `20`. Let's run our command:

```bash
kill -HUP 20
```

Now we can run our `dig` again, but let's make a minor adjustment. With `dig`, we can tell the command exactly which server to send the query to. We know that we just added this name to the `tlddns-g.google.com` server, so let's run this:

```bash
root@tlddns-g:/# dig www.awesomecat.com @tlddns-g.google.com

; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> www.awesomecat.com @tlddns-g.google.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 23289
;; flags: qr rd; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 2
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;www.awesomecat.com.  IN A

;; AUTHORITY SECTION:
awesomecat.com.  3600 IN NS authoritative-a.aws.com.

;; ADDITIONAL SECTION:
authoritative-a.aws.com. 3600 IN A 4.1.0.100

;; Query time: 0 msec
;; SERVER: 8.2.0.100#53(tlddns-g.google.com) (UDP)
;; WHEN: Fri Nov 08 19:58:33 UTC 2024
;; MSG SIZE  rcvd: 97
```

Look at that! We don't have an answer, but we have a new response in our `AUTHORITY` section! This shows that `tlddns-g` know that a resolver should go ask `authoritative-a.aws.com` about any record pertaining to `awesomecat.com`. AND! We see the glue records included in the `ADDITIONAL` section. This tells the resolver where to send the query without having to first resolve `authoritative-a.aws.com`. Neat!

Now that the `com.` nameserver knows where to send a resolver asking for `awesomecat.com`, we need tell that authoritative server how to respond to those queries. Let's `hopon authoritative-a` and open the config file we found previously for knot configs, `/config/knot.conf`:

```unset
# Define the server options
server:
  listen: 4.1.0.100@53

# Define the zone
zone:
  - domain: aws.com
    file: "/etc/knot/aws.com.zone"
    storage: "/var/lib/knot"
  - domain: aws.net
    file: "/etc/knot/aws.net.zone"
    storage: "/var/lib/knot"
  - domain: aws.org
    file: "/etc/knot/aws.org.zone"
    storage: "/var/lib/knot"
  - domain: google.com
    file: "/etc/knot/google.com.zone"
    storage: "/var/lib/knot"
  - domain: isc.org
    file: "/etc/knot/isc.org.zone"
    storage: "/var/lib/knot"
  - domain: zayo.net
    file: "/etc/knot/zayo.net.zone"
    storage: "/var/lib/knot"
```

On this server, we see significantly more zones than we saw on the `com.` server! We need to add a new zone for our `awesomecat` zone:

```unset
  - domain: awesomecat.com
    file: "/etc/knot/awesomecat.com.zone"
    storage: "/var/lib/knot"
```

Ok, so now we're referencing a file that doesn't exist. Let's create that file. You can paste the following command wholesale into your terminal:

```bash
cat << ZONEFILE > /etc/knot/awesomecat.com.zone
\$ORIGIN awesomecat.com.
@       IN SOA (
                host-dns.awesomecat.com.; MNAME
                admin.awesomecat.com.   ; RNAME
                2024111501              ; serial
                3600                    ; refresh (1 hour)
                900                     ; retry (15 minutes)
                604800                  ; expire (1 week)
                86400                   ; minimum (1 day)
                )

www      IN A      4.2.0.11
ZONEFILE
```

In this file, we're following the same structure we saw previously in defining the `ORIGIN` and the `SOA` record. Then we're adding a new record for the `www` label. Let's see this in action! We wanna run another `dig` to resolve the name for `www.awesomecat.com`. But, just like we saw before, we need to restart the knot process on this machine. The PID, or process ID, will likely be a different number than it was on `tlddns-g`. Run your `ps aux` to find the process ID and `kill -HUP` that process.

Now, let's run our `dig`!

```bash
root@authoritative-a:/# dig www.awesomecat.com

; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> www.awesomecat.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 30015
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;www.awesomecat.com.  IN A

;; ANSWER SECTION:
www.awesomecat.com. 3600 IN A 4.2.0.11

;; Query time: 39 msec
;; SERVER: 4.1.0.101#53(4.1.0.101) (UDP)
;; WHEN: Tue Nov 12 19:49:31 UTC 2024
;; MSG SIZE  rcvd: 63
```

There it is! We did it!

Now, let's go back to our `client-c1` and see if we can successfully resolve the name there! `hopon client-c1` again and re-run your `dig`. What happens?

```bash
root@client-c1:/# dig www.awesomecat.com

; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> www.awesomecat.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 8222
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;www.awesomecat.com.  IN A

;; AUTHORITY SECTION:
com.   2475 IN SOA tlddns-g.google.com. tlddns-g.google.com. 2024041501 3600 900 604800 86400

;; Query time: 0 msec
;; SERVER: 1.2.0.100#53(1.2.0.100) (UDP)
;; WHEN: Tue Nov 12 19:58:27 UTC 2024
;; MSG SIZE  rcvd: 99
```

Ok... What do you think might have happened there?

Let's talk a little bit about caching. Caching is actually a really common problem with DNS changes. Because DNS changes are fairly infrequent, most people set the ttl for their DNS entries fairly high, sometimes even longer than a full day. This means that when make a change on The Real Internet, it might not propagate as quickly as you might expect.

So, if we know that the issue is caching, which machine do you think might be caching the DNS response from earlier? Which machine is responsible for persisting in making queries until we have a DNS response?

When you figure out which machine you need to reset, you'll need to reset the resolving software. We picked a software called `unbound`. You'll use the same trick we just used with knot, namely, run `kill -HUP` on the process ID for unbound.

If you're not sure which machine to go to, check the [super secret answer section](#reset-unbound) below.

### Add a new TLD

Okay, so we did this process of adding a new name. We're going to take this a little deeper and add an entire new TLD. What's the best plan of attack for how to do this? Well, we started the last section by performing a name-lookup from a client and seeing what the recursive name-resolver did to try to resolve that name. We then found where that failed and fixed it. We're going to do the same thing now with a new top-level domain.

First, let's pick a new top-level domain that hasn't been implemented yet. So far, we've got `.com`, `.net` and `.org`. So let's pick something else. How about `.meow`. That sounds fun, and this is our little internet, and we can do whatever top-level domains we want. Even though `.meow` is not a real Internet top-level domain, we feel that it should it be and is a growth-opportunity for the "real" internet.

Now that you've spent some time playing with DNS and making some small changes, you're probably ready to start by just imagining how name-resolution actions take place on the internet in order to figure out where to begin. Let's therefore just start by thinking about this process. If you need to review, check out the [appendix document on how a DNS-lookup is performed](../../../appendix/recursive-dns.md) for a refresher.

First, we started with a client (e.g. `client-c1`). Let's say it attempts to resolve the name `pippin.meow`. What happens?

1. `client-c1` sends a request to its local recursive resolver, `resolver-c`.
2. `resolver-c` has never seen `pippin.meow` before, nor has it ever seen any `.meow` address to be resolved, so it starts at a root server (e.g. `rootdns-n` or `rootdns-i`)
3. When the name-resolution request goes to either of these servers, what do you think is going to happen?

Well, neither of those name-servers have ever heard of the `.meow` TLD, so they're probably going to error. Let's hopon one of those root-level name servers and double-check that this is the case!

```bash
root@rootdns-i:/# dig @100.0.1.100 meow.

; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> @100.0.1.100 meow.
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 46536
;; flags: qr aa rd; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;meow.                          IN      A

;; AUTHORITY SECTION:
.                       86400   IN      SOA     rootdns-i.isc.org. rootdns-i.isc.org. 2024080901 1800 900 604800 86400

;; Query time: 0 msec
;; SERVER: 100.0.1.100#53(100.0.1.100) (UDP)
;; WHEN: Mon Nov 18 19:42:01 UTC 2024
;; MSG SIZE  rcvd: 85
```

Okay, this is what we expected: the root DNS server replied with an `NXDOMAIN`, telling us that the `.meow` name does not exist. Since root DNS servers are the "authoritative" servers over all top-level domains, this server can say definitively that this name will never resolve.

#### How do we fix this?

This should feel very similar to adding the `awesomecat.com` name to the `.com` TLD server. In that case, we told the `.com` DNS server where it could go find records for the `awesomecat` label.

In our current case, since we have *two* root-dns servers, we're going to need to make the changes in two different places. This is a difference between our current exercise and the previous one where we added `awesomecat.com`. You may recognize that, had our internet been more like the "real" internet, we would have had a number of `.com` servers that we would have had to have updated to make that case work as well.

Okay, so let's start by fixing this server, then we'll worry about the other root dns server. Finally, we're going to set up the `.meow` TLD server.

We're going to do the same thing we did last time, namely, modify the knot configuration for this server. Let's start by looking at the config of this server:

```bash
root@rootdns-i:/# cat /config/knot.conf
# Define the server options
server:
  listen: 100.0.1.100@53

# Define the zone
zone:
  - domain: .
    file: "/etc/knot/root.zone"
    storage: "/var/lib/knot"
```

Okay, so we see that this server is ready to answer requests for the name `.`, which is just another way of saying "this is a root DNS server." Let's take a look at what's inside that config file that's being referenced under the `.` domain:

```bash
root@rootdns-i:/# cat /etc/knot/root.zone
; Root zone file for example root server
$ORIGIN .
$TTL 86400 ; 1 day

; Root zone SOA record
@ IN SOA rootdns-i.isc.org. rootdns-i.isc.org. (
        2024080901 ; serial number
        1800       ; refresh (30 minutes)
        900        ; retry (15 minutes)
        604800     ; expire (7 days)
        86400      ; minimum (1 day)
)

; Root name server records
       IN NS  rootdns-i.isc.org.
       IN NS  rootdns-n.netnod.org.

; Glue records for root name servers
rootdns-n.netnod.org.   IN A 101.0.1.100
rootdns-i.isc.org.      IN A 100.0.1.100

; Top-level domain delegations
net.  IN NS tlddns-v.verisign.net.
com.  IN NS tlddns-g.google.com.
org.  IN NS tlddns-n.netnod.org.

; Glue records for TLD servers
tlddns-v.verisign.net.  IN A 102.0.1.100
tlddns-g.google.com.    IN A 8.2.0.100
tlddns-n.netnod.org.    IN A 101.0.1.101
```

# Exercises

* watching tcp dump of name resolution

* add a new name
* add a new tld
* zone cut at a higher level
* Common DNS issues debugging
  * Leave a DNS entry in a zone file that does not have the dot at the end of it
  * Have a screwed up resolv.conf file (e.g. point to an non-existent recursive resolver)
* bad.horse

NOTES:
Lots of different use-cases:

1. A simple IP address for a single host
2. Multiple names on a single host
3. Multiple IP addresses for a single host
4. A name that resolves to multiple IP addresses
5. Names that differ Inside and outside

## how do I build this from the ground up

## Watch recursive resolution using tcpdump

## Answer Section

If you got stuck figuring out any of our challenges, this is the section where we provide more detail.

### Reset Unbound

When a client makes a DNS request, the recursive resolver that it points to is the one responsible for actually finding the DNS records. If you look at the network map, the resolver that lives in each network will be the recursive resolver for that network. So, if we need to reset the cache for queries client-c1 is making, you would need to `hopon recursive-c`.
