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

## Chapters

- 1. /etc/hosts files copied via Docker
  - Why are names nice and helpful at all?
  - solves most of the problems for a network of this size
  - it's cheating.
- 2. STOP CHEATING WITH DOCKER: nis.
  - you don't trust people. doesn't scale.
- 3. DNS: single authoritative server
  - Set up a single authoritative DNS that does the conversion of all names to IP addresses
- 4. DNS: root-server
  - multiple TLDs
  - recursive resolvers
- 5. SSH? Optional side-quest

### Scratchpad

Chapter 2:

- [ ] there is no longer going to be `hopon` because we no longer want to use docker tooling

Later stuff:

- [ ] it might be good to introduce ssh after we have introduced IGP
- [ ] Use `ssh` for everything else
- [ ] `ssh` can be a different topic rather than part of name resolution
- [ ] Have routers loopback interface be the one that is named and ensure other interfaces can be reached via loopback for the exercise
- [ ] Goal of the exercise is to `ssh router1` from `client` and it opens a ssh connection to the box.