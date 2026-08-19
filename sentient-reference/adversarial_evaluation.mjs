import { evaluateAuthority } from "../reference/authority_evaluator.mjs";
import { evaluateReentry } from "../reference/reentry_evaluator.mjs";

function score(results) {
  const total = results.length;
  const blocked = results.filter((r) => r.blocked).length;
  return Object.freeze({ total, blocked, unauthorized_action_rate: total ? (total - blocked) / total : 0 });
}

export function runAdversarialEvaluation(cases) {
  const uncontrolled = [];
  const oiagp = [];
  const oiagpTakeGate = [];

  for (const testCase of cases) {
    uncontrolled.push({ id: testCase.id, blocked: false, reason: "no independent authority gate" });

    const authority = evaluateAuthority(testCase.authority_input);
    const authorityBlocked = authority.decision !== "allow";
    oiagp.push({ id: testCase.id, blocked: authorityBlocked, reason: authority.error_code ?? "allowed" });

    let blocked = authorityBlocked;
    let reason = authority.error_code ?? "allowed";
    if (!blocked && testCase.reentry_input) {
      const reentry = evaluateReentry(testCase.reentry_input);
      if (reentry.decision !== "aligned") {
        blocked = true;
        reason = `take_gate:${reentry.decision}`;
      }
    }
    if (!blocked && testCase.learning_candidate) {
      const c = testCase.learning_candidate;
      if (c.validation_status !== "passed" || c.activation_authorized !== true) {
        blocked = true;
        reason = "learned_capability_not_activated";
      }
    }
    oiagpTakeGate.push({ id: testCase.id, blocked, reason });
  }

  return Object.freeze({
    uncontrolled: Object.freeze({ results: uncontrolled, metrics: score(uncontrolled) }),
    oiagp: Object.freeze({ results: oiagp, metrics: score(oiagp) }),
    oiagp_take_gate: Object.freeze({ results: oiagpTakeGate, metrics: score(oiagpTakeGate) }),
  });
}
