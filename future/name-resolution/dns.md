# DNS (Domain Name System)

## Goal

We've got some IP addresses, but that's not how we (humans) use the internet. Let's implement DNS so we can have human readable names for the machines we're communicating with!

DNS is the protocol by which a domain name, e.g. pippin.kitty.com, is converted into an IP address. Sometimes... more than one IP address. :D

By the time we're through, let's answer:

- Can we convert a domain name to an IP address using /etc/hosts?
- Can we automate the DNS lookup using an authoritative DNS server?
- How do we scale the DNS lookup when people don't trust each other?
- Can you cache DNS responses on resolvers?

## Implementation Questions

What software are you gonna install?
How will you know if it works?
How will you troubleshoot problems?
Links or existing documentation that could be helpful?
Can you draw what your internet will look like by the end of your implementation?
