## 1. Resolve the two blockers

Nothing else starts until these answer. Both can change the shape of the work rather than its
content.

- [ ] 1.1 Track celilo/celilo#975, multi-instance modules. It is the critical path and nothing here ships before it. Review the `celilo_module_deploy_worker` interface as it lands, since this change is its first consumer and the shape should be driven by a real caller.
- [ ] 1.2 Run the ISS-0013 spike. Nested docker with `NET_ADMIN` inside an unprivileged LXC, running `chapters/1.3-internet-chonk` end to end, against a KVM virtual machine as the control. Record boot time, clone time, idle memory, disk, and every privilege concession the LXC needed.
- [ ] 1.3 Write the `quarantine` egress allowlist down concretely: which container registry, which package repositories, whether git. Before implementation, not after the first exercise fails at eleven at night.
- [ ] 1.4 From 1.2 and the actual capacity of the node behind `proxmox-home-lab`, set the fleet cap in D17.
- [ ] 1.5 Read `modules/wireguard-manager`: `README.md`, `manifest.yml`, `scripts/reconcile-plan.ts`, `scripts/app-client.ts`, `scripts/reconcile-clients.ts`, `server/src/api.ts`, `server/src/store.ts`. This design copies its shape. Raise anything that contradicts `design.md` before writing code.
- [ ] 1.6 Read `lunacycle/apps/lunacycle-server/src` for the stack shape: `db.ts`, `schema.ts`, `trpc.ts`, `appRouter.ts`, `rate-limit.ts`. Do not copy how it triggers migrations, per D8 and celilo/lunacycle#63.

## 2. App server skeleton

- [ ] 2.1 Create `server/` on the latest Bun. Dependencies: `@trpc/server`, `trpc-bun-adapter`, `drizzle-orm`, `zod`.
- [ ] 2.2 Set up the tRPC router and Bun adapter, with Zod validating every procedure input.
- [ ] 2.3 Implement `GET /api/health` as plain HTTP, unauthenticated, reporting database reachability and the counts awaiting provision and destruction.
- [ ] 2.4 Bind to the zone address, not only loopback, so the control plane can reach the app directly.
- [ ] 2.5 Validate configuration at startup and fail with an actionable message. No silent fallbacks.

## 3. Storage

- [ ] 3.1 Define the Drizzle schema for `users` (D6), `sessions` (D3), and `labs` (D10). Unique index on `labs.user_sub`, index on `users.preferred_username`. Set `PRAGMA journal_mode = WAL`.
- [ ] 3.2 Run migrations from the app at startup (D8).
- [ ] 3.3 Prove it: deploy a version carrying a pending migration and confirm the schema changed with no hook run by hand. This is the celilo#169 gate and it must be seen to fail before it is trusted.
- [ ] 3.4 Put the database file on a path the publish step does not replace, and prove a redeploy keeps the records.

## 4. The login, server-side

- [ ] 4.1 Implement `GET /api/auth/login`: generate `state` and a PKCE verifier, store them, redirect to the identity provider.
- [ ] 4.2 Implement `GET /api/auth/callback`: verify `state`, exchange the code with the client secret and verifier, create a session, set the cookie.
- [ ] 4.3 Set the cookie `HttpOnly`, `Secure`, `SameSite=Lax`, path-scoped. Session id from `crypto.getRandomValues`, at least 128 bits, base64url.
- [ ] 4.4 Implement silent refresh: when a request arrives on a live session with an expired access token, refresh underneath it. Delete the session when the refresh grant is refused.
- [ ] 4.5 Implement `POST /api/auth/logout`: delete the session, clear the cookie, and call the provider's `end_session_endpoint`.
- [ ] 4.6 Sweep expired sessions on read and on a periodic pass.
- [ ] 4.7 Implement CSRF: a readable token bound to the session, echoed in a header, checked on every mutation (D4).
- [ ] 4.8 Prove the cross-site mutation is refused. This failure is quiet, so the test has to be seen failing first.

## 5. Token verification

