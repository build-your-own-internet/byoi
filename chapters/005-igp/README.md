# Let's explore automating our routing tables

## Goals for this section

At this point, we've been working with manual routes on our internetwork. When a route is broken, packets get dropped, packets get stuck in a loop, or a router knows it doesn't know how to get somewhere and sends an `ICMP Unreachable` response. None of these are things we want when we're just trying to buy new shoes online. As far as our internetwork knows, there is no other route to the destination/source machine. As you probably experienced in trying to solve the various network problems we saw in the previous chapter, this is hard to troubleshoot and fix. What if... we could automate that shit...

To start with, we're going to look at an IGP (Internal Gateway Protocol) called OSPF (Open Shortest Path First).

Here's what our internet looked like at the end of the last chapter:

```bash
                                          200.1.1.0/29
                                ┌─────────────────────────┐
               200.1.1.8/29     │ (.2)               (.3) │
             ┌────────────────Router2                  Router4─────┐
             │ (.11)            │                        │    (.18)│
             │             ─────┴─┬──────────────────────┴─┬─      │200.1.1.16/29
             │                    │       100.1.0.0/16     │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │  (.19)│
             │                Router3                   Router5────┘
             │                  │                           │
             │      ──┬─────────┴────────            ───────┴──────────────┬──
             │        │       3.0.0.0/8                    1.0.0.0/8       │
             │        │                                                    │
             │        │                                                    │
             │ (.10)  │                                                    │
  Server     └─────Router1                                               Client
  (.100)              │                                                  (.100)
────┴─────────────────┴─────
              5.0.0.0/8
```

## Vocab

* IGP - When you have a group of routers that you trust (don't worry, we'll come back to this bit), we can provide the machines logic that will automatically make decisions about best paths to use.
* OSPF - OSPF is a software that implements IGP. It will automatically pick the fastest/shortest route to the destination machine and will help us automatically update routing tables when there are problems in the network.

## Installing OSPF

