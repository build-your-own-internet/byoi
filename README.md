# build-your-own-internet

## How to approach this repo
The intention behind this project is discovery and understanding. The idea is to explore how the internet is put together and use common industry tools to see and understand all the communications necessary to make the services and apps we use work.

We decided to take notes that creates a reproducable experience. We document our questions, discovery, and our processes so other people who may want to take a similar journey can have a path to follow. We are breaking up our exploration into chapters. Each chapter will have a README that documents our exploration and the final state for that chapter of whatever files we create in our exploration. There is, at least as of yet, very little actual software to run from this repo. Instead, the intent is to guide the experience and the learning process.

To see our full process of discovery, follow through the commits on our branches. Read and explore along with us!

## Pre-requisites

- a basic undestanding of docker [Course link](https://www.linkedin.com/learning/learning-docker-2018/why-create-containers-using-docker)
- a basic understanding of terminals and [bash](https://www.linkedin.com/learning/learning-bash-scripting-17063287/learning-bash-scripting)
- a basic understanding of [IPv4 and subnets](https://www.linkedin.com/learning/cisco-ccna-200-301-cert-prep-1-network-fundamentals-and-access/ipv4-addressing-and-subnetting)
- optional: understand how `jq` works (if you feel motivated)
- get some software installed:
  - [docker desktop](https://www.docker.com/products/docker-desktop/) for mac™ (hopefully something else)
  - `jq` by whatever means necessary (e.g. `brew install jq`)

## General thoughts

What if we build a little internet?

### Intentions

Documenting our process for our future friends
How to build the internet blog

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

### STAGE 1: What is the bare minimum it would that take?

- BGP/IGP:Dozen nodes running BGP
- DNS (root nodes)
- Application (HTTP servers)

### STAGE 2: How do we make this cool/awesome?

- Reverse Proxy / Cache
- VPN
- TLS: load/use basic Server/client certificates

### STAGE 3: How can we replace some of these things with stuff we build

- Set up a Root CA (Boulder) and import root certificates to Chrome
- Build our own BGP implementation?
- Build our own VPN?
- Build our own DNS server?
