# Recursive DNS

In our previous chapter, we made a promise that we were going to build out a solution that could scale to the entire internet. But then, all we did was build a single DNS server. That single server is not particularly scalable to our internet. In our real world internet, we have millions of machines trying to access apps, sites, APIs, and general content all around the world. In order to do so, they need to convert those easy-for-humans-to-understand domain names into IP addresses. A single DNS server would fall over and cry in pain if it tried to handle all that traffic.

Not only that... We have a system where we don't really trust other people/organizations to manage our domain names for us. We need to have a system where people can be autonomous in managing their domains.

## Goals

0. Understand how recursive DNS works
1. Explore and make changes to the DNS infrastructure of our internet
2. Learn how to troubleshoot DNS errors
3. Build a recursive DNS infrastructure from scratch

## Disclaimer

In previous chapters, we have taken the approach of building our internet interactively where we mixed conversations about how things worked with sections focused on building out the infrastructure. Given the complexity of DNS and the various systems involved, it feels like that approach won't get you, our audience, to see the value until much later. So, we are taking a new approach in this chapter, where we play with a built out infrastructure to learn about the details of recursive DNS and DNS configuration more broadly. In actually managing the DNS system, you'll have an opportunity to see how it all fits together. By the end, we'll ask you to add new elements to the system which will give you the experience of building the system out.

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

Okay, so let's start by fixing the server we're alreayd looking at, then we'll worry about the other root dns server. Finally, we'll need to set up the `.meow` TLD server.

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

So, there's a few things going on in this file. A lot of this looks similar to the zonefiles we edited in the previous section. First, we can see that the root servers are defined with the following lines:

```bash
       IN NS  rootdns-i.isc.org.
       IN NS  rootdns-n.netnod.org.
```

This says that any request for a root server can go to either `rootdns-i.isc.org.` OR `rootdns-n.netnod.org.`. In practice, your resolve will most likely send requests to both. This means that if a path is broken or conjested to one server, the resolver still has an opportunity to get a timely response from the other. In The Real Internet, there are 13 root server names. Each of those 13 root server names is used to identify multiple machines that function as root servers. This adds layers upon layers of redundancy to make sure the system as a whole has as close to 100% up time as possible.

The next lines are the glue records for the root servers. As a reminder, glue records speed up query time by providing an IP address for the name of the next machine the resolver needs to query.

Then we start seeing some TLD designations for `net.`, `com.`, and `org.`. We want to add a new TLD, so we'll add a new line there for `meow.`. We'll also want to add the glue record for the machine we're designating as responsible for `meow.` below that. But how do we know what that machine is? Let's go back and look at the network diagram at the beginning of this chapter. In the AWS network at the top of the diagram, there's an unlabeled TLD server. We're going to use that machine as our new `meow.` TLD server!

Let's add the following records to our root zone file on `rootdns-i`:

```bash
meow. IN NS tlddns-a.aws.meow.
```

```bash
tlddns-a.aws.meow.      IN A 4.3.0.14
```

As we discussed previously, `knot` loads these config files at startup. Which means it doesn't know about our changes until we tell it that there are new files to load. We did this previously by running our `ps aux` to find `knot`'s process ID, then running `kill -HUP <process_ID>` to gracefully restart the knot server.

Once you've done that, you should be able to make a query to the root DNS server for the new TLD entry and be pointed to `tlddns-a.aws.meow.` for your next step:

```bash
root@rootdns-i:/# dig @100.0.1.100 meow.

; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> @100.0.1.100 meow.
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 58314
;; flags: qr rd; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 2
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;meow.    IN A

;; AUTHORITY SECTION:
meow.   86400 IN NS tlddns-a.aws.meow.

;; ADDITIONAL SECTION:
tlddns-a.aws.meow. 86400 IN A 4.3.0.14

;; Query time: 0 msec
;; SERVER: 100.0.1.100#53(100.0.1.100) (UDP)
;; WHEN: Wed Nov 27 21:51:33 UTC 2024
;; MSG SIZE  rcvd: 76
```

