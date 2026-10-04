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

const verifiedActivations = new WeakMap();

function freezeDetached(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeDetached(child, seen);
  return Object.freeze(value);
}

function verifyWithHost(verifier, context) {
  if (typeof verifier !== "function") return false;
  try {
    const result = verifier(freezeDetached(structuredClone(context)));
    if (result instanceof Promise) result.catch(() => {});
    return result === true;
  } catch { return false; }
}

// Host dependency, never populated from model output or request JSON. The
// verifier resolves principal, exact capability/version, validation provenance,
// expiry, revocation and replay policy. It is called again at final consumption.
export function authorizeActivation(candidate, authorization, dependencies = {}) {
  if (candidate.status !== LearningStatus.ACTIVATION_PENDING) throw new Error("activation not pending");
  if (authorization?.decision !== "allow") throw new Error("activation denied");
  if (!authorization.principal_id) throw new Error("principal authorization required");
  if (authorization.capability_id !== candidate.capability_id) throw new Error("capability mismatch");
  if (authorization.version !== candidate.version) throw new Error("version mismatch");
  const verifier = dependencies?.verifyActivation;
  let context;
  try {
    context = freezeDetached(structuredClone({ principalId: authorization.principal_id,
      capabilityId: candidate.capability_id, version: candidate.version,
      candidate: { artifact: candidate.artifact, provenance: candidate.provenance, evaluation: candidate.evaluation }, authorization }));
  } catch { throw new Error("activation evidence invalid"); }
  if (!verifyWithHost(verifier, { ...context, stage: "issue" })) throw new Error("activation authority unverified");
  if (candidate.status !== LearningStatus.ACTIVATION_PENDING || candidate.capability_id !== context.capabilityId || candidate.version !== context.version) {
    throw new Error("activation candidate changed during verification");
  }
  const active = freezeDetached({ id: context.capabilityId, version: context.version,
    validation_status: "passed", activation_authorized: true,
    provenance: context.candidate.provenance, artifact: context.candidate.artifact });
  verifiedActivations.set(active, { context, verifier, checking: false });
  candidate.activation_authorized = true;
  candidate.status = LearningStatus.ACTIVE;
  return active;
}


// An in-process opaque receipt is consumed once; serialized copies and
// caller-created activation_authorized flags are not activation receipts.
export function consumeVerifiedActivation(capability, principalId) {
  const proof = verifiedActivations.get(capability);
  if (!proof || proof.checking || proof.context.principalId !== principalId) return false;
  proof.checking = true;
  if (!verifyWithHost(proof.verifier, { ...proof.context, stage: "consume" })) {
    proof.checking = false;
    return false;
  }
  verifiedActivations.delete(capability);
  return true;
}
