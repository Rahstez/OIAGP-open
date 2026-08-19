import assert from "node:assert/strict";
import test from "node:test";
import { importEvoSkillCandidate } from "./evoskill_adapter.mjs";
import { validateLearningCandidate, requestActivation } from "./controlled_learning.mjs";

function upstream() {
  return {
    run_id: "evo-1",
    skills: [{ name: "summarize-local-doc" }],
    evaluation: { score: 0.91, baseline_score: 0.72 },
    program: { instructions: "summarize local text", tools: [] },
    authority_requirements: ["read-local-text"],
    tests: ["bounded-summary"],
  };
}

test("EvoSkill output imports as non-authoritative learning candidate", () => {
  const c = importEvoSkillCandidate({ evoskill: upstream(), task_class: "personal.assist", capability_id: "skill-local-summary" });
  assert.equal(c.upstream.project, "sentient-agi/EvoSkill");
  assert.equal(c.upstream.license, "Apache-2.0");
  assert.equal(c.activation_authorized, false);
  assert.equal(c.status, "candidate");
});

test("high upstream score does not bypass local validation", () => {
  const c = importEvoSkillCandidate({ evoskill: upstream(), task_class: "personal.assist", capability_id: "skill-local-summary" });
  assert.throws(() => requestActivation(c));
  validateLearningCandidate(c, { tests_passed: true, adversarial_checks_passed: true, authority_boundary_preserved: true });
  assert.equal(c.status, "validated");
  assert.equal(c.activation_authorized, false);
});
