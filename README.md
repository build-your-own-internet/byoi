# build-your-own-internet

## How to approach this repo
The intention behind this project is discovery and understanding. The idea is to explore how the internet is put together and use common industry tools to see and understand all the communications necessary to make the services and apps we use work.

We decided to take notes that create a reproducible experience. We document our questions, discovery, and our processes so other people who may want to take a similar journey can have a path to follow. We have broken up our exploration into chapters. Each chapter has a README that documents our exploration and **the final state** for that chapter of whatever files we create or modify in our exploration. There is, at least as of yet, very little actual software to run from this repo. Instead, the intent is to guide the experience and the learning process.

## Pre-requisites

- a basic undestanding of docker [Course link](https://www.linkedin.com/learning/learning-docker-2018/why-create-containers-using-docker)
- a basic understanding of terminals and [bash](https://www.linkedin.com/learning/learning-bash-scripting-17063287/learning-bash-scripting)
- a basic understanding of [IPv4 and subnets](https://www.linkedin.com/learning/cisco-ccna-200-301-cert-prep-1-network-fundamentals-and-access/ipv4-addressing-and-subnetting)
- optional: understand how [`jq` works](https://stedolan.github.io/jq/tutorial/) (if you feel motivated)
- optional for the super motivated: understand the [communication protocol layers](https://datatracker.ietf.org/doc/rfc1122/) we'll be working with
- get some software installed:
  - [colima](https://smallsharpsoftwaretools.com/tutorials/use-colima-to-run-docker-containers-on-macos/) or [docker desktop](https://www.docker.com/products/docker-desktop/) for mac™
  - `jq` by whatever means necessary (e.g. `brew install jq`)

## DISCLAIMERS

We've put some effort into explaining the commands that we're using. However, if we use a command with a flag that doesn't have explanation, check the command's `help` for more details; e.g. `ping --help`. Alternatively, check the command's manpage; e.g. `man ping`.

## General thoughts

What if we build a little internet?

### Intentions

- Documenting our process for our future friends
- How to build the internet blog

### What concepts are involved

- Routing/Networking basics
- Layer-2 concepts
- BGP specific routing concepts
- DNS root / federation
- Docker stuffs
- TLS fundamentals
- HTTP fundamentals
- VPN: TCP / UDP differences - maximum segment-size discovery

### What tools should we use?

- What are we doing today ?
- Github projects (Kanban)

## Stages of the project

### [COMPLETE] STAGE 0: What is the bare minimum to make an internetwork?

- machines running on 3 or more networks
- packets between machines on different networks
- basic software to be able to view what's happening on the networks
- Application (HTTP servers)

### STAGE 1: What makes large internetworks possible?

- BGP/IGP:Dozen nodes running BGP
- DNS (root nodes)

### STAGE 2: Secure that shit

- TLS: load/use basic Server/client certificates (generate using openssl)

### STAGE 3: How can we replace some of these things with stuff we build

- Set up a Root CA (Boulder) and import root certificates to Chrome
- Build our own BGP implementation?
- Build our own DNS server?

### Side Quests?

Here's some interesting topics that came up in the course of our exploration that didn't fit in at the time. We may come back to these?

- DHCP
- Proxy ARP