Neat! Next step is to create the TLD server itself. In this case, we'll want to `hopon tlddns-a` and start configuring our `knot` server there. If we check the `/config/knot.conf` file, you'll see that we currently only have the `server` itself defined. We'll need to add the zone at the end of the file:

```bash
# Define the zone
zone:
  - domain: meow
    file: "/etc/knot/meow.zone"
    storage: "/var/lib/knot"
```

Now that we've told `knot` where to find the file for the zone, we should actually go and make that file! Let's `vim /etc/knot/meow.zone` and add the zone content we want for this TLD.

```bash
$ORIGIN meow.
@       IN SOA (
                tlddns-a.aws.meow.       ; MNAME
                tlddns-a.aws.meow.       ; RNAME
                2024041501               ; serial
                3600                     ; refresh (1 hour)
                900                      ; retry (15 minutes)
                604800                   ; expire (1 week)
                86400                    ; minimum (1 day)
                )

; Top-level domain delegations
meow.    IN NS   tlddns-a.aws.meow.

; All the labels that the TLD knows about
pippin         IN NS  authoritative-s.supercorp.meow.

; glue records for the authoritative DNS servers that the TLD knows about
; i.e. if google is using the same authoritative server as aws, it's one glue record
authoritative-a.aws.meow.           IN A   4.1.0.100
authoritative-s.supercorp.meow.     IN A   9.1.0.100
```

<!-- TODO: we still need to figure out how to 'fix' needing an authoritative server with the same TLD as our domain. If we can't let's add a section on why we can't... -->

We've already discussed a lot of what's going on here in previous sections. The thing to notice here is that we've added a new subdomain, `pippin.meow`, which will be served out of the `authoritative-s` DNS server. Tell your `knot` server that it needs to reload its config files, then let's run a `dig` on `pippin.meow`:

```bash
root@tlddns-a:/# dig @4.3.0.14 pippin.meow.

; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> @4.3.0.14 pippin.meow.
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12690
;; flags: qr rd; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 2
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;pippin.meow.   IN A

;; AUTHORITY SECTION:
pippin.meow.  3600 IN NS authoritative-s.supercorp.meow.

;; ADDITIONAL SECTION:
authoritative-s.supercorp.meow. 3600 IN A 9.1.0.100

;; Query time: 0 msec
;; SERVER: 4.3.0.14#53(4.3.0.14) (UDP)
;; WHEN: Wed Nov 27 22:34:46 UTC 2024
;; MSG SIZE  rcvd: 96
```

Ok, so far we've:

* [x] configured the root server to know about the TLD server
* [x] configured the TLD server to know about it's zone
* [x] added a subdomain, `pippin` to the `meow` zone

Now we need to go tell the authoritative server we selected, `authoritative-s`, how to answer DNS queries for `pippin.meow`. When you `hopon authoritative-s`, we'll need to start by telling the knot server that it has a new zone it needs to answer for. We'll do that by adding the following to `/config/knot.conf`:

```bash
  - domain: pippin.meow
    file: "/etc/knot/pippin.meow.zone"
    storage: "/var/lib/knot"
```

Again, once we've added the zone, we'll need to create the zonefile and add the DNS records to it. So create and edit the file we pointed to for our zone, `/etc/knot/pippin.meow.zone`, and add the following:

```bash
$ORIGIN pippin.meow.
@       IN SOA (
                host-dns.pippin.meow.   ; MNAME
                admin.pippin.meow.      ; RNAME
                2024041501              ; serial
                3600                    ; refresh (1 hour)
                900                     ; retry (15 minutes)
                604800                  ; expire (1 week)
                86400                   ; minimum (1 day)
                )

@          IN A    4.2.0.11
www        IN A    4.2.0.11
```

In this zonefile, we're adding A records for both `pippin.meow` and `www.pippin.meow` that point to the server at `4.2.0.11`. Now, let's tell our knot on this server that it has new config files and let's check our work!

```bash
root@authoritative-s:/# dig www.pippin.meow

; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> www.pippin.meow
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 34614
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;www.pippin.meow.  IN A

;; ANSWER SECTION:
www.pippin.meow. 3600 IN A 4.2.0.11

;; Query time: 3 msec
;; SERVER: 9.2.0.100#53(9.2.0.100) (UDP)
;; WHEN: Wed Nov 27 23:19:25 UTC 2024
;; MSG SIZE  rcvd: 60
```

