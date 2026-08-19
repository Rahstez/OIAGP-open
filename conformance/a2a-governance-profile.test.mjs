import assert from "node:assert/strict";
import test from "node:test";
import { evaluateA2ADelegation, validateAgentCard, externalizeA2AEvidence } from "../reference/a2a_governance_profile.mjs";

const now = "2026-08-19T12:00:00Z";
const verifiedA = { tenant_id: "tenant-a", subject_id: "agent-a" };
const verifiedB = { tenant_id: "tenant-a", subject_id: "agent-b" };
const registry = { agent_id: "agent-b", version: "1", card_digest: "digest-b-v1", capabilities: ["content.prepare"] };
const card = { agent_id: "agent-b", version: "1", digest: "digest-b-v1", capabilities: ["content.prepare"] };

function task(overrides = {}) {
  return { id: "task-1", issued_at: now, capability: "content.prepare", operation: "draft", resources: [{ type: "project", id: "project-1" }], nonce: "nonce-a2a-0001", input: { text: "hello" }, ...overrides };
}

function grant(subject = "agent-a", overrides = {}) {
  return { grant_id: `grant-${subject}`, tenant_id: "tenant-a", subject, capability: "content.prepare", operations: ["draft"], resources: [{ type: "project", id: "project-1" }], effective_at: "2026-08-19T11:00:00Z", expires_at: "2026-08-19T13:00:00Z", delegation: { allowed: true, remaining_depth: 1 }, ...overrides };
}

function context(overrides = {}) {
  return { authenticated: true, policy_available: true, grant_proof_valid: true, revoked: false, now, nonce_consumed: false, idempotency_conflict: false, ...overrides };
}

test("validated Agent Card is accepted as capability metadata, not authority", () => {
  const out = validateAgentCard({ agentCard: card, registryRecord: registry });
  assert.equal(out.decision, "allow");
  assert.deepEqual(out.validated_capabilities, ["content.prepare"]);
});

test("mutated Agent Card fails closed", () => {
  const out = validateAgentCard({ agentCard: { ...card, digest: "attacker" }, registryRecord: registry });
  assert.equal(out.error_code, "AGENT_CARD_MUTATED");
});

test("agent substitution fails closed", () => {
  const out = validateAgentCard({ agentCard: { ...card, agent_id: "agent-x" }, registryRecord: registry });
  assert.equal(out.error_code, "AGENT_SUBSTITUTION");
});

test("capability overclaim fails closed", () => {
  const out = validateAgentCard({ agentCard: { ...card, capabilities: ["content.prepare", "admin.root"] }, registryRecord: registry });
  assert.equal(out.error_code, "CAPABILITY_OVERCLAIM");
});

test("authorized A2A delegation within depth is allowed", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedA, grant: grant("agent-a"), agentCard: card, registryRecord: registry, requested_delegation_depth: 1, authorityContext: context() });
  assert.equal(out.decision, "allow");
});

test("authority is non-transitive: Agent B cannot execute under Agent A grant", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedB, grant: grant("agent-a"), agentCard: card, registryRecord: registry, authorityContext: context() });
  assert.equal(out.error_code, "SUBJECT_MISMATCH");
});

test("Agent B may execute only with an explicit grant to Agent B", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedB, grant: grant("agent-b"), agentCard: card, registryRecord: registry, authorityContext: context() });
  assert.equal(out.decision, "allow");
});

test("cross-tenant delegation is denied", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: { tenant_id: "tenant-b", subject_id: "agent-a" }, grant: grant("agent-a"), agentCard: card, registryRecord: registry, authorityContext: context() });
  assert.equal(out.error_code, "TENANT_MISMATCH");
});

test("revoked delegation is denied", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedA, grant: grant("agent-a"), agentCard: card, registryRecord: registry, authorityContext: context({ revoked: true }) });
  assert.equal(out.error_code, "AUTHORITY_REVOKED");
});

test("expired delegation is denied", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedA, grant: grant("agent-a", { expires_at: "2026-08-19T11:30:00Z" }), agentCard: card, registryRecord: registry, authorityContext: context() });
  assert.equal(out.error_code, "AUTHORITY_EXPIRED");
});

test("delegation depth excess is denied", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedA, grant: grant("agent-a"), agentCard: card, registryRecord: registry, requested_delegation_depth: 2, authorityContext: context() });
  assert.equal(out.error_code, "DELEGATION_EXCEEDED");
});

test("replayed A2A task is denied", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedA, grant: grant("agent-a"), agentCard: card, registryRecord: registry, authorityContext: context({ nonce_consumed: true }) });
  assert.equal(out.error_code, "REPLAY_DETECTED");
});

test("failed Take Gate re-entry blocks remote-agent continuation", () => {
  const out = evaluateA2ADelegation({ task: task(), verified: verifiedA, grant: grant("agent-a"), agentCard: card, registryRecord: registry, reentry_required: true, reentry_decision: { decision: "fail_closed" }, authorityContext: context() });
  assert.equal(out.error_code, "TAKE_GATE_REQUIRED");
});

test("A2A evidence never creates authority", () => {
  const out = externalizeA2AEvidence({ status: "ok" }, { receipt_id: "receipt-1" });
  assert.equal(out.authority_created, false);
  assert.equal(out.receipt.transport_profile, "a2a");
  assert.equal(out.receipt.authority_created, false);
});
