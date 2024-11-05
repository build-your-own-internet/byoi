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
* TLD Nameservers
* Authoritative Nameservers
* Recursive Resolvers

<!-- TODO: We don't like that an appendix is load bearing to understanding of this section. Come back to it! -->
We go deeper into what roles these different machines play in the context of Recursive DNS in our [appendix on the subject](../../../appendix/recursive-dns.md).

<!--TODO: Ensure that the appendix clearly spells out why recursive DNS is useful -->

## Let's explore how this all works

As promised, we are going to teach you how to use the system before we build the system. Towards that end, we have created sections on useful or interesting things people do when it comes to managing their DNS. So let's dive right in!

### Add a new name

For most people, they just go to the registrar to add a new name. However, we are in the business of digging deep. So we will explore what happens behind the scenes!

### Add a new TLD

# Exercises
- watching tcp dump of name resolution
- add a new name
- add a new tld
- zone cut at a higher level
- Common DNS issues debugging 
    - Leave a DNS entry in a zone file that does not have the dot at the end of it
    - Have a screwed up resolv.conf file (e.g. point to an non-existent recursive resolver)
- bad.horse

NOTES:
Lots of different use-cases:

1. A simple IP address for a single host
2. Multiple names on a single host
3. Multiple IP addresses for a single host
4. A name that resolves to multiple IP addresses
5. Names that differ Inside and outside 

## how do I build this from the ground up



## Watch recursive resolution using tcpdump