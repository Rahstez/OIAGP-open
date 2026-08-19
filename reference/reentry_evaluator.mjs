export const ReentryDecision = Object.freeze({
  ALIGNED: "aligned",
  FAIL_CLOSED: "fail_closed",
  PRINCIPAL_REQUIRED: "principal_required",
});

function deny(reason_codes, decision = ReentryDecision.FAIL_CLOSED) {
  return Object.freeze({ decision, reason_codes: Object.freeze([...reason_codes]) });
}

/**
 * Deterministic reference evaluator for OIAGP-005/006/007 re-entry continuity.
 *
 * This evaluator does not create authority. It only decides whether the supplied
 * posture, authority, and controlled-source state permit safe continuation of
 * work that is already within a separately valid task boundary.
 */
export function evaluateReentry(input) {
  if (!input || typeof input !== "object") return deny(["invalid_input"]);

  const posture = input.controlling_posture;
  const authority = input.authority_state;
  const source = input.source_state;

  if (!posture || posture.verified !== true) return deny(["posture_unverified"]);
  if (posture.release_state !== "active") return deny([`posture_${posture.release_state ?? "unknown"}`]);
  if (!authority || !authority.status) return deny(["authority_state_missing"]);
  if (["expired", "revoked", "missing"].includes(authority.status)) return deny([`authority_${authority.status}`]);
  if (authority.status === "contradictory") return deny(["authority_contradictory"], ReentryDecision.PRINCIPAL_REQUIRED);
  if (!["current", "not_required"].includes(authority.status)) return deny(["authority_state_invalid"]);
  if (!source || typeof source.controlled_sources_available !== "boolean") return deny(["source_state_missing"]);
  if (source.controlled_sources_available && source.source_priority_enforced !== true) return deny(["controlled_source_priority_not_enforced"]);
  if (source.contradiction_state === "unresolved") return deny(["controlled_source_contradiction_unresolved"], ReentryDecision.PRINCIPAL_REQUIRED);
  if (!["none", "resolved"].includes(source.contradiction_state)) return deny(["source_contradiction_state_invalid"]);

  return Object.freeze({
    decision: ReentryDecision.ALIGNED,
    reason_codes: Object.freeze(["posture_verified", "authority_current", "source_state_acceptable"]),
    resume_authorized_work_without_redundant_prompt: true,
  });
}

export function mayResumeAuthorizedWork(input) {
  return evaluateReentry(input).decision === ReentryDecision.ALIGNED;
}
