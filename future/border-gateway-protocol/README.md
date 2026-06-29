# BGP (Border Gateway Protocol)

## Question to Claude:

In this repository, we're using docker to build model internets You can find a picture of the network in ../../img/network-maps/name-resolution/recursive-dns.svg. 

In this directory, /future/border-gateway-protocol, we have an /init folder that provides configuration details for each of the machines we're connecting to our internet. We want to play with BGP. We've already configured our internet so that all of our routers are running OSPF. The `/init/routers/bird.conf` file shows our current configuration which is loaded onto every router on our internet. 

We want to break this network into 2 autonomous systems. 1.0.0.0/8 will be the first AS, and the rest of the network will be the second AS. We'd like 1.0.0.0/8 to be AS100 and the rest of the network should be AS200. The first thing we'd like to do is `exec` onto routers C3 and Z6 and setup BGP on those routers. We expect that we will need to modify our `bird.conf` file. What would need to change from our current configuration to get these 2 routers talking to each other over the new BGP protocol? We still want C3 to use OSPF to talk to router C2, and we want router z6 to still use OSPF for communication to every router other than C3.

We also want to make sure our routers do route redistibution between OSPF and BGP.

claude --resume c92e6e63-7d0f-406e-be2b-bea4af7b9edb

## Questions to answer in exploration

- how does BGP interact with anycast?
- how do we implement business logic in BGP? 
    - Can we setup one AS as a transit AS while the rest are peers?
