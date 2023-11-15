# Name Resolution

What is name resolution? What problem(s) does it solve? In previous chapters, we had to know the exact IP addresses of each machine's connection on each network to be able to ping. This became really tedious even with a network map in front of us to be able to see what the IP addresses should be. Wouldn't it be nice if we could reach machines over the internet using human-friendly names instead? That's where name resolution comes in! Name-resolution is the process of converting a human-friendly name into the IP address machines need to be able to route traffic across the Internet.

## Goals for this section

Let's take a look at the internet we'll be working with for this chapter. You'll notice we've made some changes from the network diagrams we've used in other chapters. In _this_ internet, we have a bunch of hosts that would like to communicate with each other:

![our-inter-network](../img/nr-getting-started.svg)

Let's say we set this internet up for sharing fun pictures. Perhaps your passion is dancing photos, and host A (1.0.0.100) contains a massive library of `.jpg` files of this genre. Perhaps your friend Squee's passion is adorable kitty pictures, and their host B (5.0.0.100) has photos of that kind. When all of our friends set up their image-sharing hosts, we're going to end up with a bunch of machines that contain specific files we want access to.

Here are some potential problems that could crop up on your new internet:

- How do we know which hosts have which files on it?
- How do we know when a new host with a new genre joins the group?
- What happens if a host moves to a new network?

Can you imagine how this might actually work in a real-life scenario? This is basically how the Internet started, and this is exactly the problem that people found themselves trying to figure out when stuff was all being made. What would *you* do to solve this problem in the simplest way that could possibly work?

Maybe you could just have central person who has the canonical list of all of your hosts in your friend-group and she mails everyone a new copy whenever it changes? But eventually, you're gonna get tired of this. Why?

- IP addresses are hard to remember and boring to type in
- Someone has to keep meta-data about what each IP address is for since they're not self-explanatory
- If/when a host changes its locations, it's nice not to have to re-discover the host
- You might want more than one host to support a big website: one on the east coast; one the west coast. How do you do that?
- If you referencing web-pages only by IP address (e.g. http://<ip-address>), you can only have one web-page per host. What happens if you want more than one website on a host?
- If this scales to a really large number of hosts, even the most dedicated friend is going to quit in frustration
- In the end, this is just busy-work that a human is going to get tired of doing. Maybe a computer should do this instead?

When we have this many hosts, we need a convenient way to tell them apart and know which resources you'll retrieve from each one.  Our goal here is to implement a system to convert a human-readable easy-to-understand name into an IP addresses?

### NOTES

- [X] Introduce the new inter-network and why we changed our design
- [ ] Set up Docker/docker-compose for hosts
- [ ] need to create an HTML document and place image files on each host
- [ ] explain something about what each of these servers is offering
- [ ] Start with the basics: reach each host with http://<ip-address>
- [ ] Have a *single* `/etc/hosts` on one of the hosts
- [ ] Cheat with docker by synchronizing that `/etc/hosts` files across all hosts
- [ ] Stop cheating and implement synchronization of `/etc/hosts` on each machine and see name-resolution work.

- [ ] think about stuff:
  - [ ] are we still going to have "hopon" ?
  - [ ] should we wean ourselves off of docker-based file-synchronization?

