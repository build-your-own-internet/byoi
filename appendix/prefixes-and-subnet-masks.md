# IP Prefixes && Subnet Masks

What is the purpose of an IP address

* identify a server
* identify if a machine is on a particular network

## Intro

A “prefix” and a “subnet mask” are the 2 parts that comprise a network address, which is a span of IP addresses that belong to that network. Together, they enable us to group IP addresses. So instead of saying that Fastly owns 151.101.0.0 - 151.101.255.255, we can say Fastly owns 151.101.0.0/16. To understand why this works, we’ll have to digress and learn a bit about binary first.

## Back to Basics!: Binary

The structure of the addresses we’re looking at is numbers split into 4 chunks separated by a dot (.). Each of these chunks is referred to as an “octet”. Why an octet? Because each number is a decimal (base10) representation of an 8-bit binary number. That’s why they only go up to 255 in any one of the octets. We can convert each 8 bit binary number to a decimal value. Check this out:

| Value in Binary | Value in Decimal |
| --------------: | ---------------: |
| 0000 0000       | 0                |
| 0000 0001       | 1                |
| 0000 0010       | 2                |
| 0000 0011       | 3                |
| 0000 0100       | 4                |
| 0000 0101       | 5                |
| 0000 0110       | 6                |
| 0000 0111       | 7                |
| 0000 1000       | 8                |
| 0001 0000       | 16               |
| 0010 0000       | 32               |
| 0100 0000       | 64               |
| 1000 0000       | 128              |
| 1111 1111       | 255              |

What we see happening here is that each value in our 8-bit number corresponds with a decimal value. Oddly, [this children’s program](https://www.youtube.com/watch?v=VpDDPWVn5-Q) is the best explanation of binary I’ve ever found.

## What’s Binary Got to do with IP addresses?

It’s easy to look at an IP address and try to make it more complicated than it is. All we’re looking at here is a translation of numbers that makes it easier for humans to digest. Think about the difference between 1,000,000,000 versus 1000000000. Those commas are in there to make it easier to read so we can quickly identify the difference between 1,000,000,000 and 10,000,000,000. We’re doing something similar with our IP addresses, just adding convention to make it easier to see what’s happening.

So, back to binary. If we translate each octet of Fastly’s IP address range into binary, we’ll see:

```none
151.101.0.0 => 10010111.01100101.00000000.00000000
                  151      101      0        0
```

```none
151.101.255.255 => 10010111.01100101.11111111.11111111
                      151      101       0       0
```

Those binary octets are much harder on the human brain to comprehend and communicate. Instead, we perform a conversion on the binary values to translate each octet into decimal numbers (still called octets) that we are more accustomed to.

## Routing

Ultimately, we use these IP addresses to route packets over the Internet. So to understand why we use binary, we have to talk about routing packets.

**Think about this**: when the post office gets a letter, what's the first question they ask themselves? They look at the destination address and ask: "Does this letter go out for local delivery, or does it need to be sent to another post office? (and, if it's another office, which one?)"

Well, the same thing is true on the Internet, but instead of Post Offices, we have computers called "routers". And these routers make billions of these routing decisions every day (sometimes every second!). And, every time they see a packet come into one of their network interfaces, they look at the destination address of that packet, and then they go searching in their routing tables to determine if the packet should be sent to a local network or if the packet should be forwarded on to another router.

To make this decision, a router has to take the destination IP address of the packet it’s routing and it performs a simple comparison operation with each of its routes. Well— it's a simple comparison for a router to do — it's a little more work for a human to do, because we're not used to thinking in binary math. But with a little practice, you'll be able to do it too!

In a nutshell, here's the process that a router goes through to figure out where to send the packet next:

### The two-step algorithm for finding out where to send a packet

This might sound like gibberish to begin with. Don't worry! We'll spell it out in detail as we go!

**For each route** in the routing table, do the following until you find a match:

1. Take the _subnet-mask_ of the **current route** and perform a bitwise AND operation with the **destination IP address of the packet** we're routing.
2. Take the _network address_ of the **current route** and compare that with the previous result
    1. **If they match**: use that route 🙂
    2. **If they do not match**: go on to the next route 😞

#### Example packet 10.2.1.4 - does it match 10.1.0.0/24?

Let's go through an example of this. We're looking at one router on the Internet, and let's say it has the following routing table:

```none
Route 1: 10.1.0.0/24
Route 2: 10.2.0.0/23 <== notice the /23! tricky!
Route 3: 10.3.3.0/24
Route 4: 10.4.4.4/24
```

Let's say this router sees a packet coming in destined for `10.2.1.4`. The router needs to know which route to take!

To accomplish this, it's going to go through the routing table and apply the algorithm to each route until it finds a match. Let's say it starts with the first route in the table: `10.1.0.0/24`.

##### Step 1 - attempting 10.1.0.0/24

> Take the subnet-mask of the current route and perform a bitwise AND operation with the destination IP address of the packet we're routing.

Okay, so the subnet mask of the first route (10.1.0.0/24) is `/24`.

