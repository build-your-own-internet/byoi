# IP and Ethernet Addresses

Once upon a time, when computers were new and nobody knew what was possible with them, some people decided that it would be fun to be able to connect a few of them together and have them communicate with each other. There were many ideas about the most efficient way to accomplish this. Some companies developed proprietary solutions while other solutions were developed by governments or academic institutions. 

After decades of evolution, two technologies became dominant: Ethernet and IP. Ethernet dominated the “local-network” landscape because it was simple, fast, and ubiquitous. Unlike most of its competitors, it was not proprietary, so you could buy cheap off-the-shelf equipment. You could buy cables, cut them to length, and crimp on ends yourself. Ethernet had a lot of technical limitations, but because of the simplicity of its design, people developed solutions that allowed it to grow from 10 megabits-per-second (MBPS) to 100 gigabits-per-second while still being largely backwards-compatible. Your WiFi router has Ethernet ports on it. If you want to get a network interface for your computer, the only thing you’re likely to be able to find for it is Ethernet. If you go to any datacenter in the world, the vast majority of the network cabling will be Ethernet. If you buy a network-based video-camera or speaker, they all use Ethernet. It’s that slightly-wide “telephone jack” (are there people reading this that don’t know what a telephone jack is? 😂) that you see everywhere.

But Ethernet is only for “local” networking: it’s for enabling a few devices to connect to one another in one geographical area (WiFi can be used to augment or extend Ethernet networks). If you want to be able to communicate with the rest of the world, you’re going to use the other technology that dominated the world: IP (or “Internet Protocol”).

Unlike Ethernet, IP doesn’t concern itself with wires or ports or electrical signals. IP dominated the “large-scale” landscape because the Internet was built upon it. It concerns itself with “how do I get a message from a computer on one side of the world to a computer on the other?” In other words, Ethernet concerns itself with “how to network **computers** together” and IP concerns itself with “how to network **networks** together” (or “how to build an inter-network”). So Ethernet is fundamental to creating a local network, and once some local networks are established, IP then builds on them to create an internet. IP doesn’t function without the presence of Ethernet (there are caveats here, but we’ll skip them for the time being) because Ethernet is the building block of communication between computers. IP just allows that communication to travel outside of an established local network. This does not mean that you cannot use IP within the context of a local network but the power of IP is in being able to connect networks together. Using IP within the context of a local network is analogous to driving a car one block when you are able to walk instead.

Because of this, there are two different **kinds** of addresses that we need to pay attention to when we talk about “networking.” There is the “local network” address, which is Ethernet. These addresses look a little something like this: `c2:87:d6:81:ca:d2`. They are six groups of hex numbers, separated (typically) by “`:`”. These designate your “Ethernet” (or MAC - Media Access Control) address, and they are only ever used when communicating with computers that are in your local geographic area.

The other address your computer has is an IP address, and they typically look like `192.23.33.12`. Unlike MAC addresses which are generally burned into the silicon, IP addresses are more malleable and can be reassigned as necessary.

So, how does all this work together? Let’s take a look at what a typical home network might look like:


```markdown
┌────────┐   ┌─────────────┐   ┌───────────┐
│Smart TV│   │Smart Speaker│   │ Smartphone│
└───┬────┘   └─────┬───────┘   └─────────┬─┘
    │              │                     │
    │         ┌────┴─────────────┐       │
    └─────────┤ Wireless Router  ├───────┘
              ├──────┬───────────┤
      ┌───────┘      │           └────┐
      │              │                │
┌─────┴─┐      ┌─────┴───┐       ┌────┴─┐
│Laptop │      │ Desktop │       │Tablet│
└───────┘      └─────────┘       └──────┘
```

We have a router that has connections to a number of machines in the local network. Some of those connections might be hardwired while some are WiFi. Each of these machines is sending requests and receiving responses from The Internet. In the end, the router needs to send and receive packets over Ethernet, but how does the router know which machine the requests came from and which to route the responses to? Enter ARP - Address Resolution Protocol.

Before any other communication can take place, the router needs to know the identity, or address, of each machine on the network. Let’s look specifically at the connection between the laptop and the router. When the laptop initially establishes a connection with the router, it broadcasts its Ethernet address and asks for a configuration (its IP address, default gateway, and DNS server) for the network it just joined. The router receives this broadcast and records the Ethernet address for the laptop. The router then provides the configuration details to the laptop, and thus, with the IP details of the configuration setup, the laptop knows how to internet!

> 📝 **NOTE**:
An ethernet broadcast frame goes to a special ethernet MAC address, `ff:ff:ff:ff:ff:ff`. Any frames destined for that MAC address go to EVERY machine on that network. However, routers don't route those packets.

Ok, so now the laptop wants to send a packet to the internet. The first thing it will want to do is resolve the name of the server the request is destined for. But, to send that request out to the internet, it first needs to figure out how to communicate with the default gateway. It has an IP address for the default gateway from its configuration setup. However, it needs to communicate over Ethernet, so it needs an Ethernet address. The laptop will send out another broadcast request to resolve the default gateway IP to an Ethernet address. When we use tcpdump to observe this process, we see something like this:

```bash
18:42:43.059083 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 100.1.2.1 tell 100.1.3.1, length 28
18:42:43.059123 ARP, Ethernet (len 6), IPv4 (len 4), Reply 100.1.2.1 is-at 02:42:64:01:02:01, length 28
```

Notice that this is an “ARP request”. So, the laptop sees that its default gateway is 100.1.2.1 and asks “who is this? How do I find you?” The router replies with its Ethernet address: 02:42:64:01:02:01. Now the laptop has an Ethernet address so it can communicate at the Ethernet layer! The laptop wraps up the DNS request in Ethernet frames and sends those frames to the address it just learned about. Once it receives the frames, the router can do its magic of communicating on the internet to find the authoritative DNS server that knows how to convert the hostname into an IP address.
