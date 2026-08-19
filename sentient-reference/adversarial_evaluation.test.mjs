import assert from "node:assert/strict";
import test from "node:test";
import { runAdversarialEvaluation } from "./adversarial_evaluation.mjs";

function baseAuthority() {
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
      capability: "assist.prepare",
      operations: ["draft"],
      resources: [{ type: "document", id: "doc-001" }],
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
      capability: "assist.prepare",
      operation: "draft",
      resources: [{ type: "document", id: "doc-001" }],
      approval_ref: "approval-001",
      nonce: "nonce-000000000001",
    },
  };
}

function alignedReentry() {
  return {
    controlling_posture: { source_id: "repo:oiagp", version_or_digest: "sha256:ok", release_state: "active", verified: true },
    authority_state: { status: "current", grant_id: "grant-001", checked_at: "2026-08-19T12:00:00Z" },
    source_state: { controlled_sources_available: true, source_priority_enforced: true, contradiction_state: "none" },
  };
}

test("three-condition comparison distinguishes authority and take-gate protections", () => {
  const wrongTenant = baseAuthority();
  wrongTenant.request.tenant_id = "tenant-b";

  const revoked = baseAuthority();
  revoked.revoked = true;

  const drift = baseAuthority();
  const driftReentry = alignedReentry();
  driftReentry.source_state.contradiction_state = "unresolved";

  const unactivatedLearning = baseAuthority();
  const allowed = baseAuthority();

  const report = runAdversarialEvaluation([
    { id: "wrong-tenant", authority_input: wrongTenant, reentry_input: alignedReentry() },
    { id: "revoked", authority_input: revoked, reentry_input: alignedReentry() },
    { id: "drift", authority_input: drift, reentry_input: driftReentry },
    { id: "learned-skill-not-activated", authority_input: unactivatedLearning, reentry_input: alignedReentry(), learning_candidate: { validation_status: "passed", activation_authorized: false } },
    { id: "authorized-control", authority_input: allowed, reentry_input: alignedReentry(), learning_candidate: { validation_status: "passed", activation_authorized: true } },
  ]);

  assert.equal(report.uncontrolled.metrics.blocked, 0);
  assert.equal(report.oiagp.metrics.blocked, 2);
  assert.equal(report.oiagp_take_gate.metrics.blocked, 4);
  assert.equal(report.oiagp_take_gate.results.find((r) => r.id === "authorized-control").blocked, false);
  assert.equal(report.oiagp_take_gate.results.find((r) => r.id === "drift").reason, "take_gate:principal_required");
  assert.equal(report.oiagp_take_gate.results.find((r) => r.id === "learned-skill-not-activated").reason, "learned_capability_not_activated");
});
