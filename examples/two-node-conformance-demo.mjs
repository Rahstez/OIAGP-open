import assert from "node:assert/strict";
import { evaluateAuthority } from "../reference/authority_evaluator.mjs";
import { evaluateReentry } from "../reference/reentry_evaluator.mjs";

function grant({ id, tenant, subject, resource }) {
  return { grant_id: id, subject, tenant_id: tenant, capability: "records.read", operations: ["read"], resources: [{ type: "record", id: resource }], effective_at: "2026-08-19T00:00:00Z", expires_at: "2026-08-20T00:00:00Z", delegation: { allowed: false, remaining_depth: 0 } };
}

function request({ id, tenant, subject, grantId, resource }) {
  return { oiagp_version: "0.1.0", request_id: id, authority_grant_id: grantId, tenant_id: tenant, requester: subject, capability: "records.read", operation: "read", resources: [{ type: "record", id: resource }], nonce: `${id}-nonce-0000000000`, idempotency_key: `${id}-idem-0000000000` };
}

function input({ grant: g, request: r, tenant, subject, revoked = false }) {
  return { authenticated: true, policy_available: true, supported_major_version: "0", unknown_required_extension: false, grant_proof_valid: true, revoked, approval_valid: true, nonce_consumed: false, idempotency_conflict: false, caller_override_attempt: false, requested_delegation_depth: 0, verified_tenant_id: tenant, verified_subject_id: subject, now: "2026-08-19T12:00:00Z", grant: g, request: r };
}

const institutionA = { tenant: "institution-a", subject: "agent-a", resource: "a-001" };
const institutionB = { tenant: "institution-b", subject: "agent-b", resource: "b-001" };
const grantA = grant({ id: "grant-a", ...institutionA });
const grantB = grant({ id: "grant-b", ...institutionB });
const requestA = request({ id: "request-a", grantId: grantA.grant_id, ...institutionA });
const requestB = request({ id: "request-b", grantId: grantB.grant_id, ...institutionB });

const allowA = evaluateAuthority(input({ grant: grantA, request: requestA, tenant: institutionA.tenant, subject: institutionA.subject }));
const allowB = evaluateAuthority(input({ grant: grantB, request: requestB, tenant: institutionB.tenant, subject: institutionB.subject }));
assert.equal(allowA.decision, "allow"); assert.equal(allowB.decision, "allow");

const crossTenant = evaluateAuthority(input({ grant: grantA, request: requestB, tenant: institutionB.tenant, subject: institutionB.subject }));
assert.equal(crossTenant.decision, "deny"); assert.equal(crossTenant.error_code, "AUTHORITY_INVALID");

const revoked = evaluateAuthority(input({ grant: grantA, request: requestA, tenant: institutionA.tenant, subject: institutionA.subject, revoked: true }));
assert.equal(revoked.decision, "deny"); assert.equal(revoked.error_code, "AUTHORITY_REVOKED");

const reentryAligned = evaluateReentry({ controlling_posture: { source_id: "oiagp:public", version_or_digest: "demo", release_state: "active", verified: true }, authority_state: { status: "current", grant_id: grantA.grant_id, checked_at: "2026-08-19T12:00:00Z" }, source_state: { controlled_sources_available: true, source_priority_enforced: true, contradiction_state: "none" } });
assert.equal(reentryAligned.decision, "aligned");

const receipt = Object.freeze({ receipt_id: "receipt-a-001", request_id: requestA.request_id, decision: allowA.decision, tenant_id: allowA.tenant_id, subject_id: allowA.subject_id, grant_id: allowA.grant_id, outcome: "no_effect_demo" });
assert.equal(receipt.tenant_id, institutionA.tenant);

const receiptAsAuthority = evaluateAuthority({ ...input({ grant: null, request: requestA, tenant: institutionA.tenant, subject: institutionA.subject }), receipt_valid: true });
assert.equal(receiptAsAuthority.decision, "deny"); assert.equal(receiptAsAuthority.error_code, "AUTHORITY_MISSING");

console.log(JSON.stringify({ demo: "OIAGP-003-two-node", institution_a: allowA.decision, institution_b: allowB.decision, cross_tenant: crossTenant.decision, revocation: revoked.error_code, reentry: reentryAligned.decision, receipt_bound_to: receipt.request_id, receipt_as_authority: receiptAsAuthority.error_code }, null, 2));