- [ ] 5.1 Implement JWKS retrieval, caching by `kid`, refetch on unknown `kid` with a cooldown.
- [ ] 5.2 Implement verification with `crypto.subtle`, deriving the permitted algorithm set from the key set and never from the token header. Check `iss`, `exp` with clock skew, and `nbf`.
- [ ] 5.3 Write the negative tests and make them pass: tampered payload, `alg: none`, HMAC signed with the public key, expired, wrong issuer, an opaque provider API token, and an unknown-`kid` burst that does not become a refetch amplifier.
- [ ] 5.4 Implement `identityFrom`, reading `sub`, `preferred_username`, `email`, `groups`. Throw a named error when `groups` or `preferred_username` is absent, naming the missing scope (D7).
- [ ] 5.5 Review 5.1 to 5.4 against D5. If it has grown special cases, take `jose` and re-run the tests from 5.3 unchanged.

## 6. Lab intent, in the app

- [ ] 6.1 Implement the SSH public key validator: parse and re-serialize, reject option prefixes, embedded newlines, unsupported types, and RSA under 3072 bits (D15). Test each rejection.
- [ ] 6.2 Implement the request procedure: validate the key, check the per-person and fleet caps, write desired present, advance the generation, return immediately.
- [ ] 6.3 Implement the release procedure: write desired absent, advance the generation, return pending.
- [ ] 6.4 Implement the read procedure: a person's own lab and its state, returning not-found for anyone else's.
- [ ] 6.5 Implement the extend procedure, moving `expires_at` out.
- [ ] 6.6 Prove two simultaneous requests from one person yield exactly one lab, and that the guarantee comes from the unique index rather than from a check.
- [ ] 6.7 Implement `/api/reconcile/labs` as plain HTTP: bearer compared in constant time, returning active and released lists. Reject a person's session here, and reject this credential on the browser surface.
- [ ] 6.8 Implement `/api/reconcile/labs/:id/state` for the control plane to report outcomes, including address, port, and host key fingerprint.

## 7. The control plane

- [ ] 7.1 Write `celilo/scripts/lab-client.ts` on the shape of `wireguard-manager/scripts/app-client.ts`: injected `fetch`, and every failure returning `unreadable`. Never an empty read.
- [ ] 7.2 Write `celilo/scripts/reconcile-plan.ts` as a pure function taking only the successful read variant (guard one, D12). Test it against an explicit table.
- [ ] 7.3 Implement destruction driven only by release, never by absence (guard two). Report orphans and leave them running.
- [ ] 7.4 Handle the contradiction where a lab is both active and released by treating it as released and logging it.
- [ ] 7.5 Write `celilo/scripts/reconcile-labs.ts`: read, plan, execute each item independently with its own error handling, report each outcome back.
- [ ] 7.6 Implement provisioning: instantiate `byoi-lab-node` through `celilo_module_deploy_worker` with the person's validated public key in its config and every interview answer supplied up front. celilo does the addressing, placement, Terraform, and Ansible. Register the port forward through the `firewall` capability, read back the host key fingerprint, report the result.
- [ ] 7.7 Implement destruction: remove the port forward, destroy the instance through the deploy worker, report it. Do not recycle the port immediately (D18).
- [ ] 7.11 Confirm a question `byoi-lab-node` can ask with no supplied answer fails the instantiation loudly rather than parking. Nobody is coming to answer it.
- [ ] 7.8 Destroy expired labs through the same release path (D17).
- [ ] 7.9 Prove an unreachable app changes nothing and does not fail the hook.
- [ ] 7.10 Prove a truncated active list destroys nothing.

## 7b. `byoi-lab-node`

- [ ] 7b.1 Declare the `quarantine` network at the top level, with the allowlist from 1.3, no inbound except the forwarded SSH ports, and trusted-source status for no zone at all.
- [ ] 7b.2 Write `byoi-lab-node` as an instantiable module: resources from the ISS-0013 outcome, `quarantine` insisted upon and never written, a public key in its config.
- [ ] 7b.3 Bake the image: docker, docker compose, the chapter material, a `learner` account. No celilo token, no Proxmox token, no registry credential (D16).
- [ ] 7b.4 Confirm a lab cannot reach celilo, the hypervisor's management interface, or anything else inside the fleet.
- [ ] 7b.5 Confirm removing `byoi` destroys every `byoi-lab-node` instance.

## 8. Profile page

