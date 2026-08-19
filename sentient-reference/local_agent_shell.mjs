import { evaluateReentry, mayResumeAuthorizedWork } from "../reference/reentry_evaluator.mjs";

export const LocalAgentState = Object.freeze({ READY: "ready", REANCHOR_REQUIRED: "reanchor_required", PRINCIPAL_REQUIRED: "principal_required", DENIED: "denied" });

export function createLocalPrincipal({ principal_id, device_id }) {
  if (!principal_id || !device_id) throw new Error("principal_id and device_id are required");
  return Object.freeze({ principal_id, device_id, authority_root: "local_user", cloud_required: false });
}

export function createLocalAgentState({ principal, model_adapter, memory_store = "local-encrypted", capability_store = "local" }) {
  if (!principal?.principal_id) throw new Error("local principal required");
  if (!model_adapter?.id) throw new Error("model adapter required");
  return { principal, model_adapter: { ...model_adapter }, memory_store, capability_store, active_capabilities: new Set(), revoked_capabilities: new Set(), evidence: [], status: LocalAgentState.REANCHOR_REQUIRED };
}

export function runTakeGate(state, reentryInput) {
  const decision = evaluateReentry(reentryInput);
  if (decision.decision === "aligned" && mayResumeAuthorizedWork(reentryInput)) state.status = LocalAgentState.READY;
  else if (decision.decision === "principal_required") state.status = LocalAgentState.PRINCIPAL_REQUIRED;
  else state.status = LocalAgentState.DENIED;
  state.evidence.push(Object.freeze({ type: "take_gate_decision", decision: decision.decision, reason_codes: decision.reason_codes ?? [], at: new Date().toISOString() }));
  return decision;
}

export function activateCapability(state, capability) {
  if (state.status !== LocalAgentState.READY) throw new Error("take gate has not cleared");
  if (!capability?.id || !capability?.version) throw new Error("capability id/version required");
  if (capability.validation_status !== "passed") throw new Error("capability validation not passed");
  if (capability.activation_authorized !== true) throw new Error("capability activation not authorized");
  if (state.revoked_capabilities.has(capability.id)) throw new Error("capability revoked");
  state.active_capabilities.add(`${capability.id}@${capability.version}`);
  state.evidence.push(Object.freeze({ type: "capability_activated", capability_id: capability.id, version: capability.version, at: new Date().toISOString() }));
  return true;
}

export function revokeCapability(state, capability_id) {
  if (!capability_id) throw new Error("capability_id required");
  state.revoked_capabilities.add(capability_id);
  for (const key of [...state.active_capabilities]) if (key.startsWith(`${capability_id}@`)) state.active_capabilities.delete(key);
  state.evidence.push(Object.freeze({ type: "capability_revoked", capability_id, at: new Date().toISOString() }));
}

export function changeModelAdapter(state, nextAdapter) {
  if (!nextAdapter?.id) throw new Error("model adapter required");
  state.model_adapter = { ...nextAdapter };
  state.status = LocalAgentState.REANCHOR_REQUIRED;
  state.evidence.push(Object.freeze({ type: "model_adapter_changed", model_adapter_id: nextAdapter.id, at: new Date().toISOString() }));
}
