--------------------------------------------
We ran `dig www.isc.net @127.0.0.1` on `resolver-g` and got the following output from tcpdump:

> TL;DR: apparently you have to dig for a name that exists. Otherwise you get a NXDOMAIN response.
> ALSO! Apparently unbound goes off and does some homework on the first request and you're going to see
> a whole bunch of shit that is not relevant to the question at hand.

// PACKET 1
> 7:41:08.690651 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 8.1.0.4 tell 8.1.0.100, length 28
> 17:41:08.690912 ARP, Ethernet (len 6), IPv4 (len 4), Reply 8.1.0.4 is-at 02:42:08:01:00:04, length 28
ARPs, don't care.

// PACKET 2
>17:41:08.690914 IP (tos 0x0, ttl 64, id 64292, offset 0, flags [none], proto UDP (17), length 56)
>    8.1.0.100.38566 > 101.0.1.100.53: 34759% [1au] NS? . (28)

8.1.0.100 is us, resolver-g. 101.0.1.100 is the Root DNS server in netnod.org. This is good.

// PACKET 3
> 17:41:08.691827 IP (tos 0x0, ttl 60, id 30279, offset 0, flags [none], proto UDP (17), length 151)
>     101.0.1.100.53 > 8.1.0.100.38566: 34759*- 2/0/3 . NS rootdns-i.isc.net., . NS rootdns-n.netnod.org. (123)

Netnod responds back with the name server records for the root DNS servers. Refer to init/dns-server/rootdns-n/root.zone, lines 15, 16. Not sure why it's doing that, but maybe that's fine.

// PACKET 4
>17:41:08.692037 IP (tos 0x0, ttl 64, id 6315, offset 0, flags [none], proto UDP (17), length 60)
>    8.1.0.100.19776 > 100.0.1.100.53: 50869% [1au] A? net. (32)

We are asking isc again: "can you give me an A-record for net.?" That seems legit.

// PACKET 5
> 17:41:08.693239 ARP, Ethernet (len 6), IPv4 (len 4), Request who-has 8.1.0.100 tell 8.1.0.2, length 28
> 17:41:08.693244 ARP, Ethernet (len 6), IPv4 (len 4), Reply 8.1.0.100 is-at 02:42:08:01:00:64, length 28

more arp. Actually this is weird. 

// PACKET 6
> 17:41:08.693251 IP (tos 0x0, ttl 61, id 54592, offset 0, flags [none], proto UDP (17), length 109)
>     100.0.1.100.53 > 8.1.0.100.19776: 50869- 0/1/2 (81)

WTF. We have a packet coming from isc's root server (100.0.1.100) (hence the arp above). This should
really not be happening, but doesn't seem to be actively interfering with our recursive resolver.

// PACKET 7
> 17:41:08.693296 IP (tos 0x0, ttl 64, id 55533, offset 0, flags [none], proto UDP (17), length 60)
>     8.1.0.100.62982 > 101.0.1.100.53: 50674% [1au] A? net. (32)

Same as three packets ago, except we are asking netnod: "can you give me an A-record for net.?" It doesn't make sense to us that we would send requests to every server. But also probably harmless.

// PACKET 8
> 17:41:08.693520 IP (tos 0x0, ttl 64, id 45652, offset 0, flags [none], proto UDP (17), length 60)
>     8.1.0.100.13799 > 101.0.1.100.53: 25446% [1au] A? org. (32)

Another request to netnod. This time, we are asking for an A-record for org. Weird. Why? this doe NOT  seem to be because of the data in the root.hints file because we will also see a request soon for the com. TLD.

// PACKET 9
> 17:41:08.693608 IP (tos 0x0, ttl 60, id 30280, offset 0, flags [none], proto UDP (17), length 109)
>     101.0.1.100.53 > 8.1.0.100.62982: 50674- 0/1/2 (81)

Netnod responds to us. This is the same as the response from ISC. Maybe this is a response for the net. domain? But we're not seeing any IP addresses, so not sure? What is 50674 in the output? Also see that in packet 7. Maybe a request-id? Maybe this is a reply to packet 7?

// PACKET 10
> 17:41:08.693650 IP (tos 0x0, ttl 60, id 30281, offset 0, flags [none], proto UDP (17), length 106)
>     101.0.1.100.53 > 8.1.0.100.13799: 25446- 0/1/2 (78)

Similar to packet 9, except perhaps this is the reply to the org. domain from packet 8.

// PACKET 11
> 17:41:08.693841 IP (tos 0x0, ttl 64, id 30120, offset 0, flags [none], proto UDP (17), length 64)
>     8.1.0.100.35503 > 8.2.0.100.53: 11645% [1au] A? isc.net. (36)

So now we're actually doing something productive! We're sending a request to 8.2.0.100, which is the TLD dns server for .net. This is good. Love this. Makes us happy.

// PACKET 12
> 17:41:08.693955 IP (tos 0x0, ttl 64, id 28220, offset 0, flags [none], proto UDP (17), length 60)
>     8.1.0.100.12581 > 101.0.1.100.53: 1735% [1au] A? com. (32)

Now we're doing a .com request to netnod. no idea why.

// PACKET 13
> 17:41:08.694072 IP (tos 0x0, ttl 64, id 63681, offset 0, flags [none], proto UDP (17), length 64)
>     8.1.0.100.16301 > 8.2.0.100.53: 21018% [1au] A? isc.net. (36)

