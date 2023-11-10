# Name Resolution

Before we can jump in to bring in the big dogs like a proper DNS (Domain Name System), it might be worth exploring the larger domain of name resolution and see if we can get away with a primitive solution. The thought process here is that our network is relatively small and should not require a more sophisticated solution.

With that preamble, what is name resolution? What problem(s) does it solve? In previous chapters, we had to know the exact IP addresses of each machine's connection on each network to be able to ping. This became really tedious even with a network map in front of us to be able to see what the IP addresses should be. Wouldn't it be nice if we could ping machines using human friendly names instead? That's where name resolution comes in!

## Goals for this section

Let's take a look at the Internet we're looking at for this. You'll notice we've made some changes from the previous network diagrams we've used in other chapters. In this Internet, we have a single client and a batch of servers.

![our-inter-network](../img/nr-getting-started.svg)

the servers will contain html documents the client wants to query for. just like we saw in other chapters, the client needs to send a request that will be routed around the internet to the server it's looking for and the response will be routed back.

However! This Internet is getting complicated. We can still make a request for `http://6.0.1.100` (for example) to receive the document we're looking for, but it's hard to keep track of which-document-lives-on-which-server.

Let's say you built this network with your friends in order to share recipes or photos or music or articles. Whatever you find interesting for yourself that you think is cool. So you've set up a web server, and your passion is Tango music from the Golden Age (1935-1955). But Squee's passion is photos of their kitties. Therefore, we're going to start winding up with a bunch of servers that we can all reach, and when a new friend joins our group, we need to let everyone know what the IP address is of their server and make sure that the new friend has the IP addresses of all of our current servers!

Can you imagine how this might actually work in a real-life scenario? This is basically how the Internet started, and this is exactly the problem that people found themselves trying to figure out when stuff was all being made. What would *you* do to solve this problem in the simplest way that could possibly work?

- Maybe you could arrange IP addresses in some systematic way?
- Maybe you could just have central person who has the canonical list of all of your servers in your friend-group and she mails everyone a new copy whenever it changes?

Eventually, you're gonna get tired of this. Why?

  - [ ] Your friend is going to get sick of doing this work
  - [ ] If this scales to a really large number of servers, even the most dedicated friend is going to quit in frustration
wouldn't names be nice if we could just use names for servers instead of IP addresses?
  - [ ] IP addresses are hard to remember
  - [ ] you have to keep your own meta-data about what each IP address is for; they're not self-explanatory
  - [ ] IP addresses are not discoverable (you can't just type squees-cool-server and find something awesome)
  - [ ] when servers change locations, it's nice not to have to know re-discover
  - [ ] you might want more than one server to support a big website: one on the east coast; one the west coast. How do you do that?

When we have this many servers, we need a convenient way to tell them apart and know which resources you'll retrieve from each of them.

### NOTES

- [ ] Introduce the new inter-network and why we changed our design
- [ ] need to create an HTML document
- [ ] explain something about what each of these servers is offering
- [ ] think about stuff:
  - [ ] are we still going to have "hopon" ?
  - [ ] should we wean ourselves off of docker-based file-synchronization?

- [ ] Start with the basics: reach each server with http://<ip-address>
- [ ] if you have http://<ip-address>, you only have one web-page. What happens if you want more than one website on a server?
- [ ] all your friends have a piece of paper with all the ip addresses of all their favorite servers
  - [ ] what happens if an IP address of a server changes? how do you tell your friends?
  - [ ] what happens when there is a hundred servers that need to be kept track of? A thousand? a million?
- [ ] wouldn't names be nice?
  - [ ] IP addresses are hard to remember
  - [ ] you have to keep your own meta-data about what each IP address is for; they're not self-explanatory
  - [ ] IP addresses are not discoverable (you can't just type squees-cool-server and find something awesome)
  - [ ] when servers change locations, it's nice not to have to know re-discover
  - [ ] you might want more than one server to support a big website: one on the east coast; one the west coast. How do you do that?
