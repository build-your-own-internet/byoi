# Recursive DNS

In our previous chapter, we made a promise that we were going to build out a solution that could scale to the entire internet. But then, all we did was build a single DNS server. That single server is not particularly scalable to our internet. In our real world internet, we have millions of machines trying to access apps, sites, APIs, and general content all around the world. In order to do so, they need to convert those easy-for-humans-to-understand domain names into IP addresses. A single DNS server would fall over and cry in pain if it tried to handle all that traffic.

Not only that... We have a system where we don't really trust other people/organizations to manage our domain names for us. We need to have a system where people can be autonomous in managing their domains.

## Goals

0. define and differentiate recursive DNS
1. set up multiple DNS servers each responsible for their own subset of zones (apex domains)
2. build out root servers and TLD servers that will point requests to the correct DNS server for the apex domain

This leads us to our map:

![Network map of a large internetwork](./nr-recursive-dns.png)

Talk about the DNS servers, etc. and what they do.

We just made a diagram of what a basic internet-scale name-resolution request looks like. Now we're going to build it out. Then we're going to talk about it.

Step 1.

> ASIDE: why do we need so many types of DNS servers? 
> Talk about what a DNS lookup is and how it works.

This is a great document: https://howdns.works/ep3/

Put a bunch of DNS names and attach them to servers in the image.

Lots of different use-cases:

1. A simple IP address for a single host
2. Multiple names on a single host
3. Multiple IP addresses for a single host
4. A name that resolves to multiple IP addresses
5. Names that differ Inside and outside 


TODOS:

- Stretch goal: ZONE CUTS!


WHERE WE LEFT OFF:

1. DNS is using the correct Dockerfile_dns stuff to build its images. DONE
1. We need to get knot automatically turned on and running on each of the DNS servers.
1. Configure authoritative DNS servers.
1. Configure TLD servers to know where the authoritative DNS servers are.
1. Configure root servers to know where the TLD servers are.
1. Configure recursive resolvers to know where the root servers are.
1. Configure the hosts to know where the recursive resolvers are.
1. Spend some time defining zones: which machines are in charge of which zones.
1. What's the best way to add records to a zone?

Our TLDs are going to be .net, .org, and begrudginly .com

This is a friendly net where all names are resolvable

Get one thing working - a single tld, a single root server and a single authoritative dns server with recursive resolver resolving names

.net is what we picked
resolver-a is the recursive resolver
rootdns-n is the root dns server
tlddns-n is the tld server
authoritative-a is the authoritative dns

## Known-Unknowns
- How do we configure recursive resolvers to know where the root servers are?
- How do we configure root servers so they send responses that indicates that they need to recurse their queries to the TLD resolvers?
- How do we configure recursive resolvers to recurse?

## Building out the plumbing

Different knot.conf files for each server

Listing servers that are destination addresses:
Who is the TLD DNS for .net, .org, .com?

- netnod is .org
- verizon is .com
- google is .net

Listing servers that are recursive resolvers:
- 

# Shit we are attempting to do
hopon rootdns-n

dig www.isc.net @101.0.1.100
-> WE expect to get a response that indicates that google is the TLD for .net

dig www.isc.net @8.2.0.100
-> we expect to get a response that aws is the authoritative for ISC.net AND we expect to get a GLUE record to tell us what the IP address of that server is.

NOTE: the tld must match the name that is being requested, otherwise we don't get the glue record. (e.g. if we're asking a .com record for a .net TLD server, we don't get a glue record)
FURTHER NOTE: ☝️ this is actually bullshit.

dig i2.isc.net @4.1.0.100

## WHERE WE LEFT OFF

1. We seem to have successfully configured the recursive resolver to resolve names on resolver-g
2. We cannot actually ping either of the root DNS server from resolver-g. So we should probably fix that first.