export const ExecutionDecision = Object.freeze({
  ALLOW_SANDBOXED: "allow_sandboxed",
  DENY: "deny",
});

export const ExecutionError = Object.freeze({
  AUTHORITY_REQUIRED_FOR_MUTATION: "AUTHORITY_REQUIRED_FOR_MUTATION",
  NETWORK_EGRESS_NOT_DENIED: "NETWORK_EGRESS_NOT_DENIED",
  AMBIENT_SECRETS_EXPOSED: "AMBIENT_SECRETS_EXPOSED",
  FILESYSTEM_SCOPE_INVALID: "FILESYSTEM_SCOPE_INVALID",
  LIMITS_MISSING: "LIMITS_MISSING",
  TIMEOUT_MISSING: "TIMEOUT_MISSING",
  ISOLATION_UNVERIFIED: "ISOLATION_UNVERIFIED",
  PACKAGE_INSTALL_NOT_DENIED: "PACKAGE_INSTALL_NOT_DENIED",
  DEVICE_ACCESS_NOT_DENIED: "DEVICE_ACCESS_NOT_DENIED",
  HOST_NAMESPACE_NOT_DENIED: "HOST_NAMESPACE_NOT_DENIED",
  PRIVILEGES_NOT_DROPPED: "PRIVILEGES_NOT_DROPPED",
  ARTIFACT_PROMOTION_UNGOVERNED: "ARTIFACT_PROMOTION_UNGOVERNED",
  EVIDENCE_BINDING_INCOMPLETE: "EVIDENCE_BINDING_INCOMPLETE",
});

function deny(error_code, reason) {
  return Object.freeze({ decision: ExecutionDecision.DENY, error_code, reason });
}

function hasPositiveFiniteNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function evaluateUntrustedExecution(input) {
  const c = input?.controls;
  if (!c || typeof c !== "object") return deny(ExecutionError.LIMITS_MISSING, "containment controls missing");
  if (c.network_egress_denied !== true) return deny(ExecutionError.NETWORK_EGRESS_NOT_DENIED, "network egress must be denied by default");
  if (c.ambient_secret_access === true) return deny(ExecutionError.AMBIENT_SECRETS_EXPOSED, "ambient secret access is prohibited");
  if (!Array.isArray(c.filesystem_allowlist) || c.filesystem_allowlist.length === 0 || c.filesystem_allowlist.some((p) => typeof p !== "string" || !p.startsWith("/work/"))) return deny(ExecutionError.FILESYSTEM_SCOPE_INVALID, "filesystem exposure must be explicit and bounded to approved work paths");
  if (c.privileges_dropped !== true) return deny(ExecutionError.PRIVILEGES_NOT_DROPPED, "least privilege and capability dropping required");

  const limits = c.limits;
  if (!limits || !hasPositiveFiniteNumber(limits.cpu_ms) || !hasPositiveFiniteNumber(limits.memory_mb) || !hasPositiveFiniteNumber(limits.processes) || !hasPositiveFiniteNumber(limits.disk_mb) || !hasPositiveFiniteNumber(limits.output_kb)) return deny(ExecutionError.LIMITS_MISSING, "cpu, memory, process, disk, and output ceilings are required");
  if (!hasPositiveFiniteNumber(c.timeout_ms) || c.interruptible !== true) return deny(ExecutionError.TIMEOUT_MISSING, "hard timeout and interruption support are required");
  if (c.isolation?.validated !== true || !c.isolation?.mechanism) return deny(ExecutionError.ISOLATION_UNVERIFIED, "independently validated isolation mechanism required");
  if (c.package_install_denied !== true) return deny(ExecutionError.PACKAGE_INSTALL_NOT_DENIED, "package installation must be denied by default");
  if (c.device_access_denied !== true) return deny(ExecutionError.DEVICE_ACCESS_NOT_DENIED, "device access must be denied by default");
  if (c.host_namespace_access_denied !== true) return deny(ExecutionError.HOST_NAMESPACE_NOT_DENIED, "host namespace access must be denied by default");
  if (c.artifacts_default_untrusted !== true || c.governed_promotion_required !== true) return deny(ExecutionError.ARTIFACT_PROMOTION_UNGOVERNED, "generated artifacts must remain untrusted until governed promotion");

  const evidence = input.evidence_binding;
  const requiredEvidence = ["task_id", "request_id", "policy_version", "executor_identity", "input_hash", "output_hash", "exit_status"];
  if (!evidence || requiredEvidence.some((k) => !evidence[k])) return deny(ExecutionError.EVIDENCE_BINDING_INCOMPLETE, "durable execution evidence is incomplete");
  if (input.requests_consequential_mutation === true && input.mutation_integrity_authorized !== true) return deny(ExecutionError.AUTHORITY_REQUIRED_FOR_MUTATION, "sandbox containment does not authorize consequential mutation");

  return Object.freeze({
    decision: ExecutionDecision.ALLOW_SANDBOXED,
    isolation_mechanism: c.isolation.mechanism,
    policy_version: evidence.policy_version,
    artifact_state: "untrusted_pending_governed_promotion",
  });
}
