# OIAGP Conformance Requirements

## Profiles

- **Requester:** creates valid governed task requests.
- **Gateway:** authenticates, validates, authorizes, routes, and denies safely.
- **Executor:** enforces decisions, executes within scope, interrupts, and issues results.
- **Evidence Service:** creates and verifies receipts.
- **Full Node:** implements Gateway, Executor, and Evidence Service requirements.

## Universal requirements

Every profile MUST:

- declare supported OIAGP versions and extensions;
- validate required schemas and reject unknown required extensions;
- preserve identifiers and tenant binding;
- reject expired, revoked, malformed, or mismatched authority;
- avoid secret disclosure in errors and logs;
- identify its conformance-test suite and implementation version.

## Gateway mandatory negative tests

1. Missing authentication.
2. Missing authority.
3. Expired authority.
4. Premature authority.
5. Revoked authority.
6. Wrong tenant.
7. Wrong subject.
8. Missing capability.
9. Operation not in grant.
10. Resource outside scope.
11. Excessive delegation depth.
12. Forged or unverified approval.
13. Replay of nonce.
14. Conflicting idempotency key.
15. Unsupported major version.
16. Unknown required extension.
17. Policy service unavailable.
18. Caller-supplied tenant or role override.

Every case MUST deny without consequential effect.

## Executor mandatory tests

- Reject a task without an `allow` decision.
- Re-evaluate expiration and revocation before effect.
- Enforce resource and data limits.
- Return identical result or safe conflict for idempotent replay.
- Accept an authorized interruption.
- Reject an unauthorized interruption.
- Distinguish no-effect, committed-effect, and indeterminate outcomes.
- Produce a receipt bound to the request and decision.

## Evidence mandatory tests

- Valid receipt verifies.
- Modified request ID fails verification.
- Modified tenant fails verification.
- Modified outcome fails verification.
- Unknown or revoked key fails verification.
- Receipt cannot be used as authority.
- Protected payload is absent from the minimal receipt.

## Cross-tenant matrix

At least two tenants and two subjects MUST be used. Tests MUST prove that every tenant-scoped read, write, task, status, interruption, revocation, and receipt retrieval rejects the other tenant unless an explicit multi-tenant grant exists.

## Re-entry / posture continuity mandatory tests

A conforming governed agent or Full Node implementing persistent posture MUST produce or validate a `reentry_attestation` at every configured re-entry trigger before consequential progression.

Mandatory tests:

1. New governed conversation with verified active posture produces `aligned` when applicable authority is current.
2. Session restart revalidates the controlling posture rather than relying only on conversational memory.
3. Model handoff revalidates posture and current authority before consequential work resumes.
4. Context reconstruction with a missing or unverifiable controlling posture produces `fail_closed`.
5. Material domain transition causes re-entry evaluation when the transition changes evidence, authority, disclosure, tenant, or resource boundaries.
6. A released, superseded, or unknown posture cannot be silently treated as active.
7. Expired, revoked, missing, or contradictory authority cannot produce `aligned` for consequential work that requires authority.
8. When controlled source evidence is available, factual attribution and provenance use the controlled source rather than conflicting conversational recollection.
9. An unresolved source contradiction prevents promotion of the disputed claim to a verified fact and produces either `fail_closed` or `principal_required` where consequential progression depends on it.
10. Re-entry alignment does not create, extend, revive, or transfer authority.
11. Re-entry alignment does not suppress an otherwise required interruption, approval, independent supervisory gate, or other stricter downstream control.
12. Once posture and bounded authority are successfully revalidated, already-authorized work resumes without requiring a redundant conversational `continue` or `proceed` prompt.

Every re-entry test MUST preserve the trigger, controlling-posture identifier/version or digest, authority status, source-state status, decision, reason codes, and proof needed to reproduce the decision.

## Results

A conformance report records:

- implementation and build identifier;
- profile and protocol version;
- test-suite version and hashes;
- environment and transport;
- pass/fail/blocked for every mandatory test;
- deviations and waivers;
- reviewer and date.

No implementation may claim conformance with a failed or unexecuted mandatory test. `Blocked` is not `Passed`.

## Levels

- **Core:** schema, version, authority, denial, and receipt requirements.
- **Institutional:** Core plus tenant isolation, approval, delegation, revocation, and audit evidence.
- **Consequential:** Institutional plus interruption, idempotency, effect classification, and reconciliation.

The v0.1 release should publish Core and Institutional test definitions. Consequential certification remains experimental until multiple independent implementations validate the model.
