export const LearningStatus = Object.freeze({ CANDIDATE: "candidate", VALIDATED: "validated", REJECTED: "rejected", ACTIVATION_PENDING: "activation_pending", ACTIVE: "active" });

export function createLearningCandidate({ trajectory, feedback, task_class, capability_id, version = "0.1.0" }) {
  if (!trajectory || !Array.isArray(trajectory.steps) || trajectory.steps.length === 0) throw new Error("trajectory steps required");
  if (!task_class || !capability_id) throw new Error("task_class and capability_id required");
  return { id: `candidate-${trajectory.task_id ?? Date.now()}`, status: LearningStatus.CANDIDATE, capability_id, version, task_class, feedback: feedback ?? null, provenance: { task_id: trajectory.task_id ?? null, request_id: trajectory.request_id ?? null, evidence_refs: [...(trajectory.evidence_refs ?? [])] }, artifact: null, evaluation: null, activation_authorized: false };
}

export function attachCapabilityArtifact(candidate, artifact) {
  if (candidate.status !== LearningStatus.CANDIDATE) throw new Error("candidate not editable");
  if (!artifact || typeof artifact !== "object") throw new Error("artifact required");
  candidate.artifact = Object.freeze({ instructions: artifact.instructions ?? null, required_tools: Object.freeze([...(artifact.required_tools ?? [])]), data_requirements: Object.freeze([...(artifact.data_requirements ?? [])]), authority_requirements: Object.freeze([...(artifact.authority_requirements ?? [])]), tests: Object.freeze([...(artifact.tests ?? [])]), known_failure_modes: Object.freeze([...(artifact.known_failure_modes ?? [])]) });
  return candidate.artifact;
}

export function validateLearningCandidate(candidate, evaluation) {
  if (!candidate.artifact) throw new Error("artifact missing");
  const passed = evaluation?.tests_passed === true && evaluation?.adversarial_checks_passed === true && evaluation?.authority_boundary_preserved === true;
  candidate.evaluation = Object.freeze({ ...evaluation });
  candidate.status = passed ? LearningStatus.VALIDATED : LearningStatus.REJECTED;
  return candidate.status;
}

export function requestActivation(candidate) {
  if (candidate.status !== LearningStatus.VALIDATED) throw new Error("candidate not validated");
  candidate.status = LearningStatus.ACTIVATION_PENDING;
  return candidate.status;
}

export function authorizeActivation(candidate, authorization) {
  if (candidate.status !== LearningStatus.ACTIVATION_PENDING) throw new Error("activation not pending");
  if (authorization?.decision !== "allow") throw new Error("activation denied");
  if (!authorization.principal_id) throw new Error("principal authorization required");
  if (authorization.capability_id !== candidate.capability_id) throw new Error("capability mismatch");
  if (authorization.version !== candidate.version) throw new Error("version mismatch");
  candidate.activation_authorized = true;
  candidate.status = LearningStatus.ACTIVE;
  return Object.freeze({ id: candidate.capability_id, version: candidate.version, validation_status: "passed", activation_authorized: true, provenance: candidate.provenance, artifact: candidate.artifact });
}
