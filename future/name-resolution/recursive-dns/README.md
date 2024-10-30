# Recursive DNS

In our previous chapter, we made a promise that we were going to build out a solution that could scale to the entire internet. But then, all we did was build a single DNS server. That single server is not particularly scalable to our internet. In our real world internet, we have millions of machines trying to access apps, sites, APIs, and general content all around the world. In order to do so, they need to convert those easy-for-humans-to-understand domain names into IP addresses. A single DNS server would fall over and cry in pain if it tried to handle all that traffic.

Not only that... We have a system where we don't really trust other people/organizations to manage our domain names for us. We need to have a system where people can be autonomous in managing their domains.

## Goals

0. Understand how recursive DNS works
1. Explore and make changes to the DNS infrastructure of our internet
2. Learn how to troubleshoot DNS errors
3. Build a recursive DNS infrastructure from scratch

## What is the system we are working with?

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

Outline

# Introduction (Recursive DNS)

- concept
- why it is useful
- how it is done (this is the slide section from tech summit)

# Overview of hosts

- types of DNS servers
    * root
    * authoritative
    * tld
    * resolvers

DNS setup in general

# Exercises
- watching tcp dump of name resolution
- add a new name
- add a new tld
- zone cut at a higher level
- Common DNS issues debugging 
    - Leave a DNS entry in a zone file that does not have the dot at the end of it
    - Have a screwed up resolv.conf file (e.g. point to an non-existent recursive resolver)
- bad.horse

# how do I build this from the ground up