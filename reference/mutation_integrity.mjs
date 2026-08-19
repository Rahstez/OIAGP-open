import { createHash } from "node:crypto";

export const MutationError = Object.freeze({
  AUTHORITY_DENIED: "AUTHORITY_DENIED",
  AGENT_IDENTITY_MISMATCH: "AGENT_IDENTITY_MISMATCH",
  POLICY_MISMATCH: "POLICY_MISMATCH",
  TENANT_MISMATCH: "TENANT_MISMATCH",
  RESOURCE_MISMATCH: "RESOURCE_MISMATCH",
  PAYLOAD_HASH_MISMATCH: "PAYLOAD_HASH_MISMATCH",
  REPLAY_DETECTED: "REPLAY_DETECTED",
  KEY_REVOKED: "KEY_REVOKED",
  RECEIPT_INVALID: "RECEIPT_INVALID",
  RESULT_HASH_MISMATCH: "RESULT_HASH_MISMATCH",
});

export function sha256(value) {
  const bytes = typeof value === "string" ? value : JSON.stringify(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function deny(error_code, reason) {
  return Object.freeze({ decision: "deny", effect: "no_effect", error_code, reason });
}

export function evaluateMutation(input) {
  if (input?.authority_decision?.decision !== "allow") return deny(MutationError.AUTHORITY_DENIED, "exact mutation lacks an allow authority decision");
  if (!input.agent_identity_verified || input.executing_agent_id !== input.expected_agent_id) return deny(MutationError.AGENT_IDENTITY_MISMATCH, "executing agent identity is not bound to expected identity");
  if (input.key_revoked === true) return deny(MutationError.KEY_REVOKED, "executing signing key is revoked");
  if (!input.policy_version || input.policy_version !== input.expected_policy_version) return deny(MutationError.POLICY_MISMATCH, "mutation policy version mismatch");
  if (input.tenant_id !== input.authority_decision.tenant_id) return deny(MutationError.TENANT_MISMATCH, "mutation tenant differs from authority decision");
  if (!Array.isArray(input.authority_decision.resources) || !input.authority_decision.resources.some((r) => r.type === input.resource?.type && r.id === input.resource?.id)) return deny(MutationError.RESOURCE_MISMATCH, "mutation resource differs from authorized resource");
  if (sha256(input.payload) !== input.payload_hash) return deny(MutationError.PAYLOAD_HASH_MISMATCH, "mutation payload hash mismatch");
  if (input.replay_detected === true) return deny(MutationError.REPLAY_DETECTED, "mutation replay detected");

  return Object.freeze({
    decision: "allow",
    effect: "pre_effect_only",
    principal_id: input.principal_id,
    tenant_id: input.tenant_id,
    grant_id: input.authority_decision.grant_id,
    agent_id: input.executing_agent_id,
    policy_version: input.policy_version,
    task_id: input.task_id,
    request_id: input.request_id,
    resource: Object.freeze({ ...input.resource }),
    payload_hash: input.payload_hash,
  });
}

export function verifyMutationReceipt(input) {
  const receipt = input?.receipt;
  if (!receipt || input.receipt_signature_valid !== true) return deny(MutationError.RECEIPT_INVALID, "receipt is missing or signature is invalid");
  if (input.key_revoked === true) return deny(MutationError.KEY_REVOKED, "receipt signing key is revoked");
  if (receipt.request_id !== input.expected_request_id || receipt.grant_id !== input.expected_grant_id || receipt.agent_id !== input.expected_agent_id || receipt.tenant_id !== input.expected_tenant_id) return deny(MutationError.RECEIPT_INVALID, "receipt binding mismatch");
  if (receipt.result_hash !== sha256(input.result)) return deny(MutationError.RESULT_HASH_MISMATCH, "result/evidence hash mismatch");
  return Object.freeze({ decision: "verified", receipt_id: receipt.receipt_id, effect: receipt.effect });
}
