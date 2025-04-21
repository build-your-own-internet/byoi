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

### How BIRD works

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
- `protocol device`: This section empowers BIRD to learn what network interfaces (or "devices") exist on this machine and their up/down status.

<!-- TODO: be sure to make sure we explain the difference between a route that shows up from `ip route` that gets there because there is a network interface attached to that network and a route that shows up when we do an `ip route add` command -->

Some common things you'll see in each `protocol` section is:

- `scan time`: How often a process should be kicked off to update values in this protocol
- `import`: pull information from the protocol we manage.
  - `none`: In the case of `kernel`, if it has `import none`, then it will not read the routing table from the kernel to be included in BIRD's route information.
  - `all`: In the case of `kernel`, if it has `import all`, then BIRD will pull all information from the machine's route table and include that in its route information.  <!-- TODO: VERIFY THIS -->
- `export`: send information from `BIRD core` to the protocol we manage.
  - `none`: In the case of `kernel`, if we `export none`, then the kernel's routing table will not reflect any of the information that BIRD knows about.
  - `all`: In the case of `kernel`, if we do `export all`, then the kernel's routing table will be updated with BIRD's routes and the router will be able to use that information to physically route packets as it sees them go by.

As we mentioned earlier, we're going to use a protocol called `RIP` for exchanging route information between routers on our network. Let's see what this process will look like conceptually, then we'll explore how to build the configuration we want in BIRD to make that happen.

First, introduce a new diagram. This is a conceptual picture of `router-a2` communicating with routers `a3` and `a4`. This focuses first on `router-a2` and the BIRD software that runs on it. It shows further details of the constituent pieces of BIRD's inner workings and how those inner-workings interface with the machine itself and with the other routers.

[![BIRD diagram explainer][BIRD diagram explainer]][BIRD diagram explainer]

On the left, we have stuff that exists "outside" of BIRD:

- **eth0, eth1**: The network interfaces of the machine which connect it to the networks that it sends packets on
- **route table**: the kernel's routing table which provides instructions for where to send packets to networks that it is not directly connected to.

Moving to the right, we next encounter a giant box labelled **BIRD**. This is the BIRD software and all of its constituent pieces. As we move into bird, the first big yellow box represents the "protocols" that BIRD knows about. We have already encountered the `device` and `kernel` protocols from the initial `bird.conf` file above. This diagram introduces the `RIP` protocol, which is used in communicating with other routers on our little internet.

Finally, we have the box labelled **BIRD core** which manages organizing information between protocols to create a coherent routing table for the router.

But what does this process look like on a larger internet? How exactly does route information get collected and distributed among the routers using RIP?

To answer that question, we're going to give you a Giant Step-by-Step Diagram™! It's going to start with how the router collects information about its own network connections and will go through the process of how it uses the RIP protocol to communicate that information to other routers in order to build a complete picture of the entire network so each router can build a full routing table for the entire internet.

See you in a couple pages!

[![how BIRD works][how BIRD works]][how BIRD works]

### Implementing RIP in BIRD

We looked at the default configuration for BIRD and now we're going to give you a complete configuration for implementing RIP in BIRD. We'll move router-by-router and see how routing-tables are populated and look at some key controls that BIRD provides for us to check on the status of our RIP environment.

1. Hopon `router-a2`
2. Before we get started with making configuration changes with BIRD, let's see what this router knows about our toy internet by using the `ip route` command. You should see something like this:

```bash
root@router-a2:/# ip route
4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
```

3. Next, let's start configuring BIRD. The first step is to update the `/etc/bird/bird.conf` file to match the following:

```bash
# If we run BIRD interactively, we can see logs go by for everything
# it's doing
debug protocols all;

# Learn what interfaces exist on this machine and also their up/down status
protocol device {
  scan time 10;
}

# Adds interface route information to BIRD's routing table
protocol direct {
  interface "*";
}

protocol kernel {
  # A real bird instance would do this, but we want
  # to make it very obvious what BIRD is doing.
  # persist;

  scan time 10;
  
  # So we're not going to propagate routes from the 
  # kernel into BIRD at this time.
  import none;

  # This is to make sure that the OS can get to places on 
  # our toy network.
  export all;
}

protocol rip {
  # Populate all known routes
  # these come from:
  #   - the kernel
  #   - the static routes
  #   - directly-connected interfaces
  import all;

  # this is what we send to other RIP routers
  export all;

  # I think this is what interfaces we are sending RIP updates to
  # and receive RIP updates from
  interface "*" {
    version 2;
  };
}
```