Would you look at that! We got our whole lookup done now! Congratulations team!

NOTE: We hacked this together a little... We used glue records in the zonefile we created for `meow.` to point our resolvers to the authoritative servers. But those actual records don't exist anywhere in our DNS. We still need to go back and add actual records for `authoritative-a.aws.meow.` and `authoritative-s.supercorp.meow.`. We'll leave that as an exercise for the reader.

## Watch the recursive DNS lookup using `tcpdump`

So far, we've been building out and testing this system while relying on a piece of achitecture that we haven't addressed at all yet... The recursive resolver. The role of the resolver in the DNS process is keep asking each machine it's pointed to the DNS query it's trying to resolve until it gets an answer. 

Now that we've got everything setup and working, we can hopon a resolver and watch all of the requests that are necessary to make this recursive lookup work. Let's `hopon resolver-c`. 

First though, the requests we made to prove that `www.awesomecat.com` was working have cached the responses to the various DNS queries. We need to clear that cache. The easiest way to do this is to restart the resolver software. The software we used for our resolver on this toy internet is called `unbound`. We'll use the same process we did to restart `knot`, namely, find the process ID with `ps aux` and then run `kill -HUP <process_id>`.

Once that's done, we can run our `tcpdump`. `resolver-c` only has one interface, so we can run a simple `tcpdump -n` to see all the packets running through that interface. Open a second window, `hopon client-c1` in that window, and run `dig www.awesomecat.com`. You should see A LOT of output in your `tcpdump`. Let's take it line by line:

```bash
21:11:07.561149 ARP, Request who-has 1.2.0.100 tell 1.2.0.3, length 28
21:11:07.561667 ARP, Reply 1.2.0.100 is-at 02:42:01:02:00:64, length 28
```

A standard ARP request. If you look at your network map, you'll see that `resolver-c` has IP Address `1.2.0.100`. So `1.2.0.3` (`router-c3`) is asking which machine on this network is `1.2.0.100`. The next line is `resolver-c` replying to `router-c3`'s ARP request with it's own MAC address. For more on this, checkout the [IP and MAC addresses appendix](../../../appendix/ip-and-mac-addresses.md)

```bash
21:11:07.561754 IP 1.1.0.200.48600 > 1.2.0.100.53: 48085+ [1au] A? www.awesomecat.com. (59)
```

<!-- TODO: maybe define A record beyond just the paranthetical? Or do an aside on record types?  -->
`1.1.0.200` (`client-c1`) sends a request to `1.2.0.100` (`resolver-c`) port `53` requesting the `A` records (the IPv4 records) for `www.awesomecat.com`.

```bash
21:11:07.562914 IP 1.2.0.100.47301 > 101.0.1.100.53: 35603% [1au] NS? . (28)
21:11:07.564677 IP 101.0.1.100.53 > 1.2.0.100.47301: 35603*- 2/0/3 NS rootdns-i.isc.org., NS rootdns-n.netnod.org. (123)
```

<!-- TODO: define NS/SOA records -->
`1.2.0.100` (`resolver-c`) sends a request (`>`) to `101.0.1.100` (`rootdns-n`) for the `NS` records for `.`, the root of all DNS. Then, `101.0.1.100` (`rootdns-n`) sends a reply back to `1.2.0.100` (`resolver-c`) providing the `NS` records for the root DNS servers.

```bash
21:11:07.565703 IP 1.2.0.100.23565 > 100.0.1.100.53: 29379% [1au] A? com. (32)
21:11:07.566389 IP 1.2.0.100.24580 > 101.0.1.100.53: 15555% [1au] A? org. (32)
21:11:07.566667 IP 1.2.0.100.42017 > 100.0.1.100.53: 52879% [1au] A? org. (32)
21:11:07.566698 IP 100.0.1.100.53 > 1.2.0.100.23565: 29379- 0/1/2 (78)
21:11:07.566861 IP 101.0.1.100.53 > 1.2.0.100.24580: 15555- 0/1/2 (78)
21:11:07.567274 IP 100.0.1.100.53 > 1.2.0.100.42017: 52879- 0/1/2 (78)
```

