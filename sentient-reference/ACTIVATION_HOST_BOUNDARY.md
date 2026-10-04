# Reference activation host boundary

Learning validation does not establish activation authority. `authorizeActivation`
now requires a trusted in-process `verifyActivation` dependency. It receives
detached frozen principal, capability/version, authorization and candidate
evidence, first with stage `issue` and again with stage `consume`. The host must
resolve validation provenance, current principal scope, expiry, revocation and
replay policy. Missing, throwing, asynchronous or nonliteral outcomes deny.
Never construct this dependency from model output or request JSON.

Successful issuance produces a deeply frozen, process-local opaque receipt.
`activateCapability` accepts only a receipt recorded by that issuer, bound to
the shell principal, still verified by the host and not previously consumed.
Caller-created `activation_authorized` flags and serialized copies deny. A
restart therefore requires fresh host verification and issuance; a saved flag
cannot restore authority. Revocation is rechecked immediately before the local
capability-set effect. The reference shell remains a structural demonstration,
not a live authority, credential or executor service.

This is an intentional security compatibility change: old callers passing only
an allow object must migrate. `demo_candidate.mjs` uses an explicit synthetic
host fixture. That fixture is not a production proof verifier. Current tests
prove bounded library behavior without provisioning a live grant store.
