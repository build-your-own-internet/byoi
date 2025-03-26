# Automatic route configuration

Up to this point, we have been manually configuring how our routers are able to find machines on our toy internet. As you can imagine, as the internet grows, this becomes quite the cumbersome process. If you look at something at the scale of The Real Internet™, it quickly becomes obvious that it's not possible to manually configure routes for all the machines on the entire internet.

So, what do we do about this problem? We need some tool that will allow us to discover networks and update routes to those networks automatically without human intervention. Fortunately for us, this problem has already been solved and we can stand on the shoulders of giants.

Routers have the ability to automatically collaborate with each other to convey information about the network to one another. They do this through what are called "Routing protocols." As you can imagine, ✨There is More Than One Way To Do It✨. So let's start by examining the simplest of all the routing protocols: "RIP". RIP is not widely used by network professionals in the world today because it has lots of problems that were discovered over time when people started building massively huge networks with security concerns. But for our purposes, it's very instructive and a great place to start.

## Introducing the BIRD (BIRD Internet Routing Daemon) project

We need to make our routers smarter. So far, they have been very simple switchboards, and we've been manually configuring each and every one of them with static routes. In order to imbue them with intelligence, it's going to take -- guess what -- software! The software we're going to use is called `BIRD`. This software knows about all kinds of routing protocols and will be the basis of the next few chapters.

Okay, so the first thing we're going to do is add `bird` to each of our routers. If you look at [`Dockerfile_router`](./Dockerfile_router), you'll see that we've added `bird-bgp`.

Next, we're going to start these systems and begin playing with them, but first let's take a look at the network that we're going to be using in this chapter:

[![our map](../../../img/network-maps/rip-routing.svg
 "Initial network")](../../../img/network-maps/rip-routing.svg)

Go ahead and run `byoi-rebuild` and take a look at one of the routers, e.g. `router-a2`, and run our old friend `ip route` to show the routing table on that router. You should see that it only has routes for the interfaces it is directly connected to.

```bash
root@router-a2:/# ip route
4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
```

> 📝 **NOTE:** your interface names may be different

### Implementing BIRD

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