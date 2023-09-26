# BGP (Border Gateway Protocol)

## Goal

Let's simulate large scale internet entities and how they communicate routes between each other!

BGP is a routing protocol that facilitates communication between routers owned by businesses/organizations that have limited trust for each other. It basically exists to handle the political negotiation of how traffic should be routed across The Internet as a whole.

By the time we're through, let's answer:

- Can we setup a BGP network with 4 Autonomous Systems (AS)?
- Can we have each AS announce its own routes to routers on the other ASes?
- Can we have one AS influence the routes other ASes take to get to it?
- Can we break a route and have BGP automatically heal itself?
- Can we setup one AS as a transit AS while the rest are peers?

## Implementation Questions

Where will you start? What is your MVP?
What software are you gonna install?
How will you know if it works?
How will you troubleshoot problems?
Links or existing documentation that could be helpful?
Can you draw what your internet will look like by the end of your implementation?
