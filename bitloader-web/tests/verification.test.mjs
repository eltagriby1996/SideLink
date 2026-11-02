import test from 'node:test';
import assert from 'node:assert';
import { createAuthorizationToken, verifyAuthorizationToken } from '../lib/security/tokenService.ts';
import {
  createSessionRecord,
  getSessionRecord,
  markSessionVerified,
} from '../lib/database/sessionStore.ts';

test('Security Token Service: creates and verifies valid cryptographic token', async () => {
  const sessionId = 'test-session-12345';
  const { token, expiresAt } = await createAuthorizationToken(sessionId);

  assert.ok(token, 'Token should not be empty');
  assert.ok(token.split('.').length === 3, 'Token should be a standard 3-part JWT');
  assert.ok(expiresAt > new Date(), 'Token expiration should be in the future');

  const isValid = await verifyAuthorizationToken(token, sessionId);
  assert.strictEqual(isValid, true, 'Token should verify successfully with matching sessionId');

  const isInvalidSession = await verifyAuthorizationToken(token, 'different-session-999');
  assert.strictEqual(isInvalidSession, false, 'Token verification must fail with mismatched sessionId');
});

test('Session Store: manages session lifecycle and prevents unauthorized completion', async () => {
  const sessionId = 'session-cycle-abc';
  const nonce = 'valid-challenge-nonce-789';
  const expiresAt = new Date(Date.now() + 60000); // 1 min

  // 1. Create
  const created = await createSessionRecord(sessionId, expiresAt, nonce);
  assert.strictEqual(created.status, 'pending');

  // 2. Query
  const fetched = await getSessionRecord(sessionId);
  assert.ok(fetched);
  assert.strictEqual(fetched.status, 'pending');

  // 3. Complete with invalid nonce should fail
  const failedAttempt = await markSessionVerified(sessionId, 'wrong-nonce');
  assert.strictEqual(failedAttempt.success, false);

  // 4. Complete with valid nonce
  const successAttempt = await markSessionVerified(sessionId, nonce);
  assert.strictEqual(successAttempt.success, true);

  // 5. Query after completion
  const verifiedRecord = await getSessionRecord(sessionId);
  assert.strictEqual(verifiedRecord.status, 'verified');
});

test('Session Store: marks expired session correctly', async () => {
  const sessionId = 'session-expired-xyz';
  const nonce = 'nonce-xyz';
  const expiresAt = new Date(Date.now() - 1000); // expired 1s ago

  await createSessionRecord(sessionId, expiresAt, nonce);
  const fetched = await getSessionRecord(sessionId);
  assert.strictEqual(fetched.status, 'expired');

  // Cannot complete expired session
  const completeRes = await markSessionVerified(sessionId, nonce);
  assert.strictEqual(completeRes.success, false);
});
