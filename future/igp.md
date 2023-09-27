# IGP (Internal Gateway Protocols)

## Goal

Instead of manually creating and updating routing tables, let's have a computer do it!

IGP is a category of protocols that facilitates communication between routers in order to ensure maximum network availability. It provides a structure to automatically update routing tables based on network health. Trust is assumed by all machines on a network; meaning, we don't need to worry much about things like firewalls or communicating with untrusted partners.

By the time we're through, let's answer:

- Can we reproduce the routing table we set up manually?
- Are we able to route around broken connections?
- Can we configure basic auth to identify who is asking for what?

## Implementation Questions

What software are you gonna install?
Which IGP protocol are you gonna implement?
How will you know if it works?
How will you troubleshoot problems?
Links or existing documentation that could be helpful?
Can you draw what your internet will look like by the end of your implementation?
