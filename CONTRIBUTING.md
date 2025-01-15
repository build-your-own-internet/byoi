# Contributing

## how to develop a new chapter

When writing a new chapter, we have frequently encountered situations where we're not sure how to approach the topic. Big topics like DNS and TLS can feel really overwhelming, especially trying to explain why the system exists and how it works before we implement it. We've found a few tricks that help us get unblocked and write more accessible content.

This project started because the authors all wanted to get practical, hands on experiences with the various technologies and protocols that make the internet work. That means we didn't always know where to start with a chapter. This is good. This means that we had really obvious growth opportunities and we got to tangibly experience our learning processes!!! When we approached large topics that we understood in theory, we didn't think about the chapter yet. Instead, we just played around until we got something working. Once we had a better understanding of how the system/technology/protocol worked, we could start thinking about what the chapter itself might look like. Usually, we needed to write several smaller chapters before we could implement the fully fledged system we dreamed of.

The first thing we keep in mind when we're developing content for a topic is making sure the reader understands the problem first. Once the reader can get hands on experience with a problem, then we attempt to implement the simplest solution we can think of for the problem. The solutions we reach for are imperfect. They might not be implemented broadly. They may have only been implemented in a more nacent version of The Internet. However, the basic solution gives the reader a foundation to build on. 

Once we have an initial solution, we can start poking holes in that solution. Does it scale? Is it secure? Is it maintainable? And finally... what does the actual modern internet do? We want to end with a solution that looks as close to the current internet as possible. 

So writing a chapter might look like this:

We want to implement TLS on our internet. Let's start by playing! What's the thing we most want to create? We want a full TLS system with a CA running [boulder](https://github.com/letsencrypt/boulder)! Let's futz around for a while and see if we can get boulder up and running on our internet. Can we issue certs? Can we create a modern TLS infrastructure?

All that's great. But... it's a lot to explain to a reader. We need to explain why certs are necessary, why a cert is trusted, how CAs vet domains, what the role of a CA is, how cert is created, what the role of a root cert is, how root certs are referenced, how an encrypted connection is made, etc, etc, etc. The emphasis of the chapters should always be on how the reader can get hands on experience with the technologies. Before we can do anything practical, we need to spend PAGES writing explanation exposition. Boo.

So then we thought the problem was just certificates and distribution. We started working on a solution that didn't implement boulder, but still had a CA, root certs, CSRs, and servers that were running webpages. We STILL found that we needed pages and pages of explanation before we could start getting into the practical experience of setting up TLS.

Ok, let's take it back even further. How do we create a secure connection just between 2 machines on our internet? You'd be surprised how often our chapters need to start there and how much you can learn from just worrying about a single connection.

So this comes down to "what's the most fundamental part of what we made that we can break apart and explain to the reader". If all else fails, look at how the real internet was actually developed over time. The internet didn't start with TLS. That was a solution that came as the internet grew more and more massive. So let's go back to the first problem we're trying to solve and let's see how we can solve that in the simplest way.

We always want to start with the problem. For TLS, this means we write a chapter/section that demonstrates an EVIL server intercepting packets meant for a legitimate server. The reader then has the hands on experience of the problem. 

Now we can move into finding a solution. In most cases, the first solution we want to implement is going to focus on connecting just 2 machines. Don't worry about an internet. Worry about the _most basic_ implementation!

A chapter may only cover a single topic, but if the reader walks away with a solid understanding of the foundation, there's so much more potential to build. The journey itself is also helpful for both the reader and the authors! We'll get to the super cool, fun stuff before we're done with the topic. It just might take a few chapters to make sure those foundations are set.

## Chapter Ready: Definition of Done

Chapter has each of the following:

* a well defined goal
* content that meets that goal
* activities for readers to participate/explore in achieving that goal
* exercises at the end to explore further/test understanding

## Checklist: Move Chapter from Future => Chapters

* reread the whole chapter checking for:
  * flow
  * comprehension
  * definitions
  * links to glossary/websites
* check that all commands work as described
  * re-do all exercises to ensure that commands work and the output is correct
* all TODOs within the chapter are resolved and removed (unless there is a much grander reason to keep them)

After moving to the `/chapters` directory, make sure all your links work!