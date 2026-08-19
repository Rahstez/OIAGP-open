const required = (value, name) => {
  if (value === undefined || value === null || value === "") throw new Error(`missing ${name}`);
  return value;
};

function normalizeResource(resource) {
  if (!resource || typeof resource !== "object") throw new Error("invalid resource");
  return { type: required(resource.type, "resource.type"), id: required(resource.id, "resource.id") };
}

export function fromHttpRequest({ body, verified }) {
  required(body, "body");
  required(verified, "verified context");
  return Object.freeze({
    oiagp_version: required(body.oiagp_version, "oiagp_version"),
    message_type: "task_request",
    message_id: required(body.message_id, "message_id"),
    issued_at: required(body.issued_at, "issued_at"),
    request_id: required(body.request_id, "request_id"),
    tenant_id: required(verified.tenant_id, "verified tenant_id"),
    requester: required(verified.subject_id, "verified subject_id"),
    capability: required(body.capability, "capability"),
    operation: required(body.operation, "operation"),
    resources: (body.resources ?? []).map(normalizeResource),
    authority_grant_id: required(body.authority_grant_id, "authority_grant_id"),
    approval_ref: verified.approval_ref,
    nonce: required(body.nonce, "nonce"),
    idempotency_key: body.idempotency_key,
    evidence_requirements: body.evidence_requirements ?? { receipt_required: true },
  });
}

export function toHttpDecision(decision) {
  const allowed = decision?.decision === "allow";
  return Object.freeze({
    status: allowed ? 200 : decision?.error_code === "AUTHENTICATION_REQUIRED" ? 401 : decision?.error_code === "POLICY_UNAVAILABLE" ? 503 : decision?.error_code === "REPLAY_DETECTED" || decision?.error_code === "IDEMPOTENCY_CONFLICT" ? 409 : 403,
    media_type: "application/oiagp+json",
    body: decision,
  });
}

export function fromMcpToolCall({ toolCall, verified, grantId, protocolVersion = "0.1.0" }) {
  required(toolCall, "toolCall");
  return Object.freeze({
    oiagp_version: protocolVersion,
    message_type: "task_request",
    message_id: required(toolCall.id, "toolCall.id"),
    issued_at: required(toolCall.issued_at, "toolCall.issued_at"),
    request_id: `mcp-${toolCall.id}`,
    tenant_id: required(verified?.tenant_id, "verified tenant_id"),
    requester: required(verified?.subject_id, "verified subject_id"),
    capability: required(toolCall.capability, "toolCall.capability"),
    operation: required(toolCall.name, "toolCall.name"),
    resources: (toolCall.resources ?? []).map(normalizeResource),
    authority_grant_id: required(grantId, "grantId"),
    nonce: required(toolCall.nonce, "toolCall.nonce"),
    input: toolCall.arguments,
    evidence_requirements: { receipt_required: true },
  });
}

export function fromA2ATask({ task, verified, grantId, protocolVersion = "0.1.0" }) {
  required(task, "task");
  return Object.freeze({
    oiagp_version: protocolVersion,
    message_type: "task_request",
    message_id: required(task.id, "task.id"),
    issued_at: required(task.issued_at, "task.issued_at"),
    request_id: `a2a-${task.id}`,
    tenant_id: required(verified?.tenant_id, "verified tenant_id"),
    requester: required(verified?.subject_id, "verified subject_id"),
    capability: required(task.capability, "task.capability"),
    operation: required(task.operation, "task.operation"),
    resources: (task.resources ?? []).map(normalizeResource),
    authority_grant_id: required(grantId, "grantId"),
    nonce: required(task.nonce, "task.nonce"),
    input: task.input,
    evidence_requirements: { receipt_required: true },
  });
}

export function toExternalResult(result, receipt) {
  return Object.freeze({ result, receipt, authority_created: false });
}
