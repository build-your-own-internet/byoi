# build-your-own-internet


## General thoughts

What if we build a little internet?

### Intentions:
Documenting our process for our future friends
How to build the internet blog
Can we build fastly in there? Fastly Anywhere
What about the Fastly control-plane? Heavenly/Northstar/Cypress/Tinia/Spotless, etc etc

### What do we do NEXT?
Turn this google doc into a readme, create a … 

### What concepts are involved:
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

