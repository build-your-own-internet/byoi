# add-learner-labs

A signed-in person presses a button and gets their own lab: a container on the home lab
where they run the chapter exercises, reachable over SSH with their own public key.

The app server is a backend-for-frontend. It holds the OIDC tokens and hands the browser an
HttpOnly session cookie. It writes down what people want and calls no infrastructure. A celilo
hook on a timer reads that intent and provisions against it.

Merges what were separately scoped as MVP 0 (auth) and MVP 1 (machines), because an MVP that
only lets you read your own name off a page is not a usable system.
