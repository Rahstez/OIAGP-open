# Sentient Reference Product Demo

This demo is a candidate reference demonstration, not a production security certification.

## Run

Requires Node.js 22 or later.

```bash
node --test conformance/*.test.mjs
node --test sentient-reference/*.test.mjs
node examples/two-node-conformance-demo.mjs
node sentient-reference/demo_candidate.mjs
```

## What the demo shows

1. A local user is the personal agent's authority root.
2. The Take Gate verifies posture, authority state, and controlled-source state before continuation.
3. A learning trajectory may produce a reusable capability candidate.
4. Validation does not activate the capability.
5. Exact principal authorization is required before activation.
6. Revocation removes active capability.
7. A model change forces re-entry.
8. Cross-tenant authority misuse is denied.
9. Drift/contradiction can require the principal even when the underlying task grant would otherwise allow the operation.
10. A validated but unactivated learned skill is blocked.

## Adversarial comparison

The executable evaluation compares:

- an uncontrolled agent path;
- the same cases under OIAGP authority enforcement;
- the same cases under OIAGP + Take Gate + governed learning.

The evaluation includes an authorized control case so the desired outcome is not simply to block all actions.

## Core proposition

> An agent may learn and improve, but learned behavior does not automatically acquire authority.