First, we apply the subnet mask of that route to the destination IP address of the packet using a binary AND operation. How do we do this? Well, for starters, we have to convert the subnet-mask and the destination-address to _bits_.

The subnet mask, that "/24" on the route, represents 24 bits of mask. Said another way, it has 24 "1"s turned on, starting from the left of the binary number, like this:

```none
11111111.11111111.11111111.00000000 <== 24 "1"s
```

Next, we convert each octet of the destination IP address to bits, so `10.2.1.4` becomes:

```none
00001010.00000010.00000001.00000100
```

To apply the binary AND operation between these numbers is simple: line them up and go bit-by-bit: if **both** bits are `1`, then the result is a `1`. Otherwise, the result is a `0`:

```none
subnet mask:         11111111.11111111.11111111.00000000
destination IP:      00001010.00000010.00000001.00000100
   AND               ===================================
result:              00001010.00000010.00000001.00000000
```

So, we started a destination address of `10.2.1.4`. We’re checking to see if it should be sent to the route `10.1.0.0/24` by applying the subnet mask from that route, `/24`, to the destination IP. If we convert each octet of the result of applying that subnet mask back to decimal, we get: `10.2.1.0`.

> By the way, did you notice that the result of applying the "subnet mask" to an IP address is that it just "masks out" (kinda like masking tape) part of the address? That's why it's called a "mask"! It just acts like a filter: anywhere there's a `1` in the mask, we take the value of the address. Anywhere there's a `0` in the mask, we ignore the value of the address!

##### Step 2 - attempting 10.1.0.0/24

> Take the network address of the current route and compare that with the previous result
> If they match: use that route
> If they do not match: go on to the next route.

The network address, everything _before_ the "/24", of the current route is `10.1.0.0` and the result of step 1 was `10.2.1.0`. These two results are **not equal**. Therefore, this is _not the right route_! This route is discarded 👎. Fuck this route!

#### Continuing with the next route

Okay, the first route didn’t work out. But we’re not frightened. We have more routes to check, and we are pretending to be a tireless computer! So, okay, chin up soldier: the next route is `10.2.0.0/23`. Let's go through the same two-step process that we did for the first route.

##### Step 1 - attempting 10.2.0.0/24

We apply the subnet mask (`/23`) to the destination IP address (`10.2.1.4`):

```none
subnet mask:         11111111.11111111.11111110.00000000 <==  23 1's!
network address:     00001010.00000010.00000001.00000100
 AND                 ===================================
result:              00001010.00000010.00000000.00000000
```

...and if we convert the octets of the result back to decimal, we get `10.2.0.0`.

##### Step 2 - attempting 10.2.0.0/24

Next, we take the network address of the **current route** (10.2.0.0) and compare that with the result of step 1 (10.2.0.0).

These are **the same**. We found it! This is the correct route to choose. The router will pick this route and stop searching!

## How does this relate to prefixes and subnet masks?

The reason we represent network addresses in this way is it makes it a lot easier to see where networks begin and end.

When you have a prefix for an IP range, it relates to how many bits can be turned off and on. So if you just want the range 151.101.0.0 - 151.101.0.255, the subnet mask is a /24. We can talk about all the values in that range with 151.101.0.0/24.

What we just described in the previous section is how to determine if a destination IP address fits within a network range, in this case, the /24.

Let’s look at some prefixes and the range of IP addresses they provide.

| Subnet Mask    | Applied Prefix | Sample IP Range                |
| :------------- | :------------- | :----------------------------- |
| /24            | 151.101.0.0/24 | 151.101.0.0 - 151.101.0.255    |
| /23            | 151.101.0.0/23 | 151.101.0.0 - 151.101.1.255    |
| /22            | 151.101.0.0/22 | 151.101.0.0 - 151.101.3.255    |
| /16            | 151.101.0.0/16 | 151.101.0.0 - 151.101.255.255  |

Did you notice the pattern there? Eh? Eh?! The values at the upper end of the IP range increase at the same rate as our next binary value! So we double the number of possible IP addresses between /24 & /23. Then we double it again between /23 & /22. Etc. Etc. Etc.

All we’re doing is turning on the next value in our 8-bit binary number!

```none
0000 0000 = 0
0000 0001 = 1
0000 0010 = 2
0000 0100 = 4
0000 1000 = 8
0001 0000 = 16
0010 0000 = 32
0100 0000 = 64
1000 0000 = 128
1111 1111 = 255
```

So after /16, We’re moving on to our next bit!

151.101.0.0/15 => 151.101.0.0 - 151.102.255.255

Oooooooh! Ahhhh!!!

## Practice Time

Using what you know now, see if you can figure out the answers to the following questions:

* Why does a /16 have more addresses available than a /24?
* What is the subnet mask for a network with a single address?
* Using the routing table below, which route would a router pick for `10.4.4.18`?

```bash
Route 1: 10.1.0.0/24
Route 2: 10.2.0.0/23
Route 3: 10.3.3.0/24
Route 4: 10.4.4.4/24
```