Now that `resolver-c` has confirmed where the root DNS servers are, It starts firing off requests to learn about all of the TLDs it needs to know about. It has a request from `client-c1` for a name in the `com` TLD, and it just got a response back for root server names in the `org` TLD. So we see 3 requests fired off here, each of them for `A` records for TLDs. The resolver will try to get the fastest possible response for the client. So it's spitting out requests to both of the root DNS servers here to see which response comes back first. 

Interestingly, it doesn't do the same for `com`. This is likely because we didn't clear the cache on our whole internet. If we were to restart each DNS server on our internet, we'd likely see requests for `com` to both root DNS servers.

The next 3 lines are the responses back from the root DNS servers. The actual response bodies aren't parsed here, but given what we saw in the exercises above, we know that what should be seeing DNS responses for where the `com` and `org` TLD servers are. These responses will include the IP addresses for those servers.


```bash
21:11:07.567766 IP 1.2.0.100.63263 > 8.2.0.100.53: 3546% [1au] A? awesomecat.com. (43)
```

`1.2.0.100` (`resolver-c`) sends a request to `8.2.0.100` (`tlddns-g`) for the `A` records for `awesomecat.com`.

```bash
21:11:07.568250 IP 1.2.0.100.64823 > 8.2.0.100.53: 5986% [1au] A? google.com. (39)
```

When `resolver-c` learned about the `com` TLD, it received an `NS` record that pointed it to `tlddns-g.google.com`. Our resolver is a diligent machine, so it wants to go ahead and learn everything it can about the domains it's given. So, it's gonna go ahead and fire off a request to gather the `A` records for `google.com` while it's at it.

There are more requests that are not directly tied to resolving `www.awesomecat.com`. Instead of including those in the line by line analysis, they're gonna be in a block at the end. That way they can still be documented to see the work the resolver is doing without detracting from this analysis.

```bash
21:11:07.568496 IP 8.2.0.100.53 > 1.2.0.100.63263: 3546- 0/1/2 (93)
21:11:07.568758 IP 8.2.0.100.53 > 1.2.0.100.64823: 5986- 0/1/2 (89)
```

`8.2.0.100` (`tlddns-g`) responds back to the queries `1.2.0.100` (`resolver-c`) just made. In each of these lines, you'll see a request ID: `3546` and `5986`. If you check the previous requests coming from `resolver-c`, you can find the corresponding request ID. Again, from our exercises above, we can surmise that response `3546` tells our intrepid resolver that the authoritative DNS server for `awesomecat.com` is `authoritative-a.aws.com` AND it provides the IP address for that server.

```bash
21:11:07.571062 IP 1.2.0.100.17366 > 4.1.0.100.53: 30044% [1au] A? www.awesomecat.com. (47)
```

`1.2.0.100` (`resolver-c`) sends a request to `4.1.0.100` (`authoritative-a`) for the `A` records for `www.awesomecat.com`. Remember, `resolver-c` learned about the IP address for the authoritative server for `awesomecat.com` in request `3546` above.

```bash
21:11:07.571741 IP 4.1.0.100.53 > 1.2.0.100.17366: 30044*- 1/0/1 A 4.2.0.11 (63)
```

`4.1.0.100` (`authoritative-a`) responds to `1.2.0.100` (`resolver-c`) with the `A` record (IPv4 address) for `www.awesomecat.com`.

```bash
21:11:07.572238 IP 1.2.0.100.53 > 1.1.0.200.48600: 48085 1/0/1 A 4.2.0.11 (63)
```

HERE IT IS! `1.2.0.100` (`resolver-c`) responds to `1.2.0.100` (`client-c1`) with the `A` record for `www.awesomecat.com`!!!

