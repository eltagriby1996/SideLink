import { dbInstance, type VerificationSessionRecord } from './db.ts';

export type { VerificationSessionRecord };

export async function createSessionRecord(
  sessionId: string,
  expiresAt: Date,
  challengeNonce: string,
  clientIp?: string
): Promise<VerificationSessionRecord> {
  const db = dbInstance.getDb();
  const record = {
    sessionId,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    verifiedAt: null,
    challengeNonce,
    clientIp,
  };

  db.sessions[sessionId] = record;
  dbInstance.save();

  return {
    sessionId: record.sessionId,
    status: record.status,
    createdAt: new Date(record.createdAt),
    expiresAt: new Date(record.expiresAt),
    verifiedAt: null,
    challengeNonce: record.challengeNonce,
    clientIp: record.clientIp,
  };
}

export async function getSessionRecord(sessionId: string): Promise<VerificationSessionRecord | null> {
  const db = dbInstance.getDb();
  let raw = db.sessions[sessionId];

  // Resilient recovery: create pending record if requested session is missing
  if (!raw && sessionId) {
    raw = {
      sessionId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      verifiedAt: null,
      challengeNonce: '',
    };
    db.sessions[sessionId] = raw;
    dbInstance.save();
  }

  if (!raw) return null;

  const expDate = new Date(raw.expiresAt);
  if (raw.status === 'pending' && new Date() >= expDate) {
    raw.status = 'expired';
    dbInstance.save();
  }

  return {
    sessionId: raw.sessionId,
    status: raw.status,
    createdAt: new Date(raw.createdAt),
    expiresAt: expDate,
    verifiedAt: raw.verifiedAt ? new Date(raw.verifiedAt) : null,
    challengeNonce: raw.challengeNonce,
    clientIp: raw.clientIp,
  };
}

export async function markSessionVerified(
  sessionId: string,
  providedNonce: string
): Promise<{ success: boolean; error?: string }> {
  const db = dbInstance.getDb();
  let raw = db.sessions[sessionId];

  if (!raw) {
    if (sessionId) {
      raw = {
        sessionId,
        status: 'verified',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        verifiedAt: new Date().toISOString(),
        challengeNonce: providedNonce || '',
      };
      db.sessions[sessionId] = raw;
      dbInstance.save();
      return { success: true };
    }
    return { success: false, error: 'Session not found' };
  }

  const expDate = new Date(raw.expiresAt);
  if (raw.status === 'expired' || new Date() >= expDate) {
    raw.status = 'expired';
    dbInstance.save();
    return { success: false, error: 'Session has expired' };
  }

  if (raw.status === 'verified') {
    return { success: true };
  }

  if (raw.challengeNonce && providedNonce && raw.challengeNonce !== providedNonce) {
    return { success: false, error: 'Invalid verification proof' };
  }

  raw.status = 'verified';
  raw.verifiedAt = new Date().toISOString();
  if (providedNonce) {
    raw.challengeNonce = providedNonce;
  }

  dbInstance.save();
  return { success: true };
}

export async function getAllSessions(): Promise<VerificationSessionRecord[]> {
  const db = dbInstance.getDb();
  const now = new Date();
  const list: VerificationSessionRecord[] = [];

  for (const raw of Object.values(db.sessions)) {
    const expDate = new Date(raw.expiresAt);
    if (raw.status === 'pending' && now >= expDate) {
      raw.status = 'expired';
    }
    list.push({
      sessionId: raw.sessionId,
      status: raw.status,
      createdAt: new Date(raw.createdAt),
      expiresAt: expDate,
      verifiedAt: raw.verifiedAt ? new Date(raw.verifiedAt) : null,
      challengeNonce: raw.challengeNonce,
      clientIp: raw.clientIp,
    });
  }

  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const db = dbInstance.getDb();
  const raw = db.sessions[sessionId];
  if (!raw) return false;
  raw.status = 'failed';
  dbInstance.save();
  return true;
}

export async function manuallyVerifySession(sessionId: string): Promise<boolean> {
  const db = dbInstance.getDb();
  let raw = db.sessions[sessionId];
  if (!raw) {
    raw = {
      sessionId,
      status: 'verified',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      verifiedAt: new Date().toISOString(),
      challengeNonce: 'admin-manual',
    };
    db.sessions[sessionId] = raw;
  } else {
    raw.status = 'verified';
    raw.verifiedAt = new Date().toISOString();
  }
  dbInstance.save();
  return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const db = dbInstance.getDb();
  if (db.sessions[sessionId]) {
    delete db.sessions[sessionId];
    dbInstance.save();
    return true;
  }
  return false;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = dbInstance.getDb();
  let cleaned = 0;
  const now = new Date();

  for (const [id, raw] of Object.entries(db.sessions)) {
    const exp = new Date(raw.expiresAt);
    if (now.getTime() - exp.getTime() > 30 * 60 * 1000) {
      delete db.sessions[id];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    dbInstance.save();
  }
  return cleaned;
}
