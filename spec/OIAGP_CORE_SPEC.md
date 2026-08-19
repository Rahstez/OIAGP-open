# OIAGP Core Specification

**Version:** 0.1.0-candidate
**Normative language:** MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL are interpreted as described by BCP 14 when written in uppercase.

## 1. Scope

OIAGP standardizes institutional governance envelopes for agentic work. It defines discovery, authority presentation, task requests, decisions, results, evidence receipts, interruption, revocation, error handling, and version negotiation. Business logic and transport-specific execution remain outside the core.

## 2. Roles

- **Issuer:** asserts bounded authority.
- **Subject:** identity to which authority is granted.
- **Requester:** submits a task request.
- **Gateway:** authenticates, validates, authorizes, routes, and records requests.
- **Approver:** human or governed system permitted to decide a designated request.
- **Executor:** performs an authorized operation.
- **Evidence service:** issues or stores receipts.
- **Revocation authority:** suspends or terminates authority.
- **Auditor:** evaluates evidence without receiving execution authority.

One component may hold multiple roles, but each role and authority source MUST remain explicit.

## 3. Identifiers and time

- Identifiers MUST be globally unique within their security domain and MUST NOT embed secrets.
- Timestamps MUST use RFC 3339 UTC form.
- Implementations MUST define maximum accepted clock skew.
- A request MUST include a unique `request_id`; consequential requests MUST include a single-use `nonce` or equivalent replay control.

## 4. Authority grant

An authority grant MUST bind:

- issuer and subject;
- tenant or governed domain;
- capability and allowed operations;
- resource constraints;
- purpose and data classification where applicable;
- effective and expiration times;
- delegation depth and delegation rules;
- required approval class;
- revocation reference;
- cryptographic proof or a protected reference to verified proof.

Possession of an identity credential alone MUST NOT imply operational authority. A gateway MUST reject grants that are expired, premature, revoked, suspended, unverifiable, outside the requested tenant, broader than the issuer can delegate, or ambiguous.

## 5. Capability declaration

Executors MAY publish capability declarations. A declaration describes supported operations, input/output media types, side-effect class, data classifications, required approval class, interruption support, and protocol versions. A declaration is descriptive and MUST NOT be treated as authority.

## 6. Task request

A task request MUST contain:

- envelope and protocol versions;
- request, correlation, and tenant identifiers;
- authenticated requester reference;
- requested capability and operation;
- resource and data-scope constraints;
- input payload or protected payload reference;
- authority reference or embedded grant;
- requested deadline and idempotency key when applicable;
- evidence and interruption requirements.

The executor MUST use server-verified identity and authority context. Caller-supplied actor, owner, tenant, role, or approval values MUST NOT override verified context.

## 7. Authorization decision

The decision is one of `allow`, `deny`, `challenge`, or `defer`.

- `allow` MUST state the exact authorized operation, resources, limits, expiration, approval evidence, and decision identifier.
- `deny` SHOULD provide a stable reason code without leaking protected policy.
- `challenge` requests additional proof or human approval and MUST NOT authorize execution.
- `defer` indicates that a decision is pending and MUST include a bounded status reference.

Silence, timeout, parser failure, unavailable policy, missing configuration, or inconsistent evidence MUST resolve to deny.

## 8. Execution lifecycle

The normative lifecycle is:

`received -> validating -> awaiting_authority|authorized -> executing -> succeeded|failed|interrupted|indeterminate`

Only `authorized` may transition to `executing`. Terminal states MUST NOT transition to another terminal state except through an explicit reconciliation record that preserves the prior state.

Consequential execution MUST:

- enforce the authorization decision again at execution time;
- reject stale or already-consumed authority;
- respect idempotency and replay controls;
- remain within the resource and data boundary;
- produce durable pre-effect evidence where an effect cannot be safely reconstructed;
- expose an interruption mechanism when the underlying operation is interruptible;
- classify outcomes as no-effect, committed-effect, or indeterminate when relevant.