```bash
21:11:07.568907 IP 1.2.0.100.38858 > 101.0.1.101.53: 27609% [1au] A? isc.org. (36)
21:11:07.569231 IP 1.2.0.100.8235 > 101.0.1.101.53: 47105% [1au] A? netnod.org. (39)
21:11:07.570048 IP 101.0.1.101.53 > 1.2.0.100.38858: 27609- 0/1/2 (86)
21:11:07.570139 IP 101.0.1.101.53 > 1.2.0.100.8235: 47105- 0/1/2 (95)
21:11:07.571580 IP 1.2.0.100.65411 > 4.1.0.100.53: 3832% [1au] A? tlddns-g.google.com. (48)
21:11:07.571836 IP 1.2.0.100.55505 > 8.2.0.100.53: 5910% [1au] A? aws.com. (36)
21:11:07.571993 IP 4.1.0.100.53 > 1.2.0.100.65411: 3832*- 1/0/1 A 8.2.0.100 (64)
21:11:07.572115 IP 8.2.0.100.53 > 1.2.0.100.55505: 5910- 0/1/2 (82)
21:11:07.572551 IP 1.2.0.100.62758 > 4.1.0.100.53: 31932% [1au] A? rootdns-i.isc.org. (46)
21:11:07.572799 IP 1.2.0.100.32820 > 9.1.0.100.53: 4137% [1au] A? rootdns-n.netnod.org. (49)
21:11:07.573039 IP 4.1.0.100.53 > 1.2.0.100.62758: 31932*- 1/0/1 A 100.0.1.100 (62)
21:11:07.573852 IP 1.2.0.100.46722 > 101.0.1.101.53: 22786% [1au] A? aws.org. (36)
21:11:07.574126 IP 1.2.0.100.44934 > 9.1.0.100.53: 54086% [1au] A? tlddns-n.netnod.org. (48)
21:11:07.574201 IP 9.1.0.100.53 > 1.2.0.100.32820: 4137*- 1/0/1 A 101.0.1.100 (65)
21:11:07.574413 IP 1.2.0.100.3370 > 101.0.1.101.53: 38333% [1au] A? supercorp.org. (42)
21:11:07.574967 IP 101.0.1.101.53 > 1.2.0.100.3370: 38333- 0/1/2 (88)
21:11:07.575037 IP 9.1.0.100.53 > 1.2.0.100.44934: 54086*- 1/0/1 A 101.0.1.101 (64)
21:11:07.575483 IP 1.2.0.100.61919 > 4.1.0.100.53: 61000% [1au] AAAA? tlddns-g.google.com. (48)
21:11:07.575752 IP 1.2.0.100.23152 > 9.1.0.100.53: 55587% [1au] AAAA? rootdns-n.netnod.org. (49)
21:11:07.575821 IP 4.1.0.100.53 > 1.2.0.100.61919: 61000*- 0/1/1 (110)
21:11:07.576220 IP 101.0.1.101.53 > 1.2.0.100.46722: 22786- 0/1/2 (82)
21:11:07.576389 IP 9.1.0.100.53 > 1.2.0.100.23152: 55587*- 0/1/1 (100)
21:11:07.576522 IP 1.2.0.100.63540 > 4.1.0.100.53: 40116% [1au] A? authoritative-a.aws.com. (52)
21:11:07.576808 IP 1.2.0.100.5870 > 4.1.0.100.53: 21740% [1au] AAAA? rootdns-i.isc.org. (46)
21:11:07.577081 IP 4.1.0.100.53 > 1.2.0.100.63540: 40116*- 1/0/1 A 4.1.0.100 (68)
21:11:07.577598 IP 4.1.0.100.53 > 1.2.0.100.5870: 21740*- 0/1/1 (97)
21:11:07.577657 IP 1.2.0.100.11703 > 9.1.0.100.53: 627% [1au] A? authoritative-s.supercorp.org. (58)
21:11:07.578017 IP 1.2.0.100.47500 > 9.1.0.100.53: 44209% [1au] AAAA? tlddns-n.netnod.org. (48)
21:11:07.578748 IP 9.1.0.100.53 > 1.2.0.100.47500: 44209*- 0/1/1 (99)
21:11:07.578987 IP 1.2.0.100.30900 > 4.1.0.100.53: 39480% [1au] A? authoritative-a.aws.org. (52)
21:11:07.579661 IP 4.1.0.100.53 > 1.2.0.100.30900: 39480*- 1/0/1 A 4.1.0.100 (68)
21:11:07.579704 IP 1.2.0.100.11194 > 4.1.0.100.53: 22773% [1au] AAAA? authoritative-a.aws.com. (52)
21:11:07.580008 IP 9.1.0.100.53 > 1.2.0.100.11703: 627*- 1/0/1 A 9.1.0.100 (74)
21:11:07.580042 IP 4.1.0.100.53 > 1.2.0.100.11194: 22773*- 0/1/1 (103)
21:11:07.580656 IP 1.2.0.100.11952 > 4.1.0.100.53: 39941% [1au] AAAA? authoritative-a.aws.org. (52)
21:11:07.581053 IP 1.2.0.100.28276 > 9.1.0.100.53: 10771% [1au] AAAA? authoritative-s.supercorp.org. (58)
21:11:07.581247 IP 4.1.0.100.53 > 1.2.0.100.11952: 39941*- 0/1/1 (103)
21:11:07.581636 IP 9.1.0.100.53 > 1.2.0.100.28276: 10771*- 0/1/1 (109)
21:11:12.817070 ARP, Request who-has 1.2.0.3 tell 1.2.0.100, length 28
21:11:12.820482 ARP, Reply 1.2.0.3 is-at 02:42:01:02:00:03, length 28
```

