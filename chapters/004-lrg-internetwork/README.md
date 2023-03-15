# Let's make that Internet MOAR BIGGER!

## Goals for this section:

Let's use the tools and processes we've already discovered to make a much larger
internetwork! In this case, we'll want to be able to traverse several networks
to get machines who are not directly connected to be able to communicate with
each other. Looking at the network diagram below, we can see that the `Client` machine is connected to the `1.0.0.0/8` network. We want the `Client` machine to be able to traverse our internetwork to reach the `Server` machine connected to the `5.0.0.0/8` to request a basic HTML document. 

**TODO: describe something about where the HTML document is and how the user can see it**

Here's what we expect the internet to look like at the end of this chapter:

```
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

Simple, no?!

## Aside

You might be wondering what the hell happened to our fun pets and their
personalities. Well, we are in serious business territory now and there is no
room for emotions and personality when it comes to serious business™. In other
words, when you are dealing with large infrastructure, it's much easier to
manage things when you assign roles to them that dictate how things are
configured. Hence, we have Server(s), Client(s) and Router(s) instead of our
lovable pets.

There is an industry specific phrase that matches the theme here too. Within
infrastructure industry, the popular way to see components of the infrastracture
is as "cattle, not pets". This is a mean way of saying we only care about the
larger system and we care less about details of individual components. Those
components are there to serve a purpose and once they are unable to, we can
easily replace them with other components that can serve the same role.

Since we do care about the roles, let's dive a little deeper into them and understand what we mean:

### Client

A client is any machine that initiates a connection/request to another machine
on the network or the larger internetwork. A common example is a browser or curl
request to a web resource. In future chapters, we might explore how clients are
protected by the network either via firewall or through other means but this
definition is sufficient for our current use case.
### Server

A server is any machine whose purpose is to serve a network request. If the
server fails to serve the request, it can return an appropriate error back to
the client. In our case, we have built a very simple HTTP server that responds
back to any request with a simple HTML.
### Router

A router is any machine whose purpose is to connect networks together. It does
so by forwarding packets to the next hop. Each router has a picture of what the
internetwork looks like and it makes decision on its own for the most efficient
way to send the packet to its destination. Internet, as we know today, is not
possible without numerous routers facilitating the requests.
## TODOS

[ ] Explain network topology
    [ ] Explain octets or slash thingies
[ ] Explain the HTTP server via netcat hack
[ ] Explain the /29 choice and why we did that instead of /30 for p2p networks
