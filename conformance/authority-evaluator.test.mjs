import assert from "node:assert/strict";
import test from "node:test";
import { AuthorityError, evaluateAuthority } from "../reference/authority_evaluator.mjs";

function baseInput() {
  return {
    authenticated: true,
    policy_available: true,
    supported_major_version: "0",
    unknown_required_extension: false,
    grant_proof_valid: true,
    revoked: false,
    approval_valid: true,
    nonce_consumed: false,
    idempotency_conflict: false,
    caller_override_attempt: false,
    requested_delegation_depth: 0,
    verified_tenant_id: "tenant-a",
    verified_subject_id: "agent-a",
    now: "2026-08-19T12:00:00Z",
    grant: {
      grant_id: "grant-001",
      subject: "agent-a",
      tenant_id: "tenant-a",
      capability: "content.prepare",
      operations: ["draft"],
      resources: [{ type: "project", id: "project-001" }],
      effective_at: "2026-08-19T00:00:00Z",
      expires_at: "2026-08-20T00:00:00Z",
      approval_class: "human",
      delegation: { allowed: false, remaining_depth: 0 },
    },
    request: {
      oiagp_version: "0.1.0",
      authority_grant_id: "grant-001",
      tenant_id: "tenant-a",
      requester: "agent-a",
      capability: "content.prepare",
      operation: "draft",
      resources: [{ type: "project", id: "project-001" }],
      approval_ref: "approval-001",
      nonce: "nonce-000000000001",
      idempotency_key: "idempotency-0000001",
    },
  };
}

const cases = [
  ["missing authentication", (i) => { i.authenticated = false; }, AuthorityError.AUTHENTICATION_REQUIRED],
  ["missing authority", (i) => { i.grant = null; }, AuthorityError.AUTHORITY_MISSING],
  ["expired authority", (i) => { i.now = "2026-08-21T00:00:00Z"; }, AuthorityError.AUTHORITY_EXPIRED],
  ["premature authority", (i) => { i.now = "2026-08-18T00:00:00Z"; }, AuthorityError.AUTHORITY_PREMATURE],
  ["revoked authority", (i) => { i.revoked = true; }, AuthorityError.AUTHORITY_REVOKED],
  ["wrong tenant", (i) => { i.request.tenant_id = "tenant-b"; }, AuthorityError.TENANT_MISMATCH],
  ["wrong subject", (i) => { i.request.requester = "agent-b"; }, AuthorityError.SUBJECT_MISMATCH],
  ["missing capability", (i) => { i.request.capability = ""; }, AuthorityError.CAPABILITY_MISMATCH],
  ["operation outside grant", (i) => { i.request.operation = "publish"; }, AuthorityError.OPERATION_NOT_ALLOWED],
  ["resource outside grant", (i) => { i.request.resources = [{ type: "project", id: "project-999" }]; }, AuthorityError.RESOURCE_OUT_OF_SCOPE],
  ["excessive delegation", (i) => { i.requested_delegation_depth = 1; }, AuthorityError.DELEGATION_EXCEEDED],
  ["missing approval", (i) => { i.approval_valid = false; }, AuthorityError.APPROVAL_REQUIRED],
  ["nonce replay", (i) => { i.nonce_consumed = true; }, AuthorityError.REPLAY_DETECTED],
  ["idempotency conflict", (i) => { i.idempotency_conflict = true; }, AuthorityError.IDEMPOTENCY_CONFLICT],
  ["unsupported major version", (i) => { i.request.oiagp_version = "1.0.0"; }, AuthorityError.VERSION_UNSUPPORTED],
  ["unknown required extension", (i) => { i.unknown_required_extension = true; }, AuthorityError.VERSION_UNSUPPORTED],
  ["policy unavailable", (i) => { i.policy_available = false; }, AuthorityError.POLICY_UNAVAILABLE],
  ["caller supplied tenant/role override", (i) => { i.caller_override_attempt = true; }, AuthorityError.CALLER_OVERRIDE_REJECTED],
];

test("allows exact bounded request", () => {
  assert.equal(evaluateAuthority(baseInput()).decision, "allow");
});

for (const [name, mutate, expected] of cases) {
  test(`denies ${name}`, () => {
    const input = baseInput();
    mutate(input);
    const result = evaluateAuthority(input);
    assert.equal(result.decision, "deny");
    assert.equal(result.error_code, expected);
  });
}

test("receipt or signature state cannot substitute for authority", () => {
  const input = baseInput();
  input.grant = null;
  input.receipt_valid = true;
  input.signature_valid = true;
  assert.equal(evaluateAuthority(input).error_code, AuthorityError.AUTHORITY_MISSING);
});
