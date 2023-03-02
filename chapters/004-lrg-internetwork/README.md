# Let's make that Internet MOAR BIGGER!

## Goals for this section:

Let's use the tools and processes we've already discovered to make a much larger internetwork!

Here's what we expect the internet to look like at the end of this chapter:

```
                                          200.1.1.0/30
                                ┌─────────────────────────┐
               200.1.1.5/30     │                         │
             ┌────────────────Router2                  Router4─────┐
             │                  │                        │         │
             │             ─────┴─┬──────────────────────┴─┬─      │200.1.1.9/30
             │                    │       100.1.1.0/24     │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                    │                        │       │
             │                Router3                   Router5────┘
             │                  │                           │
             │      ──┬─────────┴────────            ───────┴──────────────┬──
             │        │       3.0.0.0/8                    1.0.0.0/8       │
             │        │                                                    │
             │        │                                                    │
             │        │                                                    │
  Server     └─────Router1                                               Client
    │                 │
────┴─────────────────┴─────
              5.0.0.0/8
```

Simple, no?!

## Aside

Cattle v. Pets. Let's cattle. 