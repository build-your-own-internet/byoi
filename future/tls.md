# TLS (Transport Layer Security)

## Goal

We've built an internet, but how do we protect the confidentiality and integrity of our cross network communication? Let's implement TLS to ensure the security of the connection between client and server!

TLS is a protocol that provides assurance that the client is talking to who it thinks its talking to and that the communication is private. It does this with certificates that the server presents to validate its identity and encryption protocols that the client and server agree upon.

By the time we're through, let's answer:

- Can we generate a certificate/key for pippin.kitty.com?
- Can we install the generated certificate on a server?
- Can the client validate/accept that certificate?
- Can we have the client and server select an agreed upon encryption protocol?
- Can we encrypt/decrypt traffic?

PRO TIP! Either complete the DNS chapter first or... see if you can futz with your `/etc/hosts` to use a hostname instead of an IP.

## Implementation Questions

What software are you gonna install?
How will you know if it works?
How will you troubleshoot problems?
Links or existing documentation that could be helpful?
Can you draw what your internet will look like by the end of your implementation?
