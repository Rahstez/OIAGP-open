# OIAGP Terminology

| Term | Definition |
|---|---|
| Authority | Verified permission bounded by subject, institution/tenant, capability, operation, resource, time, purpose, approval, and delegation limits. |
| Authority Grant | Portable assertion of bounded authority; never self-validating. |
| Capability | A declared class of operations an implementation can perform. Discovery does not confer authority. |
| Decision | `allow`, `deny`, `challenge`, or `defer` result produced by a trusted evaluator. |
| Delegation | Creation of a narrower descendant grant from a valid source grant. |
| Evidence Receipt | Integrity-protected record binding a request, decision, executor, outcome, and effect classification. It grants no authority. |
| Executor | Component that performs an authorized operation and enforces limits at execution time. |
| Gateway | Trusted enforcement point for authentication, validation, authorization, routing, replay control, and evidence. |
| Institution | Governing organization or domain that issues or recognizes authority. |
| Interruption | Authorized request to stop or contain ongoing work. |
| Principal | Human, service, agent, workload, or institution represented by an authenticated identity. |
| Protected Reference | Authorized opaque reference to content that should not be embedded in protocol messages. |
| Resource | Tenant-bound object or collection upon which an operation may act. |
| Revocation | Authoritative invalidation of a grant, identity binding, key, session, capability, or delegation chain. |
| Task Request | Governed request to perform one capability operation against bounded resources. |
| Tenant | Isolated institutional or organizational security domain. |

## Distinctions

- Authentication proves or establishes an identity; authorization permits an operation.
- Capability says what a component can do; authority says what it may do now.
- Approval is evidence used by an evaluator; it is not a caller-selected boolean.
- A receipt proves a recorded outcome; it cannot be replayed as permission.
- Transport security protects a channel; it does not establish institutional authority.