WHAT? We are repeating the request for isc.net to our TLD server? This is not good.
Theory: the request that we are making to resolve www.isc.net. one of these requests is the resolver
continuing to try to resolve www.isc.net. It's going to the next step along the way. 
The other query is it trying to find isc.net from the root server name (dns-i.isc.net).
because we're going to see the next line down we're going to ask for netnod.org for some reason.

// PACKET 14
> 17:41:08.694134 IP (tos 0x0, ttl 64, id 45691, offset 0, flags [none], proto UDP (17), length 67)
>     8.1.0.100.11875 > 101.0.1.101.53: 60045% [1au] A? netnod.org. (39)

Asking netnod for A records for netnod.org. Not sure why, seems to work with the theory above.

// PACKET 15
> 17:41:08.694221 IP (tos 0x0, ttl 60, id 30282, offset 0, flags [none], proto UDP (17), length 107)
>     101.0.1.100.53 > 8.1.0.100.12581: 1735- 0/1/2 (79)

Response from netnod with ?something? Can't tell what it is.

// PACKET 16
> 17:41:08.694329 IP (tos 0x0, ttl 64, id 60282, offset 0, flags [none], proto UDP (17), length 67)
>     8.1.0.100.12650 > 102.0.1.100.53: 33229% [1au] A? google.com. (39)

We're asking verisign for an A record for google.com. Why? not sure.

// PACKET 17
>  17:41:08.694676 IP (tos 0x0, ttl 63, id 40596, offset 0, flags [none], proto UDP (17), length 114)
>      8.2.0.100.53 > 8.1.0.100.35503: 11645- 0/1/2 (86)

"Our" (google's) TLD server is finally responding back to us. Not sure what it's saying. Maybe an A-record for isc.net? Or some other response for isc.net? Looks like a response to packet 11 since we see 11645 in the output.

// PACKET 18
>  17:41:08.694690 IP (tos 0x0, ttl 63, id 58257, offset 0, flags [none], proto UDP (17), length 114)
>      8.2.0.100.53 > 8.1.0.100.16301: 21018- 0/1/2 (86)

Okay, well. Since we asked it twice, it's giving us two responses. I guess that makes sense. Response to packet 13 (with that 21018 tracking number thingy)

// PACKET 19
>  17:41:08.694868 IP (tos 0x0, ttl 60, id 37916, offset 0, flags [none], proto UDP (17), length 73)
>      101.0.1.101.53 > 8.1.0.100.11875: 60045 Refused- 0/0/1 (45)

Netnod is refusing us. Response to packet 14. We are getting refused for a request that we didn't understand why it was being made in the first place.

// PACKET 20
>  17:41:08.695159 IP (tos 0x0, ttl 60, id 51516, offset 0, flags [none], proto UDP (17), length 73)
>      102.0.1.100.53 > 8.1.0.100.12650: 33229 Refused- 0/0/1 (45)

Refuse response from verisign. Fair enough, I guess. Nicely played, verisign.

// PACKET 21
>  17:41:08.695209 IP (tos 0x0, ttl 64, id 60977, offset 0, flags [none], proto UDP (17), length 68)
>      8.1.0.100.48182 > 102.0.1.100.53: 14128% [1au] A? verisign.com. (40)

We make a new request to verisign for verisign.com. Don't know why.

// PACKET 22
>  17:41:08.695389 IP (tos 0x0, ttl 64, id 57109, offset 0, flags [none], proto UDP (17), length 68)
>      8.1.0.100.60980 > 4.1.0.100.53: 22023% [1au] A? www.isc.net. (40)

OH SHIT, SON!! We are making a request to aws's authoritative DNS server for www.isc.net. Hell yeah, that's what we wanted to see. Why did we have to slog through all that other shit?

// PACKET 23
>  17:41:08.695439 IP (tos 0x0, ttl 60, id 51517, offset 0, flags [none], proto UDP (17), length 74)
>      102.0.1.100.53 > 8.1.0.100.48182: 14128 Refused- 0/0/1 (46)

Another refused response from verisign.

// PACKET 24
>  17:41:08.696030 IP (tos 0x0, ttl 59, id 15205, offset 0, flags [none], proto UDP (17), length 119)
>      4.1.0.100.53 > 8.1.0.100.60980: 22023 NXDomain*- 0/1/1 (91)

NXDOMAIN response from aws. The authoritative DNS server for isc.net tells us that www doesn't exist.
This is the end of our work. Whatever else is going on here is not interesting.

// PACKET 25
>  17:41:08.696067 IP (tos 0x0, ttl 64, id 5912, offset 0, flags [none], proto UDP (17), length 76)
>      8.1.0.100.17916 > 102.0.1.100.53: 36589% [1au] AAAA? tlddns-g.google.com. (48)

Asking for AAAA record for tlddns-g.google.com. Why?

>  17:41:08.696141 IP (tos 0x0, ttl 60, id 51518, offset 0, flags [none], proto UDP (17), length 82)
>      102.0.1.100.53 > 8.1.0.100.17916: 36589 Refused- 0/0/1 (54)


>  17:41:08.696171 IP (tos 0x0, ttl 64, id 53597, offset 0, flags [none], proto UDP (17), length 76)
>      8.1.0.100.32169 > 101.0.1.101.53: 9793% [1au] AAAA? tlddns-n.netnod.org. (48)


>  17:41:08.696228 IP (tos 0x0, ttl 64, id 46300, offset 0, flags [none], proto UDP (17), length 64)
>      8.1.0.100.34573 > 8.2.0.100.53: 41169% [1au] A? aws.net. (36)

(THIS  WENT ON FOR hundreds of packets. Run a dig when you first bring up unbound with a tcpdump running, and you'll see all this stuff)