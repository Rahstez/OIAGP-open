import assert from "node:assert/strict";
import test from "node:test";
import { ExecutionDecision, ExecutionError, evaluateUntrustedExecution } from "../reference/untrusted_execution_profile.mjs";

function baseInput() {
  return {
    controls: {
      network_egress_denied: true,
      ambient_secret_access: false,
      filesystem_allowlist: ["/work/input", "/work/output"],
      privileges_dropped: true,
      limits: { cpu_ms: 5000, memory_mb: 256, processes: 16, disk_mb: 128, output_kb: 1024 },
      timeout_ms: 10000,
      interruptible: true,
      isolation: { mechanism: "reference-sandbox", validated: true },
      package_install_denied: true,
      device_access_denied: true,
      host_namespace_access_denied: true,
      artifacts_default_untrusted: true,
      governed_promotion_required: true,
    },
    evidence_binding: { task_id: "task-001", request_id: "request-001", policy_version: "oiagp-untrusted-exec-0.1", executor_identity: "executor-001", input_hash: "sha256:input", output_hash: "sha256:output", exit_status: "0" },
    requests_consequential_mutation: false,
    mutation_integrity_authorized: false,
  };
}

test("allows only sandboxed execution with complete containment declaration", () => assert.equal(evaluateUntrustedExecution(baseInput()).decision, ExecutionDecision.ALLOW_SANDBOXED));

test("denies network egress when not default-denied", () => { const i = baseInput(); i.controls.network_egress_denied = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.NETWORK_EGRESS_NOT_DENIED); });
test("denies ambient secret access", () => { const i = baseInput(); i.controls.ambient_secret_access = true; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.AMBIENT_SECRETS_EXPOSED); });
test("denies filesystem exposure outside bounded work paths", () => { const i = baseInput(); i.controls.filesystem_allowlist = ["/etc"]; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.FILESYSTEM_SCOPE_INVALID); });
test("denies missing resource ceilings", () => { const i = baseInput(); i.controls.limits.memory_mb = 0; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.LIMITS_MISSING); });
test("denies missing timeout or interruption", () => { const i = baseInput(); i.controls.interruptible = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.TIMEOUT_MISSING); });
test("denies unvalidated isolation mechanism", () => { const i = baseInput(); i.controls.isolation.validated = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.ISOLATION_UNVERIFIED); });
test("denies package installation by default violation", () => { const i = baseInput(); i.controls.package_install_denied = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.PACKAGE_INSTALL_NOT_DENIED); });
test("denies device access by default violation", () => { const i = baseInput(); i.controls.device_access_denied = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.DEVICE_ACCESS_NOT_DENIED); });
test("denies host namespace access by default violation", () => { const i = baseInput(); i.controls.host_namespace_access_denied = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.HOST_NAMESPACE_NOT_DENIED); });
test("denies execution when privileges are not dropped", () => { const i = baseInput(); i.controls.privileges_dropped = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.PRIVILEGES_NOT_DROPPED); });
test("denies auto-trusted artifact promotion", () => { const i = baseInput(); i.controls.governed_promotion_required = false; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.ARTIFACT_PROMOTION_UNGOVERNED); });
test("denies incomplete durable execution evidence", () => { const i = baseInput(); delete i.evidence_binding.output_hash; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.EVIDENCE_BINDING_INCOMPLETE); });
test("sandbox containment does not authorize consequential mutation", () => { const i = baseInput(); i.requests_consequential_mutation = true; assert.equal(evaluateUntrustedExecution(i).error_code, ExecutionError.AUTHORITY_REQUIRED_FOR_MUTATION); });
test("allows mutation request only when separate mutation-integrity authorization is satisfied", () => { const i = baseInput(); i.requests_consequential_mutation = true; i.mutation_integrity_authorized = true; assert.equal(evaluateUntrustedExecution(i).decision, ExecutionDecision.ALLOW_SANDBOXED); });
