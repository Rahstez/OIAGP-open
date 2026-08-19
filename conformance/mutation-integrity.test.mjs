import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMutation, verifyMutationReceipt, sha256, MutationError } from "../reference/mutation_integrity.mjs";

function baseMutation() {
  const payload = { op: "set_status", value: "ready" };
  return {
    principal_id: "principal-a",
    tenant_id: "tenant-a",
    task_id: "task-a",
    request_id: "request-a",
    executing_agent_id: "agent-a",
    expected_agent_id: "agent-a",
    agent_identity_verified: true,
    key_revoked: false,
    policy_version: "policy-1",
    expected_policy_version: "policy-1",
    resource: { type: "record", id: "record-a" },
    payload,
    payload_hash: sha256(payload),
    replay_detected: false,
    authority_decision: { decision: "allow", grant_id: "grant-a", tenant_id: "tenant-a", resources: [{ type: "record", id: "record-a" }] },
  };
}

test("allows only a pre-effect mutation candidate with exact authority and bindings", () => {
  const result = evaluateMutation(baseMutation());
  assert.equal(result.decision, "allow");
  assert.equal(result.effect, "pre_effect_only");
});

const cases = [
  ["signature without authority", (i) => { i.authority_decision.decision = "deny"; i.agent_identity_verified = true; }, MutationError.AUTHORITY_DENIED],
  ["wrong agent identity", (i) => { i.executing_agent_id = "agent-b"; }, MutationError.AGENT_IDENTITY_MISMATCH],
  ["wrong tenant", (i) => { i.tenant_id = "tenant-b"; }, MutationError.TENANT_MISMATCH],
  ["wrong resource", (i) => { i.resource = { type: "record", id: "record-b" }; }, MutationError.RESOURCE_MISMATCH],
  ["policy mismatch", (i) => { i.policy_version = "policy-2"; }, MutationError.POLICY_MISMATCH],
  ["payload modified after authorization", (i) => { i.payload = { op: "set_status", value: "published" }; }, MutationError.PAYLOAD_HASH_MISMATCH],
  ["replay", (i) => { i.replay_detected = true; }, MutationError.REPLAY_DETECTED],
  ["revoked key", (i) => { i.key_revoked = true; }, MutationError.KEY_REVOKED],
];

for (const [name, mutate, expected] of cases) {
  test(`denies ${name}`, () => {
    const input = baseMutation(); mutate(input);
    const result = evaluateMutation(input);
    assert.equal(result.decision, "deny");
    assert.equal(result.error_code, expected);
  });
}

test("verifies receipt only when request/grant/agent/tenant and result hash remain bound", () => {
  const result = { status: "ready" };
  const receipt = { receipt_id: "receipt-a", request_id: "request-a", grant_id: "grant-a", agent_id: "agent-a", tenant_id: "tenant-a", result_hash: sha256(result), effect: "committed_effect" };
  const verified = verifyMutationReceipt({ receipt, receipt_signature_valid: true, key_revoked: false, expected_request_id: "request-a", expected_grant_id: "grant-a", expected_agent_id: "agent-a", expected_tenant_id: "tenant-a", result });
  assert.equal(verified.decision, "verified");
});

test("modified result hash fails receipt verification", () => {
  const receipt = { receipt_id: "receipt-a", request_id: "request-a", grant_id: "grant-a", agent_id: "agent-a", tenant_id: "tenant-a", result_hash: sha256({ status: "ready" }), effect: "committed_effect" };
  const checked = verifyMutationReceipt({ receipt, receipt_signature_valid: true, key_revoked: false, expected_request_id: "request-a", expected_grant_id: "grant-a", expected_agent_id: "agent-a", expected_tenant_id: "tenant-a", result: { status: "different" } });
  assert.equal(checked.error_code, MutationError.RESULT_HASH_MISMATCH);
});
