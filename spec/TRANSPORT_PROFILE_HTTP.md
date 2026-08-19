# OIAGP HTTP/JSON Transport Profile

## Binding

- HTTPS is REQUIRED for remote operation.
- TLS certificate validation is REQUIRED.
- JSON media type: `application/oiagp+json`.
- UTF-8 is REQUIRED.
- Request bodies MUST validate against the declared schema version before authorization.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/.well-known/oiagp` | Version and capability discovery |
| POST | `/v1/authority/evaluate` | Evaluate an authority grant and task |
| POST | `/v1/tasks` | Submit an authorized task |
| GET | `/v1/tasks/{request_id}` | Read bounded status |
| POST | `/v1/tasks/{request_id}/interruptions` | Request interruption |
| POST | `/v1/revocations` | Submit a revocation |
| GET | `/v1/receipts/{receipt_id}` | Retrieve an authorized receipt |

Endpoint paths are profile defaults and MAY be remapped through discovery.

## Authentication

Deployments SHOULD use OAuth 2.0 authorization-code flows with PKCE for interactive clients and sender-constrained, short-lived workload credentials for machine clients. Deprecated implicit and resource-owner-password flows MUST NOT be used. Tokens MUST be audience-restricted and minimally scoped.

## Headers

- `OIAGP-Version`: requested protocol version.
- `Idempotency-Key`: REQUIRED for retryable consequential POST operations.
- `Traceparent`: OPTIONAL distributed trace context; MUST NOT carry authority.
- `Digest`: RECOMMENDED for protected payload integrity.

Tenant, actor, approval, and role headers are advisory only unless produced and authenticated by a trusted gateway. Public callers MUST NOT be able to override verified context through headers.

## Status mapping

| HTTP | OIAGP meaning |
|---|---|
| 200 | Completed read or decision |
| 202 | Accepted, pending, or executing |
| 400 | Invalid envelope or schema |
| 401 | Authentication required or invalid |
| 403 | Authenticated but not authorized |
| 404 | Resource absent or deliberately concealed |
| 409 | Replay, idempotency conflict, or state conflict |
| 410 | Revoked or expired reference |
| 422 | Semantically invalid request |
| 429 | Governed rate limit |
| 503 | Policy, approval, or authority service unavailable; fail closed |

## Webhooks and callbacks

Callbacks MUST be pre-registered or independently authorized, signed, replay-protected, and bound to the originating request. A callback URL supplied in an untrusted task body MUST NOT be invoked without validation.

## Caching

Authorization decisions and receipts containing protected information MUST use restrictive cache controls. Cached authority MUST never outlive its grant, token, revocation-check interval, or policy version.
