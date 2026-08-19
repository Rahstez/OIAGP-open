import { createLocalPrincipal, createLocalAgentState, runTakeGate, activateCapability } from "./local_agent_shell.mjs";
import { createLearningCandidate, attachCapabilityArtifact, validateLearningCandidate, requestActivation, authorizeActivation } from "./controlled_learning.mjs";
import { runAdversarialEvaluation } from "./adversarial_evaluation.mjs";

function alignedReentry() {
  return {
    controlling_posture: { source_id: "repo:oiagp", version_or_digest: "sha256:demo", release_state: "active", verified: true },
    authority_state: { status: "current", grant_id: "grant-demo", checked_at: "2026-08-19T12:00:00Z" },
    source_state: { controlled_sources_available: true, source_priority_enforced: true, contradiction_state: "none" },
  };
}

const principal = createLocalPrincipal({ principal_id: "user-demo", device_id: "device-demo" });
const agent = createLocalAgentState({ principal, model_adapter: { id: "local-model-demo" } });
const takeGate = runTakeGate(agent, alignedReentry());

const candidate = createLearningCandidate({
  trajectory: { task_id: "task-demo", request_id: "request-demo", steps: ["observe", "draft", "review"] },
  feedback: { accepted: true },
  task_class: "bounded-drafting",
  capability_id: "skill.demo.drafting",
  version: "0.1.0",
});

attachCapabilityArtifact(candidate, {
  instructions: "Draft only within the authorized resource and operation boundary.",
  required_tools: ["text-editor"],
  authority_requirements: ["assist.prepare:draft"],
  tests: ["bounded-output", "no-publish"],
  known_failure_modes: ["publish", "cross-tenant-write"],
});

validateLearningCandidate(candidate, {
  tests_passed: true,
  adversarial_checks_passed: true,
  authority_boundary_preserved: true,
  no_prohibited_action_observed: true,
});
requestActivation(candidate);
const capability = authorizeActivation(candidate, {
  decision: "allow",
  capability_id: "skill.demo.drafting",
  version: "0.1.0",
  principal_id: "user-demo",
  authority_ref: "grant-demo",
});
activateCapability(agent, capability);

const baseAuthority = {
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
    nonce: "nonce-000000000001",
  },
};

const wrongTenant = structuredClone(baseAuthority);
wrongTenant.request.tenant_id = "tenant-b";
const driftReentry = alignedReentry();
driftReentry.source_state.contradiction_state = "unresolved";

const comparison = runAdversarialEvaluation([
  { id: "wrong-tenant", authority_input: wrongTenant, reentry_input: alignedReentry() },
  { id: "drift", authority_input: structuredClone(baseAuthority), reentry_input: driftReentry },
  { id: "learned-skill-unactivated", authority_input: structuredClone(baseAuthority), reentry_input: alignedReentry(), learning_candidate: { validation_status: "passed", activation_authorized: false } },
]);

console.log(JSON.stringify({
  product: "Sentient Reference Product Candidate",
  take_gate: takeGate.decision,
  learned_capability: { id: capability.id, version: capability.version, active: agent.active_capabilities.has(`${capability.id}@${capability.version}`) },
  adversarial_comparison: comparison,
  claim_boundary: "candidate demonstration only; not production certification",
}, null, 2));