<!-- TODO: Explain this at some point ? What is `interface "*" ` for example -->

4. Restart the BIRD daemon in interactive debugging mode.

Remember to use the `ps aux` command to list all the running processes on the machine. Find the line that has `bird` in it and look at the `PID` column for that line to find the process-id. Next, issue the `kill` command with process-id that you found. This will stop `bird` from running in the background. It should look something like this:

```bash
root@router-a2:/# ps aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   4032  2816 ?        Ss   18:32   0:00 /bin/bash /router-start-up.sh
root          12  0.0  0.0   2796  1408 ?        Ss   18:32   0:00 /usr/sbin/bird -c /etc/bird/bird.conf
root          13  0.0  0.0   2268  1024 ?        S    18:32   0:00 /bin/sleep infinity
root          14  0.0  0.0   4296  3456 pts/0    Ss   18:32   0:00 /bin/bash
root          25  0.0  0.0   7628  3456 pts/0    R+   18:32   0:00 ps aux
root@router-a2:/# kill 12
```

Next, let's run `bird` with this new configuration in interactive debugging mode by adding the `-d` flag when we start it:

```bash
root@router-a2:/# bird -d
bird: device1: Initializing
bird: direct1: Initializing
bird: kernel1: Initializing
bird: rip1: Initializing
bird: device1: Starting
bird: device1: Scanning interfaces
bird: device1: Connected to table master
bird: device1: State changed to feed
bird: Chosen router ID 4.1.0.2 according to interface eth0
...
```

Don't panic! You're going to see a lot of debugging information here. Scan through this output and see what you can understand. It's okay if it doesn't all (or even mostly!) make sense to you. Find the bits that do make sense and see if you can understand them in context. Once the `bird` has completed its initialization, you should see the following lines continuing to output:

```bash
bird: device1: Scanning interfaces
bird: kernel1: Scanning routing table
bird: kernel1: Pruning table master
bird: rip1: Interface timer fired for eth1
bird: rip1: Sending regular updates for eth1
bird: rip1: Sending response via eth1
bird: device1: Scanning interfaces
bird: kernel1: Scanning routing table
bird: kernel1: Pruning table master
```

This is telling us that `bird` is scanning to see what routes it could be learning. SO, let's go take a look at those routes!

5. Check your routes on `router-a2`

