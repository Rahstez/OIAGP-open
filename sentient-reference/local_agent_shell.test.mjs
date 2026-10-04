import { authorizeActivation, LearningStatus } from "./controlled_learning.mjs";
function approvedCapability(verifyActivation = () => true) {
  return authorizeActivation({ status: LearningStatus.ACTIVATION_PENDING, capability_id: "skill.summarize", version: "1.0.0", artifact: {}, provenance: {} },
    { decision: "allow", principal_id: "user-001", capability_id: "skill.summarize", version: "1.0.0" }, { verifyActivation });
}
import assert from "node:assert/strict";
import test from "node:test";
import { LocalAgentState, activateCapability, changeModelAdapter, createLocalAgentState, createLocalPrincipal, revokeCapability, runTakeGate } from "./local_agent_shell.mjs";

function alignedReentry() {
  return {
    controlling_posture: { source_id: "repo:oiagp/posture", version_or_digest: "sha256:test", release_state: "active", verified: true },
    authority_state: { status: "current", grant_id: "grant-001", checked_at: "2026-08-19T00:00:00Z" },
    source_state: { controlled_sources_available: true, source_priority_enforced: true, contradiction_state: "none" },
  };
}

function shell() {
  const principal = createLocalPrincipal({ principal_id: "user-001", device_id: "device-001" });
  return createLocalAgentState({ principal, model_adapter: { id: "local-model-a" } });
}

test("local principal is user-rooted and does not require cloud", () => {
  const principal = createLocalPrincipal({ principal_id: "user-001", device_id: "device-001" });
  assert.equal(principal.authority_root, "local_user");
  assert.equal(principal.cloud_required, false);
});

test("agent starts requiring re-anchor", () => assert.equal(shell().status, LocalAgentState.REANCHOR_REQUIRED));

test("aligned Take Gate makes agent ready", () => {
  const state = shell(); const decision = runTakeGate(state, alignedReentry());
  assert.equal(decision.decision, "aligned"); assert.equal(state.status, LocalAgentState.READY);
});

test("contradictory authority requires principal", () => {
  const state = shell(); const input = alignedReentry(); input.authority_state.status = "contradictory"; runTakeGate(state, input);
  assert.equal(state.status, LocalAgentState.PRINCIPAL_REQUIRED);
});

test("revoked authority denies re-entry", () => {
  const state = shell(); const input = alignedReentry(); input.authority_state.status = "revoked"; runTakeGate(state, input);
  assert.equal(state.status, LocalAgentState.DENIED);
});

test("capability cannot activate before Take Gate", () => {
  assert.throws(() => activateCapability(shell(), { id: "skill.summarize", version: "1.0.0", validation_status: "passed", activation_authorized: true }), /take gate/);
});

test("validated capability still requires explicit activation authority", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  assert.throws(() => activateCapability(state, { id: "skill.summarize", version: "1.0.0", validation_status: "passed", activation_authorized: false }), /not authorized/);
});

test("approved capability activates after Take Gate", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  assert.equal(activateCapability(state, approvedCapability()), true);
  assert.equal(state.active_capabilities.has("skill.summarize@1.0.0"), true);
});

test("revocation removes active capability", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  activateCapability(state, approvedCapability());
  revokeCapability(state, "skill.summarize");
  assert.equal(state.active_capabilities.size, 0); assert.equal(state.revoked_capabilities.has("skill.summarize"), true);
});

test("model change forces Take Gate re-entry", () => {
  const state = shell(); runTakeGate(state, alignedReentry()); changeModelAdapter(state, { id: "remote-model-b" });
  assert.equal(state.status, LocalAgentState.REANCHOR_REQUIRED);
});


test("forged and serialized activated flags cannot enter the shell", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  assert.throws(() => activateCapability(state, { id: "skill.summarize", version: "1.0.0", validation_status: "passed", activation_authorized: true }), /authority unverified/);
  const approved = approvedCapability();
  assert.throws(() => activateCapability(state, structuredClone(approved)), /authority unverified/);
  assert.equal(state.active_capabilities.size, 0);
});

test("host revocation between issuance and final activation prevents effect", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  let revoked = false; const approved = approvedCapability(() => !revoked);
  revoked = true;
  assert.throws(() => activateCapability(state, approved), /authority unverified/);
  assert.equal(state.active_capabilities.size, 0);
});

test("a verified activation cannot cross principals or replay", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  const approved = approvedCapability();
  const other = shell(); other.principal = createLocalPrincipal({ principal_id: "other-user", device_id: "device-002" });
  runTakeGate(other, alignedReentry());
  assert.throws(() => activateCapability(other, approved), /authority unverified/);
  assert.equal(activateCapability(state, approved), true);
  assert.throws(() => activateCapability(state, approved), /authority unverified/);
});

test("host verifier reentry cannot consume the same receipt twice", () => {
  const state = shell(); runTakeGate(state, alignedReentry());
  let receipt;
  receipt = approvedCapability(request => {
    if (request.stage === "consume") assert.throws(() => activateCapability(state, receipt), /authority unverified/);
    return true;
  });
  assert.equal(activateCapability(state, receipt), true);
  assert.equal(state.evidence.filter(e => e.type === "capability_activated").length, 1);
});
