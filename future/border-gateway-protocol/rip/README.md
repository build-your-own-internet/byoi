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