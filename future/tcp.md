# TCP (Transmission Control Protocol) and UDP (User Datagram Protocol)

## Goal

When you start looking at a large internet, you start seeing that there's a lot of variation between networks. TCP is a protocol that lets us pretend that all networks are reliable. It paves over the problems that happen in real life, like packets being delivered out of order, packets being dropped, packets being sliced up into many pieces, variations in network capacity, etc.

UDP is another method of communicating between machines across a large internet. Whereas TCP will guarantee packet order, packet delivery, etc, UDP doesn't guarantee anything! It's a best-effort protocol.

By the time we're through, let's build:

- a server/client system that can communicate using UDP or TCP for the purpose of sending a large file
- a tool to inject latency into our internet between specific routers
- a tool to inject packet loss into our internet between specific routers
- a tool to be able to adjust MTU (maximum transmission unit - allowed packet size) between specific routers
- stretch goal: a tool to randomly disorder packets

Then, let's answer:

- What's the throughput difference when the internet is in a good state, i.e. never disorders packets, never loses packets, etc?
- What's the throughput difference when the internet is NOT in a good state:
  - packet loss
  - different MTU on each network
  - there's increased latency on the internet
  - packets arrive out of order

## Implementation Questions

What software are you gonna install?
How will you know if it works?
How will you troubleshoot problems?
Links or existing documentation that could be helpful?
Can you draw what your internet will look like by the end of your implementation?
