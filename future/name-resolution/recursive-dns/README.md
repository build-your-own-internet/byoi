# Recursive DNS

In our previous chapter, we made a promise that we were going to build out a solution that could scale to the entire internet. But then, all we did was build a single DNS server. That single server is not particularly scalable to our internet. In our real world internet, we have millions of machines trying to access apps, sites, APIs, and general content all around the world. In order to do so, they need to convert those easy for humans to understand domain names into IP addresses. A single DNS server would fall over and cry in pain if it tried to handle all that traffic.

Not only that... We have a system where we don't really trust other people/organizations to manage our domain names for us. We need to have a system where people can be autonomous in managing their domains.

## Goals

0. define and differentiate recursive DNS
1. multiple DNS servers each responsible for their own subset of zones (apex domains)
2. build out root servers and TLD servers that will point requests to the correct DNS server for the apex domain

![Network map of a large internetwork](./nr-recursive-dns.png)