- [ ] 8.1 Add `web/src/pages/profile.astro` as a static shell.
- [ ] 8.2 Add `web/src/components/Profile.tsx` as a `client:load` island: paste a key, request, watch state, read address, port, fingerprint, and expiry, extend, release.
- [ ] 8.3 Show pending states honestly, including that a release is not instant.
- [ ] 8.4 Render an explicit failure state when `/api/` is unreachable (risk R8).
- [ ] 8.5 Link to `/profile` from `AppHeaderBar.astro` only when signed in.

## 9. Strip the browser's auth code

- [ ] 9.1 Reduce `web/src/lib/auth-client.ts` to a redirect to `/api/auth/login` and a fetch helper carrying the CSRF token. Delete the PKCE generation, the token exchange, the `localStorage` reads and writes, and `decodeJWT`.
- [ ] 9.2 Delete `web/src/pages/auth/callback.astro` and `web/src/components/AuthCallback.tsx`. The callback lands on the app.
- [ ] 9.3 Delete the `PUBLIC_AUTH_MODE=dev` bypass and the `dev` script's env var. Under BFF there is no browser auth state to fake.
- [ ] 9.4 Rewrite `web/scripts/auth-client-test.ts` for what is left, and delete the assertions that only made sense for a browser-side exchange.
- [ ] 9.5 Confirm no token and no client secret appears in any built asset.

## 10. Module and deployment

- [ ] 10.1 Add the app system to `celilo/manifest.yml` in the `app` zone, with the shape found in task 1.6.
- [ ] 10.2 Add the `/api/` route registration on the hostname caddy already serves.
- [ ] 10.3 Declare the `reconcile_token` secret with `generate: { method: random, length: 32 }`, and `smoketest_bot_password` as required and generated.
- [ ] 10.4 Add the `timer.tick.1m` subscription for `reconcile_labs`, and confirm `celilo module run-hook byoi reconcile_labs` works on demand.
- [ ] 10.5 Update `celilo/scripts/setup.ts` to provision the confidential OIDC client with `profile`, `groups`, and `offline_access`, and the `smoketest_bot` account.
- [ ] 10.6 Regenerate `celilo/celilo/types.d.ts` with `celilo module types generate`. Do not hand-edit it.
- [ ] 10.7 Extend the build to produce the app artifact alongside `web/dist`.
- [ ] 10.8 Update the health check to report unhealthy on a database failure and to report the converged counts.
- [ ] 10.9 Confirm the app has no public port, no DNAT rule, and no DNS record of its own.
- [ ] 10.10 Confirm the app holds no infrastructure credential and makes no outbound call to celilo, Proxmox, or the firewall. This is the bright line, and now is when it is cheapest to keep.

## 11. End-to-end gate

- [ ] 11.1 Run `cele2e build-infra --published`, then `bash e2e/bake-management.sh`, per the ISS-0009 workaround. Confirm the harness comes up before writing any assertion.
- [ ] 11.2 On the `namecheap`, `iptables`, `caddy`, `authentik`, `byoi` topology, sign in as `smoketest_bot` through the real login flow and read back the identity.
- [ ] 11.3 Drive a whole lab lifecycle: request, run the hook, wait for ready, SSH in with the submitted key, assert docker runs, release, run the hook, assert it is gone.
- [ ] 11.4 Assert an invented session identifier and a token the provider did not sign are both refused.
- [ ] 11.5 Assert a header naming a user with no valid session is refused.
- [ ] 11.6 Assert a cross-site mutation is refused.
- [ ] 11.7 Assert every chapter page still serves with the app stopped.
- [ ] 11.8 Assert no built asset contains a token or the client secret.

## 12. Close out

- [ ] 12.1 Run the full gates: `bun install` in `web/` and `server/`, then typecheck, build, and tests in both. Report the total failure count unqualified and fix everything.
- [ ] 12.2 Deploy: `celilo module import byoi`, `celilo module deploy byoi`, `celilo module health byoi`.
- [ ] 12.3 Request a lab as a real person against production, SSH into it, run a chapter exercise, release it.
- [ ] 12.4 Write the answers to the remaining open questions into `design.md`, update ISS-0013 with the spike result, and file issues for anything deferred.
