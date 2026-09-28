## ADDED Requirements

### Requirement: A person can ask for a lab and give it back

A signed-in person SHALL be able to request one lab, see its state while it is being built, read
the details needed to reach it, and release it. Requesting SHALL record intent and return
immediately. The app SHALL NOT call any infrastructure while serving the request.

A lab is one person's practice environment: a container carrying docker and the chapter
material, where the exercises run.

#### Scenario: Requesting records intent and returns at once

- **WHEN** a signed-in person requests a lab
- **THEN** the response is immediate, reports the lab as pending, and the app has made no call to any hypervisor, firewall, or address manager

#### Scenario: A person sees what they need to connect

- **WHEN** a person's lab has been built
- **THEN** they are shown its address, its SSH port, its host key fingerprint, and its expiry

#### Scenario: Releasing records intent, and says it is not instant

- **WHEN** a person releases their lab
- **THEN** the lab is marked for destruction, the person is told it is pending rather than gone, and the app calls no infrastructure

#### Scenario: A person sees only their own lab

- **WHEN** a person asks for a lab that belongs to somebody else
- **THEN** the response is a not-found, so nobody can learn a lab exists by being refused it

#### Scenario: An anonymous caller cannot request anything

- **WHEN** a caller with no valid session requests a lab
- **THEN** the request is refused and nothing is recorded

### Requirement: Desired state and observed state are recorded separately

Each lab SHALL carry a desired state and an observed state as distinct values, along with a
generation that advances whenever desired state changes and the generation the control plane
last acted upon.

A single status value cannot express "this was asked to be destroyed and four attempts have
failed". Separating the two makes the loop a reconciliation rather than a state machine with
error edges bolted on, and makes it safe to crash anywhere.

#### Scenario: Requesting sets desired state without touching observed state

- **WHEN** a person requests a lab
- **THEN** desired state becomes present, observed state remains absent, and the generation advances

#### Scenario: A crash mid-provision is recovered on the next pass

- **WHEN** the control plane stops partway through building a lab and runs again
- **THEN** it resumes from the recorded desired and observed states without needing to know what the interrupted run had done

#### Scenario: A re-request during a slow destroy is not satisfied by the old work

- **WHEN** a person releases a lab and requests a new one while the destruction is still running, and a late report arrives for the earlier generation
- **THEN** the report does not mark the new request satisfied

#### Scenario: Repeated failures are visible

- **WHEN** provisioning a lab has failed several times
- **THEN** the attempt count and the last error are recorded and visible to an operator

### Requirement: An unreadable poll changes nothing

The control plane's read of the app SHALL be typed so that a failure cannot be handled as an
empty result. The planning step SHALL be callable only with a successful read.

Every failure SHALL be reported as unreadable, including a response that arrives with a success
status but a body that is not the expected shape, which is the case that otherwise looks exactly
like a fleet with no labs.

#### Scenario: An unreachable app changes nothing

- **WHEN** the control plane cannot reach the app
- **THEN** it logs a warning, provisions nothing, destroys nothing, and returns without failing the hook

#### Scenario: A proxy error page is not an empty fleet

- **WHEN** the read returns a success status carrying an HTML error page
- **THEN** the result is unreadable and nothing is destroyed

#### Scenario: A malformed entry rejects the whole read

- **WHEN** any single lab in the response is missing a required field
- **THEN** the entire read is unreadable rather than the malformed entry being skipped

#### Scenario: A refused credential is not an empty fleet

- **WHEN** the app refuses the control plane's credential
- **THEN** the result is unreadable and nothing is destroyed

### Requirement: Destruction is driven by release, never by absence

A lab SHALL be destroyed because the app reports it released, and never because it is missing
from the list of active labs. A short or truncated response SHALL be incapable of destroying
anything.

Infrastructure that exists, is unknown to the app, and has not been released SHALL be reported
as an orphan and left running.

#### Scenario: A short list destroys nothing