## 9. Evidence receipt

A receipt MUST bind the request, authorization decision, executor, tenant, operation, timestamps, outcome, effect classification, and integrity proof. It SHOULD contain hashes or protected references instead of sensitive payloads. A receipt MUST NOT itself confer authority.

Receipts SHOULD support canonical serialization, cryptographic signatures or MACs, key identifiers, algorithm agility, and verification status. Implementations MUST reject unsupported or deprecated algorithms.

## 10. Interruption

An interruption signal MUST identify the target request or execution, issuer, reason code, issued time, scope, and proof. Executors MUST authenticate and authorize the interrupter. A valid interruption MUST be acknowledged promptly and yield one of:

- `interrupted_no_effect`;
- `interrupted_partial_effect`;
- `unable_to_interrupt`;
- `already_terminal`.

The executor MUST preserve evidence of the signal and response.

## 11. Revocation

Revocation may target a grant, subject, capability, tenant binding, key, session, or delegation chain. Gateways MUST check revocation at initial authorization and again before consequential execution. Long-running work SHOULD re-check at policy-defined intervals.

Revocation MUST NOT erase historical evidence. A revoked grant MUST be unusable for new execution even if a cached token remains cryptographically valid.

## 12. Delegation

Delegated authority MUST be narrower than its source. Each delegation MUST reduce or preserve—never expand—tenant scope, operations, resources, duration, data classification, approval class, and delegation depth. Cycles and ambiguous parentage MUST be rejected.

## 13. Multi-tenancy

Tenant identity MUST be derived from authenticated, server-verified context or a governed workload-resolution step. A requester MUST NOT select an arbitrary tenant by payload. Every authorization, execution, receipt, revocation, and audit event MUST bind the tenant.

Cross-tenant access MUST be denied unless an explicit, independently authorized multi-tenant grant names every permitted domain and operation.

## 14. Data handling

Payloads MUST be classified before execution when classification affects routing, storage, or model/tool access. Implementations SHOULD minimize data, use protected references for large or sensitive content, and specify retention. Logs and errors MUST NOT expose secrets or protected payloads.

## 15. Error model

Errors use stable codes, including:

- `AUTHENTICATION_REQUIRED`
- `AUTHORITY_MISSING`
- `AUTHORITY_INVALID`
- `AUTHORITY_EXPIRED`
- `AUTHORITY_REVOKED`
- `TENANT_MISMATCH`
- `CAPABILITY_UNAVAILABLE`
- `OPERATION_NOT_ALLOWED`
- `APPROVAL_REQUIRED`
- `REPLAY_DETECTED`
- `RESOURCE_OUT_OF_SCOPE`
- `INTERRUPTION_REJECTED`
- `VERSION_UNSUPPORTED`
- `POLICY_UNAVAILABLE`
- `OUTCOME_INDETERMINATE`

Errors MUST include a correlation identifier and MUST NOT disclose internal policy or credentials.

## 16. Version negotiation

Implementations MUST declare supported major/minor versions. A major mismatch MUST fail closed. Minor versions MAY interoperate only when every required field and semantic is understood. Unknown required extensions MUST cause rejection; unknown optional extensions MAY be ignored while preserved for forwarding only when safe.

## 17. Extensions

Extensions MUST be namespaced, declare whether they are required, identify their schema, and avoid changing core semantics. An extension MUST NOT weaken a core MUST or convert a denial into authorization.

## 18. Transport independence

The same governance semantics apply across HTTP, MCP, A2A, queues, and event streams. Transport authentication is necessary but not sufficient. Adapters MUST preserve request identifiers, tenant binding, authority, interruption, and receipts without semantic loss.

## 19. Conformance

An implementation may claim conformance only for a named profile and protocol version after passing all mandatory positive and negative tests. Self-attestation MUST state test-suite version, implementation version, date, deviations, and unresolved findings.
