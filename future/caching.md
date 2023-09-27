# Caching with a reverse proxy

## Goal

As we know, cache is king. We need to get our files to our clients as quickly as possible. Let's implement caching to bring our HTTP responses closer to the end user.

Caching is a tool that internet applications use to speed up delivery of responses to clients around the world. It does so by storing a copy of the response in a location that is easier/faster for the client to access.

By the time we're through, let's answer:

- Can we store a copy of an HTTP response on a caching server?
- Can we set a TTL on the cached object?
- Can we distinguish between different HTTP verbs?
- Can we measure the time difference between retrieving the original object and the cached object?
- Can we invalidate that cached object?

PRO TIP! Complete the HTTP or TCP chapters first. This will allow you to build in network delays that you can then use to measure performance.

## Implementation Questions

What software are you gonna install?
How will you know if it works?
How will you troubleshoot problems?
Links or existing documentation that could be helpful?
Can you draw what your internet will look like by the end of your implementation?