Dear lord... `resolver-c` just wants to know everything abou the internet. Each of these packets is part of `resolver-c` attempting to either learn about domains that were tangentially related to its attempt to resolve `www.awesomecat.com`. Plus there's some ARP request to learn about `router-c3` there at the end.

## Final Exercises

Now that we've built out some of the infrastructure together, take a stab at adding a few more elements to this toy internet. We've added a new network, RIPE, to our network map.

![Network map including the RIPE network](./final-exercises.svg)

Configure the rootdns and resolver in the RIPE network to do the jobs we've assigned to them! In each case, it would be helpful to go check (and potentially copy) the config files for similar machines on our internet.

### Configure the resolver

We looked briefly at the software `unbound` and how it makes recursive requests to resolve DNS queries. But... how does it even know where to start? Every recursive resolver software, including `unbound`, uses a file called `root.hints` that tells it what the names and IP addresses of the root servers are. When it has no idea where to go to request information about a name, it will start by talking to one of the root servers.

Your task for this configuration is the following:

* `hopon` one of the other recursive resolvers (e.g. `resolver-g`) and examine the config files for unbound
  * `/etc/unbound/unbound.conf`
  * `/etc/unbound/root.hints`
* duplicate the configuration on `resolver-r` including the `root.hints` file
* tell `unbound` to load the config changes (`kill -HUP <process-id>`)
* configure the nameserver for each machine on the Ripe network (the `resolv.conf` file) to point at the new `resolver-r` address `103.0.1.101`

Once you've got your resolver correctly configured, test it out!

* `dig resolver-g.google.com`
* `dig client-c1.comcast.com`
* `dig rootdns-n.netnod.org`
* `dig tlddns-v.verisign.org`

### Configure the Root DNS server

We've added a TLD server, but we can go even deeper on our toy internet. For your next exercise, build out a root DNS server!

Start by looking at the `knot` config and zonefiles for one of the other root servers (e.g. `rootdns-i`). Mimic that setup on `rootdns-r`. You'll need to tell `knot` to reload the config files once you've got them on the server. Test that `rootdns-r` can point requests to the correct TLD with `dig @103.0.1.100 com.`. 

Once you know you've got `rootdns-r` setup correctly and working, make sure you go back to each of the other root DNS servers and add the entry for `rootdns-r` to it. You'll also need to update the `root.hints` files for each resolver on the toy internet. Remember to tell the software to reload the configs on each machine you touch!

## Answer Section

If you got stuck figuring out any of our challenges, this is the section where we provide more detail.

### Reset Unbound

When a client makes a DNS request, the recursive resolver that it points to is the one responsible for actually finding the DNS records. If you look at the network map, the resolver that lives in each network will be the recursive resolver for that network. So, if we need to reset the cache for queries client-c1 is making, you would need to `hopon recursive-c`.
