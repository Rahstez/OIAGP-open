import { createLearningCandidate, attachCapabilityArtifact } from "./controlled_learning.mjs";

export function importEvoSkillCandidate({ evoskill, task_class, capability_id, version = "0.1.0" }) {
  if (!evoskill || typeof evoskill !== "object") throw new Error("evoskill artifact required");
  if (!Array.isArray(evoskill.skills) || evoskill.skills.length === 0) throw new Error("at least one EvoSkill skill required");
  if (!evoskill.evaluation || typeof evoskill.evaluation !== "object") throw new Error("EvoSkill evaluation required");

  const trajectory = { task_id: evoskill.run_id ?? "evoskill-run", request_id: evoskill.request_id ?? null, steps: ["evoskill_proposal", "evoskill_evaluation"], evidence_refs: [...(evoskill.evidence_refs ?? [])] };
  const candidate = createLearningCandidate({ trajectory, feedback: { upstream: "EvoSkill", score: evoskill.evaluation.score ?? null, baseline_score: evoskill.evaluation.baseline_score ?? null }, task_class, capability_id, version });

  attachCapabilityArtifact(candidate, { instructions: evoskill.program?.instructions ?? null, required_tools: [...(evoskill.program?.tools ?? [])], data_requirements: [...(evoskill.data_requirements ?? [])], authority_requirements: [...(evoskill.authority_requirements ?? [])], tests: [...(evoskill.tests ?? [])], known_failure_modes: [...(evoskill.known_failure_modes ?? [])] });

  candidate.upstream = Object.freeze({ project: "sentient-agi/EvoSkill", license: "Apache-2.0", run_id: evoskill.run_id ?? null, skill_names: Object.freeze(evoskill.skills.map((skill) => skill.name ?? "unnamed")), evaluation: Object.freeze({ ...evoskill.evaluation }) });
  candidate.activation_authorized = false;
  return candidate;
}
