## Why

byoi teaches internet fundamentals. Each chapter in `chapters/` ships a `docker-compose.yml`
that stands up a small simulated internet, and asks the reader to break and repair it. Chapter
1.1 hands you two containers with `NET_ADMIN` and has you delete the default route. Later
chapters build up through routing, DNS, and traceroute.

Reading that on a website is not the same as doing it. Doing it needs a box with docker on it,
and today every reader has to bring their own.

This change gives each signed-in person their own **lab**: a container on the home lab, built
on request, reachable over SSH with a key they supply, with the chapter material already on it.
They ask for it from a profile page. They throw it away when they are done.

There is a second reason, and it is the one that shapes the design. byoi's login is currently
decorative. `web/src/lib/auth-client.ts:47` says so:

> `// Decode JWT payload without verification — display + UI gating only, not authorization.`

Anyone can write a token into `localStorage` by hand and the page will believe them. That costs
nothing while every byte the site serves is public. It stops being free the moment a button
allocates real compute.

## The bright line

This is the governing constraint. It is peba's rule, and everything below follows from it.

**Data plane.** People and their traffic. Someone opens `buildyourowninternet.dev`, signs in,
sees what has been provisioned for them, asks for a lab, or gets rid of one. Later, someone
opens an SSH session into that lab and plays with the network.

**Control plane.** Knowing what provisioning should happen, and performing it.

**The control plane talks to the data plane. Never the other way around.**

```
   browser ── HttpOnly session cookie ──▶ app server        (data plane, app zone)
                                              │
                                              │ writes down what people want
                                              ▼
                                          SQLite on the box
                                              ▲
                                              │ reads what people want
   celilo timer.tick.1m ──▶ reconcile_labs ───┘            (control plane)
                                   │
                                   │ provisions, and reports back what is true
                                   ▼
                          Proxmox, firewall, IPAM
```

The app server never calls Proxmox, never calls the firewall, and holds no credential for
either. It writes "alice wants a lab" into its own database and answers "pending". On the next
tick the hook reads that row, builds the container, registers the port forward, and writes the
result back.

Break into the app server and you can ask for labs. You cannot take the hypervisor.

`modules/wireguard-manager` in the celilo checkout already does this, for VPN peers instead of
labs. Its `reconcile-plan.ts` is the reference, and this change copies its shape closely.

## Backend-for-frontend, not tokens in the browser

The app server runs the whole OIDC flow and keeps the tokens. The browser gets an HttpOnly,
Secure, SameSite cookie and nothing else.

This is the recommended architecture for browser applications that have a backend, and the
reasoning is blunt: any token the browser can read, cross-site script can read. That is true of
`localStorage`, and it is equally true of a variable held in a closure. There is nowhere in a
browser to put a token where script cannot reach it.

Four things fall out of it, and they are why this is worth the sessions table:

- **A stolen session cannot outlive the page.** Script running in the page can still act as the
  person while they are there. It cannot carry a credential away and use it for a month.
- **Revocation is a delete.** Today nothing can revoke anything, because every consumer verifies
  statelessly against JWKS and never asks authentik a question. Disable a user and their token
  keeps working until it expires.
