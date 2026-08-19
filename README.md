# OIAGP — Open Institutional Agent Governance Protocol

**Version:** 0.1.0-candidate

OIAGP is a vendor-neutral governance protocol for exchanging bounded authority, execution requests, evidence receipts, interruption signals, and revocations among agents, tools, gateways, and human approval systems.

OIAGP does not replace transport or tool protocols. It can govern work carried over HTTP/JSON, MCP, A2A, queues, event streams, or future adapters.

> An identity may request work; only verified, bounded, current authority may permit consequential execution.

## Core safety properties

1. Deny by default.
2. Never treat caller-supplied identity, tenant, role, approval, or authority as self-validating.
3. Bind authority to subject, issuer, tenant, capability, operations, resources, time, purpose, and delegation depth.
4. Make consequential execution interruptible and revocable.
5. Produce evidence receipts without treating receipts as authority.
6. Reject replay, cross-tenant use, expired authority, excessive delegation, and ambiguous version negotiation.
7. Preserve human authority for decisions designated as human-controlled.
8. Keep learned capability separate from authority to activate or execute it.

## What is included

- protocol specifications and terminology;
- JSON Schemas for OIAGP envelopes;
- deterministic reference evaluators;
- conformance requirements and executable tests;
- interoperability adapters for HTTP, MCP, and A2A translation;
- mutation-integrity and untrusted-execution reference profiles;
- a two-node synthetic institutional demonstration;
- a local-first Sentient reference-product candidate with Take Gate, governed learning, EvoSkill adapter, adversarial evaluation, and reproducible demo.

## Sentient reference-product principle

The reference product explores a simple rule for self-improving agents:

> An agent may learn and improve, but learned behavior does not automatically acquire authority.

A learning artifact remains non-authoritative until it passes validation and an explicit activation decision.

## Independence boundary

This repository contains the open interoperability contract and clean-room reference implementation only. It does not publish or depend on any private institutional platform, private agent registry, private prompts, tenant data, credentials, deployment configuration, or proprietary operational knowledge.

## Status and limitations

This repository is an open **candidate specification and reference implementation**. It is not a deployed production security control, certification, legal opinion, or representation that any implementation is safe for production use.

Conformance claims require execution of the applicable test profile. `Blocked` or unexecuted tests are not `Passed`.

## License

Repository content is provided under the Apache License 2.0 unless a file expressly states otherwise. Third-party projects remain governed by their own licenses and notices.
