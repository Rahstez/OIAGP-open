import { evaluateAuthority } from "./authority_evaluator.mjs";
import { fromA2ATask, toExternalResult } from "./interoperability_adapters.mjs";
import { ReentryDecision } from "./reentry_evaluator.mjs";

function deny(error_code, reason) {
  return Object.freeze({ decision: "deny", error_code, reason });
}

export function validateAgentCard({ agentCard, registryRecord }) {
  if (!agentCard || !registryRecord) return deny("AGENT_CARD_UNVERIFIED", "agent card or controlled registry record missing");
  if (!agentCard.agent_id || agentCard.agent_id !== registryRecord.agent_id) return deny("AGENT_SUBSTITUTION", "agent card identity does not match controlled registry");
  if (!agentCard.version || agentCard.version !== registryRecord.version) return deny("AGENT_CARD_STALE", "agent card version does not match controlled registry");
  if (registryRecord.card_digest && agentCard.digest !== registryRecord.card_digest) return deny("AGENT_CARD_MUTATED", "agent card digest does not match controlled registry");
  const registered = new Set(registryRecord.capabilities ?? []);
  const overclaim = (agentCard.capabilities ?? []).find((capability) => !registered.has(capability));
  if (overclaim) return deny("CAPABILITY_OVERCLAIM", `agent card advertises unregistered capability: ${overclaim}`);
  return Object.freeze({ decision: "allow", agent_id: registryRecord.agent_id, validated_capabilities: Object.freeze([...(agentCard.capabilities ?? [])]) });
}

export function evaluateA2ADelegation(input) {
  const cardDecision = validateAgentCard({ agentCard: input?.agentCard, registryRecord: input?.registryRecord });
  if (cardDecision.decision !== "allow") return cardDecision;

  if (input?.reentry_required === true && input?.reentry_decision?.decision !== ReentryDecision.ALIGNED) {
    return deny("TAKE_GATE_REQUIRED", "remote agent re-entry is not aligned");
  }

  const request = fromA2ATask({
    task: input.task,
    verified: input.verified,
    grantId: input.grant?.grant_id,
    protocolVersion: input.protocolVersion ?? "0.1.0",
  });

  if (!(cardDecision.validated_capabilities ?? []).includes(request.capability)) {
    return deny("CAPABILITY_UNVALIDATED", "requested capability is not validated for the remote agent");
  }

  return evaluateAuthority({
    ...input.authorityContext,
    request,
    grant: input.grant,
    verified_tenant_id: input.verified?.tenant_id,
    verified_subject_id: input.verified?.subject_id,
    requested_delegation_depth: input.requested_delegation_depth ?? 0,
  });
}

export function externalizeA2AEvidence(result, receipt) {
  return toExternalResult(result, Object.freeze({ ...receipt, transport_profile: "a2a", authority_created: false }));
}
