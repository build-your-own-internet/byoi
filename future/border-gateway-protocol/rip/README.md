# Automatic route configuration

Up to this point, we have been manually configuring how our routers are able to find machines on our toy internet. As you can imagine, as the internet grows, this becomes quite the cumbersome process. If you look at something at the scale of The Real Internet™, it quickly becomes obvious that it's not possible to manually configure routes for all the machines on the entire internet.

So, what do we do about this problem? We need some tool that will allow us to discover networks and update routes to those networks automatically without human intervention. Fortunately for us, this problem has already been solved and we can stand on the shoulders of giants.

Routers have the ability to automatically collaborate with each other to convey information about the network to one another. They do this through what are called "Routing protocols." As you can imagine, ✨There is More Than One Way To Do It✨. So let's start by examining the simplest of all the routing protocols: "RIP". RIP is not widely used by network professionals in the world today because it has lots of problems that were discovered over time when people started building massively huge networks with security concerns. But for our purposes, it's very instructive and a great place to start.

<!-- TODO: what are the security problems? Also, why is it actually useful and not a waste of time? -->

## Introducing the BIRD (BIRD Internet Routing Daemon) project

We need to make our routers smarter. So far, they have been very simple switchboards, and we've been manually configuring each and every one of them with "static" routes. In order to imbue them with intelligence, it's going to take -- guess what -- _software_! The software we're going to use is called `BIRD`. This software knows about all kinds of routing protocols and will be the basis of the next few chapters.

> 📝 **NOTE**: A "static" route is a hard-coded entry into a routing table. There is no software that updates or changes this route based on network conditions. If it needs to be changed, a human being needs to log into that router and change it. This is in contrast to "dynamic routes" that we'll be playing with in this chapter and going forward.

Okay, so the first thing we're going to do is add `bird` to each of our routers. Lucky for you, we've already installed this software on the routers of this toy internet for this chapter. Next, we're going to start these routers up and begin playing with them, but first let's take a look at the network that we're going to be using in this chapter:

[![our map][our map]][our map]

Go ahead and run `byoi-rebuild`, and let's run our old friend `ip route` on one of our routers, `router-a2`, to show the routing table on that router. If you look at the network map, you'll see that `router-a2` only has interfaces on `4.1.0.0/24` and `4.2.0.0/24`. Now, when we check the routes, you should see that it only has routes for those interfaces (because we've removed all the static routes):

```bash
root@router-a2:/# ip route
4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
```

> 📝 **NOTE:** your interface names (eth0 and eth1) may be different

### Implementing BIRD

At the moment, our routers don't have any way of communicating routing information to each other. we need to configure BIRD so it knows what routes to advertise and how to advertise them. To do that, we're going to start by using `vim` to modify the `bird.conf` file on this machine:

```bash
root@router-a2:/# vim /etc/bird/bird.conf
```

This is the default configuration file that is installed with your BIRD configuration. It's not supposed to work yet. We'll explain each section of this file below:

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

- `router id`: (optional) the unique IP address of this router. While this is recommended, it's not necessary for BIRD to work.
- `protocol kernel`: This section controls how you get routing information into and out of the routing table for this machine.
- `protocol device`: This section empowers BIRD to learn what interfaces exist on this machine and their up/down status.

As we mentioned earlier, we're going to use a protocol called `RIP` for exchanging route information between routers on our network. Let's see what this process will look like conceptually, then we'll explore how to build the configuration we want in BIRD to make that happen.

First, introduce a new diagram. This is a conceptual picture of `router-a2` communicating with routers `a3` and `a4`. This focuses first on `router-a2` and the BIRD software that runs on it. It shows further details of the constituent pieces of BIRD's inner workings and how those inner-workings interface with the machine itself and with the other routers.

[![BIRD diagram explainer][BIRD diagram explainer]][BIRD diagram explainer]

On the left, we have stuff that exists "outside" of BIRD:

- `eth0, eth1`: The network interfaces of the machine which connect it to the networks that it sends packets on
- `ip route`: the kernel's routing table which provides instructions for where to send packets to networks that it is not directly connected to.

Moving to the right, we next encounter a giant box labelled `BIRD`. This is the BIRD software and all of its constituent pieces. As we move into bird, the first big yellow box represents the "protocols" that BIRD knows about. We have already encountered the `device` and `kernel` protocols from the initial `bird.conf` file above. This diagram introduces the `RIP` protocol, which is used in communicating with other routers on our little internet.

Finally, we have the box labelled `BIRD core` which manages organizing information between protocols to create a coherent routing table for the router.

But what does this process look like on a larger internet? How exactly does route information get collected and distributed among the routers using RIP?

To answer that question, we're going to give you a Giant Step-by-Step Diagram™. It's going to start with how the router collects information about its own network connections and will go through the process of how it uses the RIP protocol to communicate that information to other routers in order to build a complete picture of the entire network so that the router can build a full routing table for the entire internet.

See you in a couple pages!

[![how BIRD works][how BIRD works]][how BIRD works]

<!-- THIS IS WHERE WE LEFT OFF --------------------------------------------- -->

We're going to go against recommended best practice and remove this from our configs for the sake of simplicity.
A common confiuguration value that we'll see throughout this file is `import`s and `export`s. `import`s are how we get

 You'll notice that there is a commented-out `export all` configuration.
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

[how BIRD works]:         ../../../img/how-bird-works.svg
                             "How BIRD works"

[BIRD diagram explainer]:         ../../../img/bird-diagram-explainer.svg
                             "BIRD diagram explainer"
<!-- end of file -->