Leave the `bird -d` output scrolling in this window, and open a **new** window and hopon `router-a2` once again so we can watch the route table update as we add new [neighbors](../../../chapters/glossary.md#neighbor-in-a-routing-context).

Let's take a look at how `router-a2`'s routing table has changed! We're going to use the `watch` command with the `ip route` command so that we can see the routes refresh in real time as we make changes:

```bash
root@router-a2:/# watch ip route
```

```bash
Every 2.0s: ip route       router-a2: Wed Apr 16 20:23:21 2025

4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
```

So what this is going to do, if you're not familiar with `watch`, is to run the command you give it and show you the output every two seconds. This means we get a refresh of what routes this machine knows every two seconds. 

You might feel a slight sense of disappointment that you don't see any new routes yet. Why did we do all that work with bird just to have the router do nothing?! Well, with only one router running RIP, there is nothing for it to communicate with and so no new route information is coming into this router. This is like one hand clapping: no sound yet!

6. Add a neighbor

In order to see some interesting results, we need to have at least two routers that [neighbor](../../../chapters/glossary.md#neighbor-in-a-routing-context) each other running RIP. So let's configure `router-a3` the same way and watch the changes roll in!

Open a **third** window, this time to `router-a3`, and update the `/etc/bird/bird.conf` file on _that_ router to match the configuration that we gave you for `router-a2`. All of these routers will take _exactly the same_ configuration file. Easy, huh?

We recommend starting `bird` in "interactive debugging mode" so that we can see exactly how these routers are going to communicate. That's what we're currently running on `router-a2`.

Run the `ps` command as above with router-a3 and run the `kill` command again to terminate the `bird` process on this router. Then run `bird` on router-a3 with the debugging switch. You should see something like this:

```bash
root@router-a3:/# bird -d
bird: device1: Initializing
bird: direct1: Initializing
bird: kernel1: Initializing
bird: rip1: Initializing
bird: device1: Starting
bird: device1: Scanning interfaces
bird: device1: Connected to table master
bird: device1: State changed to feed
bird: Chosen router ID 3.4.0.3 according to interface eth2
```

In your window running `watch ip route`, you should suddenly see some new routes show up `router-a2`'s routing table!

```bash
Every 2.0s: ip route       router-a2: Wed Apr 16 20:34:35 2025

3.4.0.0/16 via 4.1.0.3 dev eth0 proto bird
4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
4.3.0.0/16 via 4.1.0.3 dev eth0 proto bird
```

Notice the `proto bird` on the new routes that just showed up. This tells you where they came from! Thanks, `bird` (*・‿・)ノ⌒*

In the first window, where you have the debugging output from `router-a2`'s `bird` process, you may need to scroll back a little bit, you should also see a **whole bunch** of fun new RIP debugging messages show up, such as the following:

```bash
bird: rip1: Interface timer fired for eth1
bird: rip1: Sending regular updates for eth1
bird: rip1: Sending response via eth1
bird: rip1: New neighbor 4.1.0.3 on eth0
bird: rip1: Request received from 4.1.0.3 on eth0
bird: rip1: Sending response via eth0
bird: rip1: Response received from 4.1.0.3 on eth0
bird: rip1 > added 4.1.0.0/16 via 4.1.0.3 on eth0
bird: rip1 > added [best] 4.3.0.0/16 via 4.1.0.3 on eth0
bird: kernel1 < added 4.3.0.0/16 via 4.1.0.3 on eth0
bird: rip1 < added 4.3.0.0/16 via 4.1.0.3 on eth0
bird: rip1: Scheduling triggered updates for eth0
bird: rip1: Scheduling triggered updates for eth1
bird: rip1 > added [best] 3.4.0.0/16 via 4.1.0.3 on eth0
bird: kernel1 < added 3.4.0.0/16 via 4.1.0.3 on eth0
bird: rip1 < added 3.4.0.0/16 via 4.1.0.3 on eth0
bird: rip1: Interface timer fired for eth1
bird: rip1: Sending triggered updates for eth1
bird: rip1: Sending response via eth1
bird: rip1: Interface timer fired for eth0
bird: rip1: Sending triggered updates for eth0
bird: rip1: Sending response via eth0
bird: device1: Scanning interfaces
bird: kernel1: Scanning routing table
bird: kernel1: 3.4.0.0/16: seen
bird: kernel1: 4.3.0.0/16: seen
```

This debugging output is a little simpler than the debugging output that we've seen from `tcpdump`. Take a minute and see if you can make a little sense of what's happening here. Take a minute to go through the output line-by-line and write down what you think each line might mean.

The gist of this is that we're watching `bird` use the communication happening over the RIP protocol to learn new routes and save them into its local ("kernel") routing table.

7. Rinse and repeat!

Okay, we've got two routers running RIP and communicating routes successfully to each other. Guess what... we have nineteen more to go!

Here are the rest of the routers that need to be configured:

- router-a4
- router-n2
- router-z7
- router-z6
- router-z8
- router-z5
- router-c3
- router-c2
- router-t7
- router-t6
- router-t8
- router-t5
- router-s2
- router-s3
- router-i2
- router-v4
- router-g3
- router-g4
- router-g2

It's time to roll out the configuration to each and every one of these little guys! Note that these routers have been given in a specific order. The reason for this has to do with the concept of "neighbors" that we've talked about earlier. Remember that the RIP protocol has to communicate over Ethernet (meaning, on-the-same-network) to other routers. Those routers are "neighbors" because they are adjacent to each other on a larger internet. If we start running RIP on a router that doesn't have direct communication with another router running RIP, then there's no way for the routes to populate. Once we've filled the gap and have a contiguous line of routers running RIP, the routes will populate eventually. But since we'd like to see updates on `router-a2` for each and every router that we configure, we want to make sure that we're always configuring a new router that neighbors a router that's already configured.

Here's what you'll need to do for each router in the list:

- `hopon <router-name>`
- update the `/etc/bird/bird.conf` file to match what we gave you for `router-a2` and `router-a3`.
- find the bird process with `ps -aux`
- run the kill command to restart the `bird` process (i.e. `kill -HUP <process-id>`)
- pay attention to the open windows for `router-a2` to see the new routes populate.

## Validate that shit!

1. Spot-check your routes!

By the time you're done with all that serious labor, the output of the `watch ip route` command on `router-a2` should have gotten pretty huge! It should look a lil' somethin' like this:

```bash
Every 2.0s: ip route                                                               router-a2: Wed Apr 16 21:02:19 2025

1.1.0.0/16 via 4.1.0.4 dev eth0 proto bird
1.2.0.0/16 via 4.1.0.4 dev eth0 proto bird
1.3.0.0/16 via 4.1.0.4 dev eth0 proto bird
2.1.0.0/16 via 4.1.0.4 dev eth0 proto bird
2.3.0.0/16 via 4.1.0.4 dev eth0 proto bird
2.4.0.0/16 via 4.1.0.4 dev eth0 proto bird
2.5.6.0/24 via 4.1.0.4 dev eth0 proto bird
2.5.7.0/24 via 4.1.0.4 dev eth0 proto bird
2.5.8.0/24 via 4.1.0.4 dev eth0 proto bird
2.6.7.0/24 via 4.1.0.4 dev eth0 proto bird
2.6.8.0/24 via 4.1.0.4 dev eth0 proto bird
2.7.8.0/24 via 4.1.0.4 dev eth0 proto bird
2.8.0.0/16 via 4.1.0.4 dev eth0 proto bird
3.4.0.0/16 via 4.1.0.3 dev eth0 proto bird
3.5.6.0/24 via 4.1.0.3 dev eth0 proto bird
3.5.7.0/24 via 4.1.0.3 dev eth0 proto bird
3.5.8.0/24 via 4.1.0.3 dev eth0 proto bird
3.6.7.0/24 via 4.1.0.3 dev eth0 proto bird
3.6.8.0/24 via 4.1.0.3 dev eth0 proto bird
3.7.8.0/24 via 4.1.0.3 dev eth0 proto bird
3.8.0.0/16 via 4.1.0.3 dev eth0 proto bird
3.9.0.0/16 via 4.1.0.3 dev eth0 proto bird
4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
4.3.0.0/16 via 4.1.0.3 dev eth0 proto bird
8.1.0.0/16 via 4.1.0.3 dev eth0 proto bird
8.2.0.0/16 via 4.1.0.4 dev eth0 proto bird
9.1.0.0/16 via 4.1.0.3 dev eth0 proto bird
9.2.0.0/16 via 4.1.0.3 dev eth0 proto bird
9.3.0.0/16 via 4.1.0.3 dev eth0 proto bird
100.0.1.0/24 via 4.1.0.4 dev eth0 proto bird
101.0.1.0/24 via 4.1.0.3 dev eth0 proto bird
102.0.1.0/24 via 4.1.0.4 dev eth0 proto bird
```

Look at all those great `bird` routes! `bird` rules! 🐦💪

2. Ping around and find out!

Next, now that we think we've got everything configured, let's make sure that our internet functions exactly the way it has in our previous routing chapters (remember the bad old days when we had to configure all the routes statically by hand?).

Try using your old friend `ping` to send a packet from `client-c1` to `server-s2`. `hopon client-c1` and run the `ping` command as follows:

```bash
root@client-c1:/# ping 9.2.0.12 -c1
PING 9.2.0.12 (9.2.0.12) 56(84) bytes of data.
64 bytes from 9.2.0.12: icmp_seq=1 ttl=58 time=0.326 ms

--- 9.2.0.12 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.326/0.326/0.326/0.000 ms
```

💥 Dope! We have network connectivity across this great toy internet of ours! If this doesn't work, you'll need to troubleshoot your routes. Refer to the [discover the breakage](../../../chapters/1.3-routing-internet-chonk/README.md#discover-the-breakage) troubleshooting section from chapter 1.3 if you need some assistance.

3. Do a complete check of the whole network using the `byoi-validate` script

We're going to finish by running a script called `byoi-validate` to ensure that all of the routes across the network are working as expected. This is a `bash` script which automatically performs `ping` tests for you. It's going to run tests from one machine in each "eyeball-network" to every other machine on our internet. This ensures that there is correct routing out of each network. You'll need to be in the same directory that you've been running the `hopon` commands from (i.e. `build-your-own-internet/future/border-gateway-protocol/rip`), and you'll run the command `byoi-validate`. The output from that command, if everything is working correctly, should look like this:

```bash
$ byoi-validate

Testing IP connectivity from client-c1
...................................................................................

Testing IP connectivity from server-g3
...................................................................................

Testing IP connectivity from server-s1
...................................................................................

Testing IP connectivity from server-a1
...................................................................................
✅ No errors! Everything is working!
```

If that script reports any errors, your job is to go and fix them! Refer to the [discover the breakage](../../../chapters/1.3-routing-internet-chonk/README.md#discover-the-breakage) troubleshooting section from chapter 1.3 if you need some assistance.

## Break that shit!

That's great, we did a whole bunch of work to wind up exa as we started bef. why did we do? Let's take a look at one of the pow of using a routing protocol to determine your routes: namely, healing broken routes. 

Take a look at your network map. Trace with your finger the path that you think packets should take from `client-c1` to `server-a3`. There are lots of possible options! Ideally, the routers are going to pick the shortest path from source to destination and back again. This means that, for this example, the path should be:

- `router-c3`
- `router-z6`
- `router-z7`
- `router-a4`
- `server-a3`

What happens when one of those routers goes down? Since we've built our toy internet with redundant paths from one side of it to another, it would be best if we could have our packets automatically re-routed to a less-optimal route. Well, our routing protocol (RIP) should be able to do this for us. Let's see if it can.

Let's first validate our assumptions about the path that we thing packets will take from `client-c1` to `server-a3`. `hopon router-z6` and take a look at its routing table:

```bash
$ hopon router-z6
root@router-z6:/# ip route
...
4.1.0.0/16 via 2.6.7.7 dev eth3 proto bird
4.2.0.0/16 via 2.6.7.7 dev eth3 proto bird
4.3.0.0/16 via 2.6.7.7 dev eth3 proto bird
...
```

There are a lot of routes here, we've skipped the unimportant ones for this conversation with `...`, but the routes that start with `4.` are the ones that get us to the amazon web services toy network. As you can see from this printout, `router-z6` wants to send packets to `router-z7` for all these networks, which is perfect.

To watch RIP help our internet re-route our packets around a failure, we're going to take down `router-z7` and see what happens. Before we do that, let's set up some monitoring so we can see exactly what happens! You'll need a window connected to each of these systems:

- `router-z7`: to cause the outage
- `router-z6`: to watch its routing table change (hopefully 🤞)
- `client-c3`: to have a continuous ping going on so we can see when packets start getting lost and hopefully when the network is healed and packets start going through again.

<!-- WE ENDED OFF HERE -->


- once the whole thing is done, break shit and see it heal
- also maybe point to `/final` to show them how it would be automatically configured from scratch.

Handy commands!

```
birdc show route export rip1
birdc configure
birdc show route all
```

Questions or exercises we want to make sure we cover:

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

## Fun exercises:

1. Add `learn yes` to the kernel protocol and add a static route and see that sucker propagate around the network
2. 


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