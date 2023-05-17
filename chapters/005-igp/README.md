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

We added a package to our Dockerfile called `bird`, which is a routing software that includes OSPF. Now we need to configure our OSPF so know about the machines and networks that exist on our internet. We're following [this article](https://ixnfo.com/en/configuring-ospf-in-bird.html) for guidance on setting up our OSPF. 

Let's open `/etc/bird/bird.conf` on each router on our network. We're going to modify this file to make this router participate with other routers to automatically configure routes. We're going to start by defining the `router id` a few lines down in the configuration file. This `router id` is going to be used to identify the router to other routers in the network. It's id will be associated with the routes it knows about for building routing tables.

Sweet! But, what should we set the `router id` to? Well, this is an internal network where, even in a real world situation, this protocol would not have access to the outside world. So we can define our own internal schema for how we want to identify our routers! We're going to pick something simple that allows human eyes to easily identify which router we're looking at, so, we'll give `router1` the id `101.101.101.1`, `router2`'s id will be `101.101.101.2`, etc. 

Why are we going with these `101.101.101.x` addresses? We want to pick an address that has no likelihood of interference from other systems. If we went with `127.0.0.x` for example, there are systems that mark the `127.0.0.0/8` address range as "unroutable" because IETF has designated them as such.

We will end up binding an IP address to the loopback interface on each router. So... what is a loopback? A loopback is an address on a machine that points to itself, meaning, the machine is hitting its own resources. So any packet sent to a loopback address from a machine will never leave the machine. Traditionally, this is used in development environments where you want a network service available within a machine but not routable outside the machine. However, in this case, we're going to break with this tradition and we're assing an address to the loopback that will be routable to the outside. The benefit of this approach is that no matter what else is happening on the network, the loopback address will ALWAYS be up.

So, we've updated our `bird.conf` file on router1 to set the `router id` to `101.101.101.1`. Now, let's manually add this loopback address on `router1`:

```
root@router1:/# ip addr add 101.101.101.1 dev lo
root@router1:/# ip addr show lo
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet 101.101.101.1/32 scope global lo
       valid_lft forever preferred_lft forever
```

Now, back to editing that `bird.conf` file. Once we remove all the comments, the pared down `bird.conf` file looks like:

```bash
log syslog all;
router id 101.101.101.1;

protocol device {
}

protocol direct {
        interface "eth*", "lo";
}

protocol kernel {
        import all;
        export all;
}

protocol static {
        ipv4;
}

protocol ospf v3 {
        area 0 {
                interface "eth*" {
                        type broadcast;
                        cost 10;
                        hello 5;
                };
        };
}
```

We're going to do the same thing on `router3`, except with the ip address `101.101.101.3`, and then let's test that everything works!