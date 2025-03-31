# Automatic route configuration

Up to this point, we have been manually configuring how our routers are able to find machines on our toy internet. As you can imagine, as the internet grows, this becomes quite the cumbersome process. If you look at something at the scale of The Real Internet™, it quickly becomes obvious that it's not possible to manually configure routes for all the machines on the entire internet.

So, what do we do about this problem? We need some tool that will allow us to discover networks and update routes to those networks automatically without human intervention. Fortunately for us, this problem has already been solved and we can stand on the shoulders of giants.

Routers have the ability to automatically collaborate with each other to convey information about the network to one another. They do this through what are called "Routing protocols." As you can imagine, ✨There is More Than One Way To Do It✨. So let's start by examining the simplest of all the routing protocols: "RIP". RIP is not widely used by network professionals in the world today because it has lots of problems that were discovered over time when people started building massively huge networks with security concerns. But for our purposes, it's very instructive and a great place to start.

<!-- TODO: what are the security problems? Also, why is it actually useful and not a waste of time? -->

## Introducing the BIRD (BIRD Internet Routing Daemon) project

We need to make our routers smarter. So far, they have been very simple switchboards, and we've been manually configuring each and every one of them with "static" routes. In order to imbue them with intelligence, it's going to take -- guess what -- software! The software we're going to use is called `BIRD`. This software knows about all kinds of routing protocols and will be the basis of the next few chapters.

<!-- TODO: maybe define "static routes" -->

Okay, so the first thing we're going to do is add `bird` to each of our routers. Lucky for you, we've already installed this software on the routers of this toy internet for this chapter. Next, we're going to start these routers up and begin playing with them, but first let's take a look at the network that we're going to be using in this chapter:

[![our map][our map]][our map]

Go ahead and run `byoi-rebuild`, and let's run our old friend `ip route` on one of our routers (e.g. `router-a2`) to show the routing table on that router. You should see that it only has routes for the interfaces it is directly connected to:

```bash
root@router-a2:/# ip route
4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
```

> 📝 **NOTE:** your interface names (eth0 and eth1) may be different

### Implementing BIRD

At the moment, our routers don't have any way of communicating routing information to each other. we ned to conf bird so it knows what routes to advertise and which protocol to accept new routes from. To do that, we're going to start by modifying the bird.conf file on this machine. We'll use `vim`:

```bash
root@router-a2:/# vim /etc/bird/bird.conf
```

Here is the basic contents of the file that you'll see:
<!-- TODO: talk about stuff and jargon terms first maybe -->

```bash
# This is a minimal configuration file, which allows the bird daemon to start
# but will not cause anything else to happen.
#
# Please refer to the documentation in the bird-doc package or BIRD User's
# Guide on http://bird.network.cz/ for more information on configuring BIRD and
# adding routing protocols.

# Change this into your BIRD router ID. It's a world-wide unique identification
# of your router, usually one of router's IPv4 addresses.
router id 198.51.100.1;

# The Kernel protocol is not a real routing protocol. Instead of communicating
# with other routers in the network, it performs synchronization of BIRD's
# routing tables with the OS kernel.
protocol kernel {
        scan time 60;
        import none;
#       export all;   # Actually insert routes into the kernel routing table
}

# The Device protocol is not a real routing protocol. It doesn't generate any
# routes and it only serves as a module for getting information about network
# interfaces from the kernel.
protocol device {
        scan time 60;
}
```

There's not much going on here yet. This basic configuration includes:

- `router id`: (optional) the unique IP address of this router
- `protocol kernel`: how do you get routing information into and out of the routing table for this machine
- `protocol device`: we're not sure what this is for-- this is how we understand what routes are connected to the machine so it can advertise that information out, maybe?

[![how BIRD works][how BIRD works]][how BIRD works]

A common confiuguration value that we'll see throughout this file is `import`s and `export`s. `import`s are how we get

Game plan:
- fart around with `router-a2`, `a3`, and `a4` so that the three of them are talking RIP together and exchanging routes that they know about.
- have them go router-by-router and have them paste in configs and maybe have a terminal open on router-a2 and see the birdc output grow and see ip route get bigger
- once the whole thing is done, break shit and see it heal
- also maybe point to `/final` to show them how it would be automatically configured from scratch.

As we mentioned before, `BIRD` is the software we're going to use to popu our rout tab. before it will work, we need to conf it. just like everything else on unix-based systems, it all comes down to files. we need to make aa new file for the bird configuration. let's `vim /etc/bird/bird.conf`

TODO:
- change BYOI-rebuild so they can bring in a config file


1. Have routes populated across three routers (RIP)
2. Some routers will have static routes, one router (router a2) has nothing but its interfaces
3. router-a2 gets routes from its neighbors
4. eventually, pull all all static routes out and have all routers learn all routes via RIP

Handy commands!

```
birdc show route export rip1
birdc configure
birdc show route all
```

Where we're at:

1. We have two routers with static routes. We include an `export all` with protocol static, which will need to be removed for the final iteration of this.
2. We have the three-router situation working between A2, A3, and A4.
   - A2's connected network shows up on A4 and A3.
   - A3 and A4's static routes are advertised to A2.
   - is A3's connected network showing up on A2?

Questions or exercises we want to make sure we cover:

- convert Zayo and Telia converted
  - router-a4 learned of `101.0.1.0/24 via 2.4.0.2 dev eth1 proto bird` somehow even through router-n2 isn't running rip yet.
- It would be cool to have static routes maybe influence things and compare that to using knobs in the IGP itself.
- (for later?) if A3 is shut off, can A2 get to the networks via A4 that A4 also has?
- Be careful about `import all` and `export all` in all the protocols




PROBLEM 1: removing routes from a router that was killed:
- one thing we're noticing, is that we killed router-a3 and the routes from it stayed on router-a2. We're seeing reports from the debugger that it's getting those routes from the kernel.
- actually, it just took a long time for this to work, don't know why yet.

PROBLEM 2:
- How do we get routes that are intrinsic to a router (e.g. on interfaces) to be advertised on RIP?
- apparently, we need to have a `protocol direct` stanza with `interface "*"`. This will provide routing information for other protocols to use.
- Additionally, we apparently needed to add `export all` to the `protocol rip` configuration in order for it to notify its neighbors of routes that it gets from other places. FOLLOWUP QUESTION: how come it advertised static routes without this?

Here's what we're going to try:
- rebuild this pocket-by-pocket and see static routes go away and routes get populated.
- by the end of next session (hopefully), we have all static routes removed in the `final` directory.

## Outstanding questions:

1. What if router-a2 learns about a directly-connected route from another router? would it overwrite its own route table in favor of RIP? under what conditions might this be true?
<!-- Links, reference style, inside docset -->
[our map]:         ../../../img/network-maps/rip-routing.svg
                             "Our Map"

[how BIRD works]:         ../../../img/network-maps/how-bird-works.svg
                             "How BIRD works"
<!-- end of file -->