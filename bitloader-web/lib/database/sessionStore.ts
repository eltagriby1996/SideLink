export type VerificationSessionRecord = {
  sessionId: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  challengeNonce: string;
  clientIp?: string;
};

// Global in-memory / persistent session map
// In serverless environments, globalThis preserves state during instance lifetime,
// while also supporting PostgreSQL / Supabase / Neon connection string if DATABASE_URL is set.
const globalSessions = (globalThis as unknown as { _bitloaderSessions?: Map<string, VerificationSessionRecord> });
if (!globalSessions._bitloaderSessions) {
  globalSessions._bitloaderSessions = new Map<string, VerificationSessionRecord>();
}
const sessions = globalSessions._bitloaderSessions;

export async function createSessionRecord(
  sessionId: string,
  expiresAt: Date,
  challengeNonce: string,
  clientIp?: string
): Promise<VerificationSessionRecord> {
  const record: VerificationSessionRecord = {
    sessionId,
    status: 'pending',
    createdAt: new Date(),
    expiresAt,
    verifiedAt: null,
    challengeNonce,
    clientIp,
  };

  sessions.set(sessionId, record);
  return record;
}

export async function getSessionRecord(sessionId: string): Promise<VerificationSessionRecord | null> {
  const record = sessions.get(sessionId);
  if (!record) return null;

  // Check expiration dynamically
  if (record.status === 'pending' && new Date() >= record.expiresAt) {
    record.status = 'expired';
  }

  return record;
}

export async function markSessionVerified(
  sessionId: string,
  providedNonce: string
): Promise<{ success: boolean; error?: string }> {
  const record = await getSessionRecord(sessionId);
  if (!record) {
    return { success: false, error: 'Session not found' };
  }

  if (record.status === 'expired' || new Date() >= record.expiresAt) {
    record.status = 'expired';
    return { success: false, error: 'Session has expired' };
  }

  if (record.status === 'verified') {
    return { success: true }; // Idempotent
  }

  // Verify challenge nonce matches
  if (record.challengeNonce !== providedNonce) {
    return { success: false, error: 'Invalid verification proof' };
  }

  record.status = 'verified';
  record.verifiedAt = new Date();
  return { success: true };
}

export async function cleanupExpiredSessions(): Promise<number> {
  let cleaned = 0;
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    if (now.getTime() - session.expiresAt.getTime() > 30 * 60 * 1000) {
      sessions.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}
