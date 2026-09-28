## ADDED Requirements

### Requirement: The browser never receives an OAuth token

The app server SHALL perform the entire OIDC authorization-code flow, including generating the
PKCE verifier, exchanging the code with the client secret, and refreshing the access token. The
browser SHALL receive an opaque session identifier in an HttpOnly cookie and nothing else.

No access token, refresh token, ID token, client secret, or PKCE verifier may be readable by
page script or appear in any served asset.

#### Scenario: Signing in yields only a cookie

- **WHEN** a person completes a login
- **THEN** the response sets an HttpOnly, Secure, SameSite cookie carrying an opaque identifier, and the response body carries no token of any kind

#### Scenario: Page script cannot read the session

- **WHEN** script running on the page reads every cookie available to it
- **THEN** the session identifier is not among them

#### Scenario: No token appears in any served asset

- **WHEN** every asset the site serves is fetched and searched
- **THEN** no OAuth token and no client secret appears in any of them

#### Scenario: The code exchange happens server-side

- **WHEN** the identity provider redirects back with an authorization code
- **THEN** the app server exchanges it, and the browser makes no request to the identity provider's token endpoint

### Requirement: A session is revocable and independent of token lifetime

The app SHALL store each session server-side, keyed on an identifier with at least 128 bits of
entropy from a cryptographic source. Deleting the stored session SHALL immediately stop that
browser from acting as the person, without waiting for any token to expire.

The app SHALL refresh the access token underneath a live session without involving the browser.
When the refresh grant fails, the app SHALL delete the session.

#### Scenario: Revoking a session takes effect on the next request

- **WHEN** a session row is deleted while that browser has the cookie
- **THEN** the browser's next API call is refused and it is treated as signed out

#### Scenario: An expired access token is refreshed invisibly

- **WHEN** a request arrives on a live session whose access token has expired and whose refresh token is valid
- **THEN** the app refreshes and serves the request, and the browser observes nothing unusual

#### Scenario: A refused refresh ends the session

- **WHEN** the identity provider refuses the refresh grant
- **THEN** the app deletes the session and the person is treated as signed out

#### Scenario: Signing out ends the session at both ends

- **WHEN** a person signs out
- **THEN** the stored session is deleted, the cookie is cleared, and the identity provider's own session is ended

#### Scenario: Session identifiers are not guessable

- **WHEN** a session identifier is generated
- **THEN** it carries at least 128 bits of entropy from a cryptographic random source and is opaque, carrying no readable claims

### Requirement: State-changing requests are protected against cross-site forgery

The session cookie SHALL be set with `SameSite=Lax` or stricter. Every state-changing request
SHALL additionally require a CSRF token that page script can read and echo, which the server
compares against a value bound to the session.

A cookie is sent by the browser whether or not the page asked for it, which is the one thing a
bearer header gave away for free.

#### Scenario: A cross-site mutation is refused

- **WHEN** another origin causes the browser to submit a state-changing request carrying the session cookie and no CSRF token
- **THEN** the request is refused and nothing changes

#### Scenario: A mismatched CSRF token is refused

- **WHEN** a state-changing request arrives carrying a CSRF token that does not match the one bound to the session
- **THEN** the request is refused

#### Scenario: A same-origin mutation succeeds

- **WHEN** the site's own page makes a state-changing request with its session cookie and matching CSRF token
- **THEN** the request is served

### Requirement: Tokens are verified before their claims are trusted

Before reading any claim, the app SHALL verify the token's signature against the issuer's
published key set and check that `iss` matches the configured issuer, that it has not expired,
and that it is not used before its `nbf`.

The permitted signing algorithms SHALL be derived from the issuer's key set and never from the
token's own header. The app SHALL bound how often an unrecognised key identifier can cause it to
refetch the key set.

#### Scenario: A tampered token is rejected

- **WHEN** a token whose payload was edited after signing is verified
- **THEN** verification fails and no claim is read from it

#### Scenario: An unsigned token is rejected

- **WHEN** a token declaring `"alg": "none"` is verified
- **THEN** verification fails

#### Scenario: A symmetrically signed token is rejected

- **WHEN** a token signed with HMAC using the issuer's public key as the secret is verified
- **THEN** verification fails

#### Scenario: An expired token is rejected

- **WHEN** a token whose expiry has passed is verified
- **THEN** verification fails

#### Scenario: A token from another application is rejected

- **WHEN** a token carrying a different `iss` is verified
- **THEN** verification fails

#### Scenario: An opaque provider API token is rejected

- **WHEN** an identity provider API token rather than a signed access token is verified
- **THEN** verification fails

#### Scenario: Unknown key identifiers cannot be used to hammer the provider

- **WHEN** a burst of tokens arrives bearing key identifiers the issuer does not publish
- **THEN** they are all rejected and the key set is refetched no more than once per cooldown interval

### Requirement: A missing claim is a configuration fault, not an empty value

When a verified token carries no `groups` claim or no `preferred_username` claim, the app SHALL
fail with an error naming the scope the OIDC client is missing. It SHALL NOT treat an absent
`groups` claim as membership of no groups.

Treating an absent claim as an empty one reports a provisioning fault as an ordinary refusal,
and an ordinary refusal is the one thing nobody investigates.

#### Scenario: A token without groups is a fault

- **WHEN** a verified token carries no `groups` claim
- **THEN** the app fails with an error naming the `groups` scope, rather than treating the person as a member of nothing

#### Scenario: A token without a username is a fault

- **WHEN** a verified token carries no `preferred_username` claim
- **THEN** the app fails with an error naming the `profile` scope

### Requirement: A user record is kept for each subject

The app SHALL keep a durable user record keyed on the `sub` claim, created on first sign-in and
updated afterward. It SHALL also store `preferred_username`, indexed, because `sub` is a
per-application hash that no person can read back to an account.

Records SHALL NOT be keyed on username or email. Both change at the provider, and a user record
owns a lab, so a rename must not orphan a running container.

#### Scenario: First sign-in creates the record

- **WHEN** a person whose `sub` has never been seen signs in
- **THEN** a record is created carrying that `sub`, username, email, and groups

#### Scenario: Later sign-ins update rather than duplicate

- **WHEN** the same `sub` signs in again
- **THEN** the existing record is updated and no second record is created

#### Scenario: A renamed person keeps their lab

- **WHEN** a person's username changes at the provider and they sign in with the same `sub`
- **THEN** the existing record is updated in place and any lab associated with that `sub` is still theirs

#### Scenario: An operator can find a person by name

- **WHEN** an operator looks up a user record by `preferred_username`
- **THEN** the record is found without needing to know the subject hash

### Requirement: There is no development bypass and no trusted header

The app SHALL NOT provide any mode that accepts an unverified identity, and SHALL NOT trust any
request header asserting who the caller is.

A bypass that must be prevented from reaching production is machinery built to make a hole safe.
Local development and the end-to-end suite both sign in for real, against an account provisioned
for the purpose.

#### Scenario: A forwarded-user header is ignored

- **WHEN** a request carries a header naming a user and no valid session
- **THEN** the app refuses it and does not adopt the identity in the header

#### Scenario: No unverified path exists

- **WHEN** the app's configuration is examined for a setting that accepts an unverified identity
- **THEN** no such setting exists
