import assert from "node:assert/strict";
import test from "node:test";
import { ReentryDecision, evaluateReentry, mayResumeAuthorizedWork } from "../reference/reentry_evaluator.mjs";

function baseInput() {
  return {
    controlling_posture: { source_id: "repo:example/posture", version_or_digest: "sha256:example", release_state: "active", verified: true },
    authority_state: { status: "current", grant_id: "grant-001", checked_at: "2026-08-19T00:00:00Z" },
    source_state: { controlled_sources_available: true, source_priority_enforced: true, contradiction_state: "none" },
  };
}

test("aligned re-entry resumes authorized work without redundant prompt", () => {
  const decision = evaluateReentry(baseInput());
  assert.equal(decision.decision, ReentryDecision.ALIGNED);
  assert.equal(decision.resume_authorized_work_without_redundant_prompt, true);
  assert.equal(mayResumeAuthorizedWork(baseInput()), true);
});

test("missing verified posture fails closed", () => {
  const input = baseInput(); input.controlling_posture.verified = false;
  const decision = evaluateReentry(input);
  assert.equal(decision.decision, ReentryDecision.FAIL_CLOSED);
  assert.deepEqual(decision.reason_codes, ["posture_unverified"]);
});

test("released posture cannot be silently treated as active", () => {
  const input = baseInput(); input.controlling_posture.release_state = "released";
  assert.equal(evaluateReentry(input).decision, ReentryDecision.FAIL_CLOSED);
});

test("revoked authority fails closed", () => {
  const input = baseInput(); input.authority_state.status = "revoked";
  assert.equal(evaluateReentry(input).decision, ReentryDecision.FAIL_CLOSED);
});

test("contradictory authority requires principal", () => {
  const input = baseInput(); input.authority_state.status = "contradictory";
  assert.equal(evaluateReentry(input).decision, ReentryDecision.PRINCIPAL_REQUIRED);
});

test("controlled source priority must be enforced", () => {
  const input = baseInput(); input.source_state.source_priority_enforced = false;
  assert.equal(evaluateReentry(input).decision, ReentryDecision.FAIL_CLOSED);
});

test("unresolved controlled source contradiction requires principal", () => {
  const input = baseInput(); input.source_state.contradiction_state = "unresolved";
  assert.equal(evaluateReentry(input).decision, ReentryDecision.PRINCIPAL_REQUIRED);
});

test("re-entry does not revive missing authority", () => {
  const input = baseInput(); input.authority_state.status = "missing";
  const decision = evaluateReentry(input);
  assert.equal(decision.decision, ReentryDecision.FAIL_CLOSED);
  assert.equal(mayResumeAuthorizedWork(input), false);
});
