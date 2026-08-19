import assert from "node:assert/strict";
import test from "node:test";
import { LearningStatus, attachCapabilityArtifact, authorizeActivation, createLearningCandidate, requestActivation, validateLearningCandidate } from "./controlled_learning.mjs";

function candidate() {
  const c = createLearningCandidate({ trajectory: { task_id: "task-1", request_id: "req-1", steps: ["observe", "act"], evidence_refs: ["rcpt-1"] }, feedback: { score: 1 }, task_class: "personal.assist", capability_id: "skill-summarize" });
  attachCapabilityArtifact(c, { instructions: "summarize bounded local text", required_tools: [], data_requirements: ["local-text"], authority_requirements: ["read-local-text"], tests: ["summary-preserves-source-boundary"] });
  return c;
}

test("learning candidate starts non-authoritative", () => {
  const c = candidate();
  assert.equal(c.status, LearningStatus.CANDIDATE);
  assert.equal(c.activation_authorized, false);
});

test("validated learning still requires activation authority", () => {
  const c = candidate();
  validateLearningCandidate(c, { tests_passed: true, adversarial_checks_passed: true, authority_boundary_preserved: true });
  assert.equal(c.status, LearningStatus.VALIDATED);
  requestActivation(c);
  assert.equal(c.status, LearningStatus.ACTIVATION_PENDING);
  assert.equal(c.activation_authorized, false);
});

test("failed evaluation rejects candidate", () => {
  const c = candidate();
  const status = validateLearningCandidate(c, { tests_passed: true, adversarial_checks_passed: false, authority_boundary_preserved: true });
  assert.equal(status, LearningStatus.REJECTED);
  assert.throws(() => requestActivation(c));
});

test("principal authorization activates exact version only", () => {
  const c = candidate();
  validateLearningCandidate(c, { tests_passed: true, adversarial_checks_passed: true, authority_boundary_preserved: true });
  requestActivation(c);
  assert.throws(() => authorizeActivation(c, { decision: "allow", principal_id: "user-1", capability_id: "skill-summarize", version: "9.9.9" }));
  const active = authorizeActivation(c, { decision: "allow", principal_id: "user-1", capability_id: "skill-summarize", version: "0.1.0" });
  assert.equal(c.status, LearningStatus.ACTIVE);
  assert.equal(active.activation_authorized, true);
});