- **The access-token lifetime stops being a user-facing number.** The server refreshes without
  the page knowing. This matters here because `modules/authentik/scripts/idp-functions.ts`
  hands out 30-day access tokens (filed as celilo#969, with celilo#970 for the blocker), and a
  30-day credential held only on the app server is a completely different exposure from one
  sitting in a tab.
- **The browser's auth code disappears.** No PKCE verifier to generate in the page, no `state`
  to check, no callback to parse, no token storage, no refresh. `web/src/lib/auth-client.ts`
  shrinks to a redirect and a fetch.

PKCE stays, generated server-side. It closes authorization-code interception completely and
costs nothing. It does not protect tokens after the exchange, which is a different threat and
the one BFF answers.

## What Changes

**A byoi app server**, one Bun process in the `app` zone, reverse-proxied by caddy at `/api/`
on the hostname the site already serves. The content site stays static at `/`. Two hundred
chapters of markdown gain nothing from per-request rendering and lose their cache.

- **The login moves to the server.** `/api/auth/login` redirects, `/api/auth/callback` exchanges
  the code with the client secret, and the response sets a session cookie.
- **A session table**, so signing out and revoking are both a delete.
- **A labs table** carrying desired and observed state separately, which is what makes the
  reconcile loop idempotent and crash-safe.
- **A profile page** where you paste an SSH public key, ask for a lab, watch it come up, read
  its address and port, and destroy it.
- **A `reconcile_labs` hook** on a `timer.tick.1m` subscription that reads the app, compares it
  to what exists, and closes the gap. Plus `celilo module run-hook byoi reconcile_labs` for
  running it on demand.
- **`byoi-lab-node`**, a new instantiable module. A lab is one instance of it. byoi does not
  create containers, it asks celilo to instantiate a module, and celilo does the addressing,
  placement, Terraform, and Ansible. So byoi holds no hypervisor credential anywhere, control
  plane included.
- **A `quarantine` network**, declared once at the top level. `byoi-lab-node` insists it exists
  and is placed in it. Outbound to a small allowlist, inbound only the forwarded SSH ports, and
  a trusted source for no zone at all. That is the exact inverse of the wireguard client subnet,
  which is a registered trusted source permitted to initiate into every managed zone.

**BREAKING, the OIDC client becomes confidential.** Today byoi has a public client and the
browser finishes the exchange. The `idp` capability provisions the replacement, so
`celilo/scripts/` changes and the existing client is retired.

**BREAKING, the browser stops holding tokens.** Everyone signs in again once.

**REMOVED, the client-side dev bypass.** `PUBLIC_AUTH_MODE=dev` in `auth-client.ts` faked a
logged-in user for local work. Under BFF the browser has no auth state to fake. Local
development signs in against real authentik, and the end-to-end suite signs in as a provisioned
`smoketest_bot` account, which is what `wireguard-manager` does. A bypass that must be kept out
of production is machinery built to make a hole safe.

**Not in this change.** No terminal in the browser, and no chapter-following behaviour. Those
were sketched as MVP 2 and MVP 3 and they stay there. Access to a lab is SSH from the person's
own terminal, which is wanted on its own merits because some people will insist on it.

## Capabilities

### New Capabilities

- `authenticated-session`: the server-side OIDC flow, the session cookie, CSRF defence, session
  revocation, and the user record.
- `lab-lifecycle`: what a person can ask for, the desired-and-observed state model, the
  reconcile loop and the two guards that keep a bad read harmless, SSH key handling, and quota.
- `app-server-deployment`: the app as a deployed thing. Zone placement, the `/api/` route,
  health, and an end-to-end gate that signs in for real.

### Modified Capabilities

None. `openspec/specs/` is empty, so there is nothing to delta against.

## Impact

| Path | Change |
|---|---|
| `server/` (new) | the app. OIDC flow, sessions, labs, tRPC, health |
| `web/src/lib/auth-client.ts` | shrinks to a redirect and a fetch. Token handling deleted |
| `web/src/pages/auth/callback.astro`, `web/src/components/AuthCallback.tsx` | deleted. The callback lands on the server |
| `web/src/pages/profile.astro`, `web/src/components/Profile.tsx` (new) | the lab UI |
| `celilo/manifest.yml` | app system, `/api/` route, confidential idp client, reconcile secret, timer subscription |
| `celilo/scripts/setup.ts` | provisions the OIDC client and `smoketest_bot` |
| `celilo/scripts/reconcile-labs.ts` (new) | the control plane. Calls the deploy worker, never Proxmox |
| `celilo-lab-node/` (new) | the instantiable module a lab is an instance of |
| `celilo/e2e/` | real sign-in, forged-credential refusal, a full lab lifecycle |

**Dependencies.** `@trpc/server`, `trpc-bun-adapter`, `drizzle-orm`, and `zod`, matching
`lunacycle`. JWT verification is roughly a hundred lines of `crypto.subtle` rather than a
library, because under BFF the app receives tokens directly from the token endpoint over TLS
and is not verifying tokens submitted by untrusted callers. See design D5.

**Infrastructure.** The `app` zone gains one system. Caddy gains one route. Labs go on a new
`quarantine` network which does not exist yet.

**This change depends on a celilo feature that does not exist**, and that is now its critical
path. Multi-instance modules are proposed in celilo/celilo#975. Nothing here ships before that
lands, and the decision was to build it there first rather than ship byoi against a temporary
compute capability and swap later, because a swap leaves a fallback path and fallback paths are
where the next bug hides.

Worth noting what did not move when the substrate changed from "call Proxmox" to "instantiate a
module": the whole reconcile design. Desired and observed columns, the loop, both guards, the
orphan handling, and the per-item error isolation are indifferent to what does the building.

**Open issues.**

- **celilo/celilo#975, multi-instance modules, is the critical path.** Nothing here ships first.
- **ISS-0013, the LXC spike, blocks shipping but no longer blocks writing.** It reduced to one
  field in `byoi-lab-node`'s manifest, where `resources.type` takes `lxc` or `vm`. It still
  decides per-learner cost by roughly an order of magnitude and therefore the fleet cap.
- **ISS-0009, high, open.** `@celilo/e2e` is pinned at 0.9.0 plus the local
  `celilo/e2e/bake-management.sh` workaround, because 0.9.1 declares `workspace:^` dependencies
  and will not install. Every end-to-end run here inherits it.
- celilo#969 and celilo#970 cover the 30-day access token. BFF defuses it for byoi without
  fixing it fleet-wide.