- **WHEN** the app returns an active list missing labs that exist, with no corresponding releases
- **THEN** nothing is destroyed and the missing labs are reported as orphans

#### Scenario: A released lab is destroyed

- **WHEN** the app reports a lab as released and the container still exists
- **THEN** the container is destroyed and its port forward is removed

#### Scenario: An orphan is reported and left alone

- **WHEN** a container exists that the app does not know about and has not released
- **THEN** it is reported to the operator and left running

#### Scenario: A lab both active and released is treated as released

- **WHEN** the app reports the same lab as both active and released
- **THEN** it is treated as released, the contradiction is logged, and it is not built

### Requirement: One failure does not abandon the batch

The control plane SHALL attempt each lab independently and record each outcome. A failure on one
lab SHALL NOT prevent the others in the same pass from being attempted.

#### Scenario: A failing lab does not block the others

- **WHEN** one lab fails to build and others are pending in the same pass
- **THEN** the others are still attempted, and the failure is recorded against that one lab

#### Scenario: Outcomes are reported back

- **WHEN** the control plane finishes acting on a lab
- **THEN** it reports the outcome to the app, including the address, port, and host key fingerprint on success, or the reason on failure

### Requirement: Public keys only, validated as structured data

A lab SHALL accept SSH public key authentication only. Password and keyboard-interactive
authentication SHALL be disabled, and root login SHALL be refused.

A submitted public key SHALL be parsed and re-serialized before being written to any
authorization file. It SHALL NOT be concatenated into that file as submitted. Keys carrying
command or option prefixes, embedded newlines, unsupported types, or RSA moduli under 3072 bits
SHALL be rejected.

`authorized_keys` is a file format with semantics, and the value being written comes from a web
form.

#### Scenario: An option-prefixed key is rejected

- **WHEN** a person submits a key line beginning with a `command=` or similar option prefix
- **THEN** it is refused and nothing is written

#### Scenario: A smuggled second key is rejected

- **WHEN** a person submits a value containing an embedded newline followed by another key
- **THEN** it is refused and nothing is written

#### Scenario: A weak key is rejected

- **WHEN** a person submits an RSA key under 3072 bits
- **THEN** it is refused with a message saying what is acceptable

#### Scenario: A valid key reaches the lab

- **WHEN** a person submits a well-formed ed25519 public key and their lab is built
- **THEN** they can authenticate to it with the matching private key

#### Scenario: Password authentication does not work

- **WHEN** somebody attempts password authentication against a lab
- **THEN** the attempt is refused regardless of what password is offered

### Requirement: A person can verify they reached their own lab

The control plane SHALL record each lab's SSH host key fingerprint when it builds it, and the
app SHALL show that fingerprint alongside the connection details.

Trust-on-first-use over recycled addresses trains people to accept mismatch warnings, which is
worse than having no verification story at all.

#### Scenario: The fingerprint is shown before first connection

- **WHEN** a lab becomes reachable
- **THEN** its host key fingerprint is shown with its address and port

#### Scenario: A rebuilt lab shows its new fingerprint

- **WHEN** a lab is destroyed and a new one built for the same person
- **THEN** the displayed fingerprint is the new lab's

### Requirement: Labs are reachable without any public name

Each lab SHALL be reached through one forwarded port, allocated by the control plane and
recorded against the lab. No public DNS record SHALL be published for a lab.

A public record would be a list of targets, and there is nothing that needs a name.

#### Scenario: A lab is reachable on its assigned port

- **WHEN** a person connects to the published address on their lab's port
- **THEN** they reach their own lab's SSH service

#### Scenario: No public record is published for a lab

- **WHEN** a lab is built
- **THEN** no DNS record naming it is published

#### Scenario: The forward is removed with the lab

- **WHEN** a lab is destroyed
- **THEN** its port forward is removed and the port stops reaching anything

### Requirement: Capacity is bounded per person and across the fleet

