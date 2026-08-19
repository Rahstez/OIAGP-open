export const AuthorityError = Object.freeze({
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  AUTHORITY_MISSING: "AUTHORITY_MISSING",
  AUTHORITY_EXPIRED: "AUTHORITY_EXPIRED",
  AUTHORITY_PREMATURE: "AUTHORITY_PREMATURE",
  AUTHORITY_REVOKED: "AUTHORITY_REVOKED",
  AUTHORITY_INVALID: "AUTHORITY_INVALID",
  TENANT_MISMATCH: "TENANT_MISMATCH",
  SUBJECT_MISMATCH: "SUBJECT_MISMATCH",
  CAPABILITY_MISMATCH: "CAPABILITY_MISMATCH",
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",
  RESOURCE_OUT_OF_SCOPE: "RESOURCE_OUT_OF_SCOPE",
  DELEGATION_EXCEEDED: "DELEGATION_EXCEEDED",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  REPLAY_DETECTED: "REPLAY_DETECTED",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  CALLER_OVERRIDE_REJECTED: "CALLER_OVERRIDE_REJECTED",
  POLICY_UNAVAILABLE: "POLICY_UNAVAILABLE",
  VERSION_UNSUPPORTED: "VERSION_UNSUPPORTED",
});

function deny(error_code, reason) {
  return Object.freeze({ decision: "deny", error_code, reason });
}

function resourceKey(scope) {
  if (!scope || typeof scope !== "object") return "";
  return `${scope.type ?? ""}:${scope.id ?? ""}`;
}

function resourcesCovered(requested, granted) {
  const grantedKeys = new Set((granted ?? []).map(resourceKey));
  return (requested ?? []).every((scope) => grantedKeys.has(resourceKey(scope)));
}

/**
 * Deterministic, model-independent reference authorization evaluator.
 * Authentication, proof validation, revocation lookup, nonce storage, approval
 * verification, idempotency state, and policy availability are supplied as
 * already-verified inputs by the host implementation. Caller-supplied tenant,
 * role, approval, or authority assertions are never self-validating.
 */
export function evaluateAuthority(input) {
  if (!input?.authenticated) return deny(AuthorityError.AUTHENTICATION_REQUIRED, "verified authentication is required");
  if (input.policy_available !== true) return deny(AuthorityError.POLICY_UNAVAILABLE, "policy evaluation unavailable");

  const request = input.request;
  const grant = input.grant;
  if (!grant) return deny(AuthorityError.AUTHORITY_MISSING, "authority grant missing");
  if (!request) return deny(AuthorityError.AUTHORITY_INVALID, "task request missing");
  if (input.caller_override_attempt === true) return deny(AuthorityError.CALLER_OVERRIDE_REJECTED, "caller-supplied tenant or role override rejected");
  if (input.supported_major_version && !String(request.oiagp_version ?? "").startsWith(`${input.supported_major_version}.`)) return deny(AuthorityError.VERSION_UNSUPPORTED, "unsupported protocol major version");
  if (input.unknown_required_extension === true) return deny(AuthorityError.VERSION_UNSUPPORTED, "unknown required extension");
  if (input.grant_proof_valid !== true) return deny(AuthorityError.AUTHORITY_INVALID, "authority proof invalid or unverifiable");
  if (request.authority_grant_id !== grant.grant_id) return deny(AuthorityError.AUTHORITY_INVALID, "request references a different authority grant");
  if (input.revoked === true) return deny(AuthorityError.AUTHORITY_REVOKED, "authority grant revoked");

  const now = new Date(input.now ?? Date.now()).getTime();
  const effective = new Date(grant.effective_at).getTime();
  const expires = new Date(grant.expires_at).getTime();
  if (!Number.isFinite(effective) || !Number.isFinite(expires) || expires <= effective) return deny(AuthorityError.AUTHORITY_INVALID, "invalid authority time window");
  if (now < effective) return deny(AuthorityError.AUTHORITY_PREMATURE, "authority not yet effective");
  if (now >= expires) return deny(AuthorityError.AUTHORITY_EXPIRED, "authority expired");
  if (request.tenant_id !== input.verified_tenant_id || grant.tenant_id !== input.verified_tenant_id) return deny(AuthorityError.TENANT_MISMATCH, "verified tenant does not match request and grant");
  if (request.requester !== input.verified_subject_id || grant.subject !== input.verified_subject_id) return deny(AuthorityError.SUBJECT_MISMATCH, "verified subject does not match request and grant");
  if (!request.capability || request.capability !== grant.capability) return deny(AuthorityError.CAPABILITY_MISMATCH, "requested capability is missing or outside grant");
  if (!Array.isArray(grant.operations) || !grant.operations.includes(request.operation)) return deny(AuthorityError.OPERATION_NOT_ALLOWED, "requested operation is outside grant");
  if (!resourcesCovered(request.resources, grant.resources)) return deny(AuthorityError.RESOURCE_OUT_OF_SCOPE, "requested resource is outside grant");

  const requestedDepth = Number(input.requested_delegation_depth ?? 0);
  const remainingDepth = Number(grant.delegation?.remaining_depth ?? 0);
  if (!Number.isInteger(requestedDepth) || requestedDepth < 0 || requestedDepth > remainingDepth) return deny(AuthorityError.DELEGATION_EXCEEDED, "requested delegation exceeds remaining grant depth");
  if (requestedDepth > 0 && grant.delegation?.allowed !== true) return deny(AuthorityError.DELEGATION_EXCEEDED, "delegation is not allowed by grant");
  if (grant.approval_class && (input.approval_valid !== true || !request.approval_ref)) return deny(AuthorityError.APPROVAL_REQUIRED, "required approval missing or unverifiable");
  if (input.nonce_consumed === true) return deny(AuthorityError.REPLAY_DETECTED, "request nonce has already been consumed");
  if (input.idempotency_conflict === true) return deny(AuthorityError.IDEMPOTENCY_CONFLICT, "idempotency key conflicts with prior request");

  return Object.freeze({
    decision: "allow",
    grant_id: grant.grant_id,
    tenant_id: input.verified_tenant_id,
    subject_id: input.verified_subject_id,
    capability: request.capability,
    operation: request.operation,
    resources: Object.freeze([...(request.resources ?? [])]),
    expires_at: grant.expires_at,
  });
}
