# OIAGP A2A Conformance Profile

**Status:** Candidate

This profile defines how A2A agent-to-agent interoperability is governed by OIAGP without making A2A a dependency of the OIAGP authority core.

## Architectural boundary

- MCP provides agent-to-tool/resource interoperability.
- A2A provides agent-to-agent interoperability.
- OIAGP provides principal-to-authority-to-agent governance.
- An institutional host may consume all three without treating transport metadata as authority.

## Mandatory invariants

1. **Agent Card capability advertisement is not an authority grant.** Agent Card fields are untrusted claims until independently validated against controlled registry state.
2. **A2A authentication is not OIAGP authorization.** Verified transport identity is an input to authorization, never its substitute.
3. **Authority is non-transitive by default.** Authority held by Agent A does not become authority held by Agent B because A delegates an A2A task.
4. **Downstream execution requires its own valid authority boundary.** The executing subject must match a valid grant or an explicitly authorized delegation chain that remains within delegation depth and scope.
5. **Tenant, capability, operation, resource, time, approval, replay, revocation, and delegation constraints fail closed.**
6. **Take Gate/re-entry remains separate from authorization.** Re-entry alignment may permit resumption of already-authorized work but creates no authority.
7. **Evidence receipts do not create future authority.** Successful A2A execution or prior receipts cannot self-authorize later work.
8. **Adapter isolation is required.** A2A version changes must be absorbed in a thin adapter/profile layer rather than contaminating the OIAGP authority evaluator.

## Candidate conformance cases

An OIAGP-A2A conforming implementation SHOULD demonstrate at minimum:

- authorized A2A delegation;
- unauthorized delegation denied;
- capability overclaim denied;
- expired authority denied;
- revoked authority denied;
- cross-tenant delegation denied;
- delegation-depth excess denied;
- agent substitution denied;
- unvalidated or mutated Agent Card denied;
- replayed task denied;
- remote-agent re-entry failure denied;
- evidence preserved across the A2A boundary;
- active delegation remains interruptible/revocable by the host authority system.

## Evidence rule

A passing profile demonstrates behavior only for the executed test profile. It is not a production security certification, endorsement by the A2A project, or proof of universal interoperability.
