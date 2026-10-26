# Naive BGP (Border Gateway Protocol)

- explain BGP, just another routing protocol
- hand-wave what an AS/ASN is (explain in next chapter)
- review a little about BIRD
- jump into the exercise: build it all out with naive BGP


In previous chapters, we explored a couple of different routing protocols that make the internet a little bit more feasible as it scales. We saw some of the problems with RIP and how they were improved with OSPF. But even OSPF has its own problems! Let's think about what those problems might be

- trust. OSPF inherently trusts routes that are being passed around from other routers. This can be a problem if there's a bad actor on the internet. How do we know that these routes are correct? How do we know that traffic isn't being sent to an illegitimate server?
- leaking information. OSPF is a system that provides exact detail of every operator's network. Every single router that participates in that routing system is identified and all of its link information is shared. This can give away a lot of information that a large network operator would not rather not share with the rest of the world. For the same reason that a big corporation wouldn't necessarily want to publish maps of all of their offices, including where the chief financial officer goes and the boardroom location and everything else like that, publishing information about your detailed network maps could be a security problem.
- scaling issues. OSPF can practically scale at the very largest to a thousand, perhaps ten thousand routers. The internet is at least millions of routers (but theoretically could be as many as a billion). As we saw in the OSPF chapter, routers communicate all routes information they have. This can be a ridiculously amount of information. If we have millions jjs to have the correct information they need to make routing decisions.
- routing control. The shortest path isn't necessarily what the business entities on the internet want. OSPF inherently finds the fewest number of routers between clients and destination. But that doesn't take into consideration the relationships between various business entities. For example, Netflix might have connections to dozens of different network providers, but some of those connections are cheaper and faster than others and perhaps some of them are only used for high-traffic events. This is an example where making a routing decision for the "shortest path" is not in the interests of the businesses involved. Businesses want to have control over how their bits traverse the internet.

## BGP, Explained

So now let's talk about the routing protocol that is actually used between networks on the internet. BGP or border gateway protocol is the protocol that's widely used across the internet that allows network operators to manage network connections and handle the kinds of problems we listed above.

We're going to start with the simplest possible configuration by taking the internet that we were using in the previous chapter on RIP and OSPF and simply replacing the routing protocol for every single router with BGP. What we are going to create in this chapter is in no way what you would *actually* see on the internet, but it will help us understand the concepts used in BGP before tackling more complex and realistic situations.

## Let's build a BGP network!

START HERE