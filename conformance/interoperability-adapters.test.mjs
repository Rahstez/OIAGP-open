import assert from "node:assert/strict";
import test from "node:test";
import { fromHttpRequest, fromMcpToolCall, fromA2ATask, toHttpDecision, toExternalResult } from "../reference/interoperability_adapters.mjs";

const verified = { tenant_id: "tenant-a", subject_id: "agent-a", approval_ref: "approval-1" };

function baseBody() {
  return {
    oiagp_version: "0.1.0", message_id: "msg-1", issued_at: "2026-08-19T06:00:00Z", request_id: "req-1",
    tenant_id: "attacker-tenant", requester: "attacker", capability: "content.prepare", operation: "draft",
    resources: [{ type: "project", id: "project-1" }], authority_grant_id: "grant-1", approval_ref: "forged-approval",
    nonce: "nonce-000000000001", evidence_requirements: { receipt_required: true },
  };
}

test("HTTP adapter uses verified identity and tenant, not caller overrides", () => {
  const out = fromHttpRequest({ body: baseBody(), verified });
  assert.equal(out.tenant_id, "tenant-a"); assert.equal(out.requester, "agent-a"); assert.equal(out.approval_ref, "approval-1");
});

test("HTTP adapter maps allow/deny decisions without changing semantics", () => {
  assert.equal(toHttpDecision({ decision: "allow" }).status, 200);
  assert.equal(toHttpDecision({ decision: "deny", error_code: "AUTHENTICATION_REQUIRED" }).status, 401);
  assert.equal(toHttpDecision({ decision: "deny", error_code: "POLICY_UNAVAILABLE" }).status, 503);
  assert.equal(toHttpDecision({ decision: "deny", error_code: "REPLAY_DETECTED" }).status, 409);
  assert.equal(toHttpDecision({ decision: "deny", error_code: "TENANT_MISMATCH" }).status, 403);
});

test("MCP tool call requires externally supplied verified context and grant", () => {
  const out = fromMcpToolCall({ toolCall: { id: "tool-1", issued_at: "2026-08-19T06:00:00Z", capability: "content.prepare", name: "draft", resources: [{ type: "project", id: "project-1" }], nonce: "nonce-000000000002", arguments: { text: "hello" }, tenant_id: "self-asserted", role: "admin" }, verified, grantId: "grant-1" });
  assert.equal(out.tenant_id, "tenant-a"); assert.equal(out.requester, "agent-a"); assert.equal(out.authority_grant_id, "grant-1"); assert.equal(out.operation, "draft");
});

test("MCP adapter fails closed without verified context", () => {
  assert.throws(() => fromMcpToolCall({ toolCall: { id: "tool-1", issued_at: "2026-08-19T06:00:00Z", capability: "content.prepare", name: "draft", resources: [{ type: "project", id: "project-1" }], nonce: "nonce-000000000002" }, verified: null, grantId: "grant-1" }));
});

test("A2A task cannot self-assert authority", () => {
  const out = fromA2ATask({ task: { id: "task-1", issued_at: "2026-08-19T06:00:00Z", capability: "content.prepare", operation: "draft", resources: [{ type: "project", id: "project-1" }], nonce: "nonce-000000000003", input: { text: "hello" }, authority_grant_id: "self-granted", tenant_id: "self-tenant" }, verified, grantId: "grant-1" });
  assert.equal(out.tenant_id, "tenant-a"); assert.equal(out.authority_grant_id, "grant-1");
});

test("external result never creates authority", () => {
  const out = toExternalResult({ status: "ok" }, { receipt_id: "r-1" });
  assert.equal(out.authority_created, false);
});
