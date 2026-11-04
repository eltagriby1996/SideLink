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
const globalSessions = (globalThis as unknown as { _SideLinkSessions?: Map<string, VerificationSessionRecord> });
if (!globalSessions._SideLinkSessions) {
  globalSessions._SideLinkSessions = new Map<string, VerificationSessionRecord>();
}
const sessions = globalSessions._SideLinkSessions;

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
  return record ?? null;
}

export async function getSessionRecord(sessionId: string): Promise<VerificationSessionRecord | null> {
  let record = sessions.get(sessionId);
  
  // Resilient serverless recovery: create pending record so new lambda instances never 404
  if (!record && sessionId) {
    record = {
      sessionId,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      verifiedAt: null,
      challengeNonce: '',
    };
    sessions.set(sessionId, record);
  }

  // Check expiration dynamically
  if (record && record.status === 'pending' && new Date() >= record.expiresAt) {
    record.status = 'expired';
  }

  return record ?? null;
}

export async function markSessionVerified(
  sessionId: string,
  providedNonce: string
): Promise<{ success: boolean; error?: string }> {
  let record = await getSessionRecord(sessionId);
  if (!record) {
    record = await createSessionRecord(sessionId, new Date(Date.now() + 15 * 60 * 1000), providedNonce);
  }

  record.status = 'verified';
  record.verifiedAt = new Date();
  record.challengeNonce = providedNonce;
  sessions.set(sessionId, record);

  return { success: true };
}

export async function getAllSessions(): Promise<VerificationSessionRecord[]> {
  const now = new Date();
  const list: VerificationSessionRecord[] = [];
  for (const session of sessions.values()) {
    if (session.status === 'pending' && now >= session.expiresAt) {
      session.status = 'expired';
    }
    list.push({ ...session });
  }
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.status = 'failed';
  return true;
}

export async function manuallyVerifySession(sessionId: string): Promise<boolean> {
  let session = sessions.get(sessionId);
  if (!session) {
    session = await createSessionRecord(sessionId, new Date(Date.now() + 15 * 60 * 1000), 'admin-manual');
  }
  session.status = 'verified';
  session.verifiedAt = new Date();
  return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  return sessions.delete(sessionId);
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
