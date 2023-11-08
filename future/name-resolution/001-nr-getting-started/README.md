# Name Resolution

Before we can jump in to bring in the big dogs like a proper DNS (Domain Name System), it might be worth exploring the larger domain of name resolution and see if we can get away with a primitive solution. The thought process here is that our network is relatively small and should not require a more sophisticated solution.

With that preamble, what is name resolution? What problem(s) does it solve? In previous chapters, we had to know the exact IP addresses of each machine's connection on each network to be able to ping. This became really tedious even with a network map in front of us to be able to see what the IP addresses should be. Wouldn't it be nice if we could ping machines using human friendly names instead? That's where name resolution comes in!

## Goals for this section

Here's what the internet to looks like at the end of the end of chapter [003-internet-chonk](../../../chapters/003-internet-chonk/):

```markdown
                                          200.1.1.0/29
                                ┌─────────────────────────┐
               200.1.1.8/29     │ (.2)               (.3) │
             ┌────────────────Router2                  Router4─────┐
             │ (.11)            │                        │    (.18)│
             │             ─────┴─┬──────────────────────┴─┬─      │200.1.1.16/29
             │                    │       100.1.0.0/16     │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │  (.19)│
             │                Router3                   Router5────┘
             │                  │                           │
             │      ──┬─────────┴────────            ───────┴──────────────┬──
             │        │       3.0.0.0/8                    1.0.0.0/8       │
             │        │                                                    │
             │        │                                                    │
             │ (.10)  │                                                    │
  Server     └─────Router1                                               Client
  (.100)              │                                                  (.100)
────┴─────────────────┴─────
              5.0.0.0/8
```

At the end of **this** chapter, our hope is that we can run `ping server-fivenet` instead of having to remember that Server's IP address is `5.0.0.100`. Wouldn't that be swell? We think so!

IDEAS
* Change network configuration to have nine servers instead of one with still a single client
* redraw our internet with those changes
* state the actual problem
  * how do we get to these servers without memorizing IP addresses which can change
  * there is no longer going to be `hopon` because we no longer want to use docker tooling
* `ssh` can be a different topic rather than part of name resolution
  * it might be good to introduce ssh after we have introduced IGP
* Not let folks use `hopon` except to `hopon client`
* Use `ssh` for everything else
* Have routers loopback interface be the one that is named and ensure other interfaces can be reached via loopback for the exercise
* Goal of the exercise is to `ssh router1` from `client` and it opens a ssh connection to the box.