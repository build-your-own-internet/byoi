#Our initial goals

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