A person SHALL hold at most one lab, enforced by the storage layer rather than by a check that
can race. The fleet SHALL enforce a maximum total number of labs, refusing further requests with
a message that explains the limit rather than queueing them.

Every lab SHALL carry an expiry. Expired labs SHALL be destroyed through the same release path
as any other destruction, and a person SHALL be able to extend their lab's expiry.

Expiry is deliberately simpler than idle detection. It needs nothing reported out of the lab, it
cannot be defeated by a process that keeps the box busy, and the person stays in control.

#### Scenario: A second request is refused

- **WHEN** a person who already holds a lab requests another
- **THEN** the request is refused and no second lab is recorded

#### Scenario: Two simultaneous requests yield one lab

- **WHEN** the same person submits two requests at once
- **THEN** exactly one lab is recorded

#### Scenario: The fleet cap refuses rather than queues

- **WHEN** the fleet already holds the maximum number of labs and somebody requests one
- **THEN** the request is refused with a message explaining the limit, and nothing is queued

#### Scenario: An expired lab is destroyed

- **WHEN** a lab passes its expiry
- **THEN** it is destroyed on a subsequent pass, through the same path as a lab released by its holder

#### Scenario: A person can extend before expiry

- **WHEN** a person extends their lab before it expires
- **THEN** the expiry moves out and the lab is not destroyed

### Requirement: A lab is built by celilo, never by byoi

The control plane SHALL create and destroy labs by instantiating and destroying instances of an
instantiable module through celilo, and SHALL NOT call a hypervisor, an address manager, or a
firewall's underlying system directly. It SHALL supply an answer for every interview question
that module can raise, and an unanswered question SHALL fail the instantiation rather than wait.

A lab built outside celilo's model is a container the operator cannot see and nothing claims.
And an instantiation triggered by somebody pressing a button cannot pause for a human, because
nobody is coming.

#### Scenario: Building a lab goes through celilo

- **WHEN** the control plane builds a lab
- **THEN** it instantiates a module through celilo, and makes no direct call to a hypervisor

#### Scenario: A lab is visible to the operator as something owned

- **WHEN** a lab exists
- **THEN** an operator can see it, which module it is an instance of, and that byoi owns it

#### Scenario: An unanswered question fails rather than waits

- **WHEN** instantiating a lab raises an interview question with no answer supplied
- **THEN** the instantiation fails naming the missing answer, and does not pause waiting for a human

#### Scenario: Removing byoi removes every lab

- **WHEN** the byoi module is removed
- **THEN** every lab it owns is destroyed

### Requirement: Labs sit on a quarantine network they do not create

Labs SHALL be placed on a network declared once for the purpose, which the lab module insists
exists and never writes. That network SHALL permit outbound access only to a named allowlist,
SHALL permit inbound only on the forwarded SSH ports, and SHALL be a trusted source for no zone.

Labs sharing that network can reach each other. That is accepted rather than solved.

#### Scenario: A lab reaches what it needs to work

- **WHEN** a learner pulls a container image or installs a package inside their lab
- **THEN** the request succeeds

#### Scenario: A lab reaches nothing else on the internet

- **WHEN** a lab attempts to reach an internet host outside the allowlist
- **THEN** the connection is refused or dropped

#### Scenario: A lab reaches nothing inside the fleet

- **WHEN** a lab attempts to reach any managed zone
- **THEN** the connection is refused or dropped

#### Scenario: The network is declared once

- **WHEN** many labs exist
- **THEN** the network was declared once and no lab created one

### Requirement: A lab carries nothing worth stealing

The image a lab is built from SHALL contain no credential for celilo, the hypervisor, the
registry, or any other fleet service.

A person has root on their lab by design, and anyone with an account can obtain one.

#### Scenario: The image holds no fleet credential

- **WHEN** a freshly built lab's filesystem is searched for fleet credentials
- **THEN** none is present

#### Scenario: A lab cannot reach the control plane

- **WHEN** a lab attempts to reach celilo or the hypervisor's management interface
- **THEN** the connection is refused or dropped
