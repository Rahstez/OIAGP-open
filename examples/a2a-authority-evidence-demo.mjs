import { evaluateA2ADelegation, externalizeA2AEvidence } from "../reference/a2a_governance_profile.mjs";

const now = "2026-08-19T12:00:00Z";
const card = { agent_id: "agent-b", version: "1", digest: "digest-b-v1", capabilities: ["content.prepare"] };
const registryRecord = { agent_id: "agent-b", version: "1", card_digest: "digest-b-v1", capabilities: ["content.prepare"] };
const task = { id: "task-demo-1", issued_at: now, capability: "content.prepare", operation: "draft", resources: [{ type: "project", id: "project-1" }], nonce: "nonce-demo-a2a-1", input: { text: "synthetic demo" } };

const grantA = { grant_id: "grant-agent-a", tenant_id: "tenant-a", subject: "agent-a", capability: "content.prepare", operations: ["draft"], resources: [{ type: "project", id: "project-1" }], effective_at: "2026-08-19T11:00:00Z", expires_at: "2026-08-19T13:00:00Z", delegation: { allowed: true, remaining_depth: 1 } };
const grantB = { ...grantA, grant_id: "grant-agent-b", subject: "agent-b", delegation: { allowed: false, remaining_depth: 0 } };
const authorityContext = { authenticated: true, policy_available: true, grant_proof_valid: true, revoked: false, now, nonce_consumed: false, idempotency_conflict: false };

const delegation = evaluateA2ADelegation({ task, verified: { tenant_id: "tenant-a", subject_id: "agent-a" }, grant: grantA, agentCard: card, registryRecord, requested_delegation_depth: 1, authorityContext });
const inheritedExecution = evaluateA2ADelegation({ task: { ...task, id: "task-demo-2", nonce: "nonce-demo-a2a-2" }, verified: { tenant_id: "tenant-a", subject_id: "agent-b" }, grant: grantA, agentCard: card, registryRecord, authorityContext });
const explicitExecution = evaluateA2ADelegation({ task: { ...task, id: "task-demo-3", nonce: "nonce-demo-a2a-3" }, verified: { tenant_id: "tenant-a", subject_id: "agent-b" }, grant: grantB, agentCard: card, registryRecord, authorityContext });
const revoked = evaluateA2ADelegation({ task: { ...task, id: "task-demo-4", nonce: "nonce-demo-a2a-4" }, verified: { tenant_id: "tenant-a", subject_id: "agent-b" }, grant: grantB, agentCard: card, registryRecord, authorityContext: { ...authorityContext, revoked: true } });

if (delegation.decision !== "allow") throw new Error("authorized delegation did not pass");
if (inheritedExecution.error_code !== "SUBJECT_MISMATCH") throw new Error("transitive authority was not denied");
if (explicitExecution.decision !== "allow") throw new Error("explicit downstream grant did not pass");
if (revoked.error_code !== "AUTHORITY_REVOKED") throw new Error("revoked downstream authority was not denied");

const evidence = externalizeA2AEvidence(explicitExecution, {
  receipt_id: "a2a-demo-receipt-1",
  chain: [
    { subject: "agent-a", result: delegation.decision, grant_id: grantA.grant_id },
    { subject: "agent-b", inherited_result: inheritedExecution.error_code, explicit_result: explicitExecution.decision, grant_id: grantB.grant_id },
    { subject: "agent-b", revoked_result: revoked.error_code, grant_id: grantB.grant_id },
  ],
});

console.log(JSON.stringify({
  profile: "OIAGP-A2A-candidate",
  authorized_delegation: delegation.decision,
  inherited_authority: inheritedExecution.error_code,
  explicit_downstream_authority: explicitExecution.decision,
  revocation: revoked.error_code,
  authority_created_by_evidence: evidence.authority_created,
  receipt: evidence.receipt,
}, null, 2));
