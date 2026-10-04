import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeActivation, LearningStatus } from './controlled_learning.mjs';
const pending = () => ({ status: LearningStatus.ACTIVATION_PENDING, capability_id: 'skill', version: '1', artifact: { instruction: 'approved' }, provenance: {}, activation_authorized: false });
const approval = { decision: 'allow', principal_id: 'user', capability_id: 'skill', version: '1' };
test('a caller-created allow object cannot activate without a trusted verifier', () => {
  const candidate = pending();
  assert.throws(() => authorizeActivation(candidate, approval), /authority unverified/);
  assert.equal(candidate.status, LearningStatus.ACTIVATION_PENDING);
  assert.equal(candidate.activation_authorized, false);
});
test('throwing, asynchronous and nonliteral verifier outcomes cannot activate', async () => {
  for (const value of ['true', 'false', 1, {}, Promise.resolve(true), Promise.reject(new Error('unavailable'))]) {
    const candidate = pending();
    assert.throws(() => authorizeActivation(candidate, approval, { verifyActivation: () => value }), /authority unverified/);
    assert.equal(candidate.status, LearningStatus.ACTIVATION_PENDING);
  }
  assert.throws(() => authorizeActivation(pending(), approval, { verifyActivation: () => { throw new Error('unavailable'); } }), /authority unverified/);
  await Promise.resolve();
});
test('verifier receives frozen evidence and cannot substitute capability during issuance', () => {
  const candidate = pending();
  assert.throws(() => authorizeActivation(candidate, approval, { verifyActivation: request => {
    assert.ok(Object.isFrozen(request.candidate.artifact));
    candidate.capability_id = 'substituted'; return true;
  } }), /candidate changed/);
  assert.equal(candidate.activation_authorized, false);
});
