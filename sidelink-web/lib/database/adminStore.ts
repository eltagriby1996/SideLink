import {
  dbInstance,
  RemoteConfig,
  AdsConfig,
  CuratedIpa,
  VipKey,
  BlacklistedIp,
  TelemetryEvent,
  VerificationSessionRecord,
} from './db';

export type { RemoteConfig, AdsConfig, CuratedIpa, VipKey, BlacklistedIp, TelemetryEvent };

// Config Methods
export function getRemoteConfig(): RemoteConfig {
  return { ...dbInstance.getDb().config };
}

export function updateRemoteConfig(partial: Partial<RemoteConfig>): RemoteConfig {
  const db = dbInstance.getDb();
  db.config = {
    ...db.config,
    ...partial,
    broadcastBanner: {
      ...db.config.broadcastBanner,
      ...(partial.broadcastBanner || {}),
    },
  };
  dbInstance.save();
  return db.config;
}

// Ads Management Methods
export function getAdsConfig(): AdsConfig {
  const db = dbInstance.getDb();
  if (!db.ads) {
    db.ads = {
      enabled: true,
      topBannerHtml: '',
      bottomBannerHtml: '',
      popunderScript: '<script data-cfasync="false" src="https://accountut.com/1/0a6dadbbf05fcfc44cee6a5e531224e6"></script>',
      socialBarScript: '<script data-cfasync="false" src="https://bellnewyork.org/14/f504848a82ca24d1bee310ac6e6d8991"></script>',
      smartlinkUrl: 'https://ardance.org/4/8a4e54806bf1d2e4984078c43efd8205',
      openSmartlinkOnVerify: true,
      adCountdownSeconds: 0,
    };
    dbInstance.save();
  }
  return { ...db.ads };
}

export function updateAdsConfig(partial: Partial<AdsConfig>): AdsConfig {
  const db = dbInstance.getDb();
  const current = getAdsConfig();
  db.ads = {
    ...current,
    ...partial,
  };
  dbInstance.save();
  return { ...db.ads };
}

// Curated IPAs Methods
export function getCuratedIpas(): CuratedIpa[] {
  return [...dbInstance.getDb().ipas];
}

export function addCuratedIpa(ipa: Omit<CuratedIpa, 'id' | 'downloadsCount' | 'createdAt'>): CuratedIpa {
  const db = dbInstance.getDb();
  const newIpa: CuratedIpa = {
    ...ipa,
    id: 'ipa-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    downloadsCount: 0,
    createdAt: new Date().toISOString(),
  };
  db.ipas.unshift(newIpa);
  dbInstance.save();
  return newIpa;
}

export function updateCuratedIpa(id: string, partial: Partial<CuratedIpa>): CuratedIpa | null {
  const db = dbInstance.getDb();
  const idx = db.ipas.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  db.ipas[idx] = { ...db.ipas[idx], ...partial };
  dbInstance.save();
  return db.ipas[idx];
}

export function deleteCuratedIpa(id: string): boolean {
  const db = dbInstance.getDb();
  const initialLen = db.ipas.length;
  db.ipas = db.ipas.filter((i) => i.id !== id);
  const deleted = db.ipas.length < initialLen;
  if (deleted) dbInstance.save();
  return deleted;
}

export function incrementIpaDownload(id: string): boolean {
  const db = dbInstance.getDb();
  const ipa = db.ipas.find((i) => i.id === id);
  if (!ipa) return false;
  ipa.downloadsCount += 1;
  dbInstance.save();
  return true;
}

// VIP Keys Methods
export function getVipKeys(): VipKey[] {
  return [...dbInstance.getDb().vipKeys];
}

export async function generateVipKey(params: {
  key?: string;
  note: string;
  expiresInDays?: number | null;
  maxUses?: number;
}): Promise<VipKey> {
  const db = dbInstance.getDb();
  let key = params.key?.trim().toUpperCase();
  if (!key) {
    const randomPart = Array.from({ length: 3 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    ).join('-');
    key = `SL-VIP-${randomPart}`;
  }

  const vipKey: VipKey = {
    key,
    note: params.note || 'مفتاح ترخيص مخصص',
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null,
    usedCount: 0,
    maxUses: params.maxUses ?? 0,
    isActive: true,
  };

  db.vipKeys = db.vipKeys.filter(k => k.key.toUpperCase() !== key);
  db.vipKeys.unshift(vipKey);
  await dbInstance.saveAsync();
  return vipKey;
}

export async function revokeVipKey(key: string): Promise<boolean> {
  const db = dbInstance.getDb();
  const cleanKey = key.trim().toUpperCase();
  let item = db.vipKeys.find((k) => k.key.toUpperCase() === cleanKey);
  if (!item) {
    item = {
      key: cleanKey,
      note: 'مفتاح تم إيقافه من الإدارة',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      usedCount: 0,
      maxUses: 0,
      isActive: false,
    };
    db.vipKeys.unshift(item);
  } else {
    item.isActive = false;
  }
  await dbInstance.saveAsync();
  return true;
}

export async function activateVipKey(key: string): Promise<boolean> {
  const db = dbInstance.getDb();
  const cleanKey = key.trim().toUpperCase();
  let item = db.vipKeys.find((k) => k.key.toUpperCase() === cleanKey);
  if (!item) {
    item = {
      key: cleanKey,
      note: 'مفتاح معاد تفعيله من الإدارة',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      usedCount: 0,
      maxUses: 0,
      isActive: true,
    };
    db.vipKeys.unshift(item);
  } else {
    item.isActive = true;
  }
  await dbInstance.saveAsync();
  return true;
}

export async function deleteVipKey(key: string): Promise<boolean> {
  const db = dbInstance.getDb();
  const cleanKey = key.trim().toUpperCase();
  const initLen = db.vipKeys.length;
  db.vipKeys = db.vipKeys.filter((k) => k.key.toUpperCase() !== cleanKey);
  const deleted = db.vipKeys.length < initLen;
  if (deleted) await dbInstance.saveAsync();
  return deleted;
}

export async function validateVipKey(key: string): Promise<{ isValid: boolean; reason?: string }> {
  const db = dbInstance.getDb();
  const cleanKey = key.trim().toUpperCase();
  const isVipFormat = /^SL-VIP(-[A-Z0-9]{3,8}){2,4}$/i.test(cleanKey) || cleanKey.startsWith('SL-VIP-');

  let found = db.vipKeys.find((k) => k.key.toUpperCase() === cleanKey);

  if (!found) {
    await dbInstance.refreshFromCloud();
    found = dbInstance.getDb().vipKeys.find((k) => k.key.toUpperCase() === cleanKey);
  }

  if (found) {
    if (!found.isActive) {
      return { isValid: false, reason: 'تم تعطيل هذا المفتاح من قبل الإدارة.' };
    }
    if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
      return { isValid: false, reason: 'انتهت صلاحية هذا المفتاح.' };
    }
    if (found.maxUses > 0 && found.usedCount >= found.maxUses) {
      return { isValid: false, reason: 'تم استهلاك الحد الأقصى لاستخدام هذا المفتاح.' };
    }

    found.usedCount += 1;
    await dbInstance.saveAsync();
    return { isValid: true };
  }

  // If key matches SideLink VIP format, auto-register as active lifetime key
  if (isVipFormat) {
    const newKey: VipKey = {
      key: cleanKey,
      note: 'مفتاح VIP نشط ومعتمد',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      usedCount: 1,
      maxUses: 0,
      isActive: true,
    };
    db.vipKeys.unshift(newKey);
    await dbInstance.saveAsync();
    return { isValid: true };
  }

  return { isValid: false, reason: 'مفتاح الـ VIP غير موجود أو غير صالح.' };
}

export async function checkVipKeyStatus(key: string): Promise<{ isValid: boolean; reason?: string }> {
  const db = dbInstance.getDb();
  const cleanKey = key.trim().toUpperCase();
  const isVipFormat = /^SL-VIP(-[A-Z0-9]{3,8}){2,4}$/i.test(cleanKey) || cleanKey.startsWith('SL-VIP-');

  let found = db.vipKeys.find((k) => k.key.toUpperCase() === cleanKey);

  if (!found) {
    await dbInstance.refreshFromCloud();
    found = dbInstance.getDb().vipKeys.find((k) => k.key.toUpperCase() === cleanKey);
  }

  if (found) {
    if (!found.isActive) {
      return { isValid: false, reason: 'تم تعطيل هذا المفتاح من قبل الإدارة.' };
    }
    if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
      return { isValid: false, reason: 'انتهت صلاحية هذا المفتاح.' };
    }
    if (found.maxUses > 0 && found.usedCount > found.maxUses) {
      return { isValid: false, reason: 'تم استهلاك الحد الأقصى لاستخدام هذا المفتاح.' };
    }
    return { isValid: true };
  }

  if (isVipFormat) {
    return { isValid: true };
  }

  return { isValid: false, reason: 'مفتاح الـ VIP غير موجود أو تم حذفه من قبل الإدارة.' };
}

// Blacklist Methods
export function getBlacklist(): BlacklistedIp[] {
  return [...dbInstance.getDb().blacklist];
}

export function addBlacklistIp(ip: string, reason: string): BlacklistedIp {
  const db = dbInstance.getDb();
  const cleanIp = ip.trim();
  const existing = db.blacklist.find((b) => b.ip === cleanIp);
  if (existing) {
    existing.reason = reason;
    existing.blockedAt = new Date().toISOString();
    dbInstance.save();
    return existing;
  }
  const item: BlacklistedIp = {
    ip: cleanIp,
    reason: reason || 'حظر يدوي من الإدارة',
    blockedAt: new Date().toISOString(),
  };
  db.blacklist.unshift(item);
  dbInstance.save();
  return item;
}

export function removeBlacklistIp(ip: string): boolean {
  const db = dbInstance.getDb();
  const cleanIp = ip.trim();
  const init = db.blacklist.length;
  db.blacklist = db.blacklist.filter((b) => b.ip !== cleanIp);
  const deleted = db.blacklist.length < init;
  if (deleted) dbInstance.save();
  return deleted;
}

export function isIpBlocked(ip: string): boolean {
  return dbInstance.getDb().blacklist.some((b) => b.ip === ip.trim());
}

// Telemetry & Error Reports Methods
export function recordTelemetryEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): TelemetryEvent {
  const db = dbInstance.getDb();
  const newEvt: TelemetryEvent = {
    ...event,
    id: 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  };
  db.telemetry.unshift(newEvt);
  if (db.telemetry.length > 1000) {
    db.telemetry = db.telemetry.slice(0, 1000);
  }
  dbInstance.save();
  return newEvt;
}

export function getTelemetryEvents(limit = 100): TelemetryEvent[] {
  return dbInstance.getDb().telemetry.slice(0, limit);
}

export function clearTelemetryEvents(): void {
  const db = dbInstance.getDb();
  db.telemetry = [];
  dbInstance.save();
}

// Overall Admin Stats
export function getAdminStats(sessions: VerificationSessionRecord[]) {
  const db = dbInstance.getDb();
  const totalSessions = sessions.length;
  const verifiedSessions = sessions.filter((s) => s.status === 'verified').length;
  const pendingSessions = sessions.filter((s) => s.status === 'pending').length;
  const expiredSessions = sessions.filter((s) => s.status === 'expired').length;

  const totalIpaDownloads = db.ipas.reduce((sum, i) => sum + i.downloadsCount, 0);
  const activeVipKeys = db.vipKeys.filter((k) => k.isActive).length;
  const totalBlockedIps = db.blacklist.length;

  const totalErrors = db.telemetry.filter((e) => e.status === 'error').length;
  const totalSuccesses = db.telemetry.filter((e) => e.status === 'success').length;

  // iOS Versions breakdown
  const iosVersionsMap: Record<string, number> = {};
  const deviceModelsMap: Record<string, number> = {};
  const errorCodesMap: Record<string, number> = {};

  db.telemetry.forEach((t) => {
    if (t.iosVersion) iosVersionsMap[t.iosVersion] = (iosVersionsMap[t.iosVersion] || 0) + 1;
    if (t.deviceModel) deviceModelsMap[t.deviceModel] = (deviceModelsMap[t.deviceModel] || 0) + 1;
    if (t.errorCode) errorCodesMap[t.errorCode] = (errorCodesMap[t.errorCode] || 0) + 1;
  });

  return {
    verification: {
      total: totalSessions,
      verified: verifiedSessions,
      pending: pendingSessions,
      expired: expiredSessions,
      rate: totalSessions > 0 ? Math.round((verifiedSessions / totalSessions) * 100) : 100,
    },
    remoteConfig: db.config,
    ipasCount: db.ipas.length,
    totalIpaDownloads,
    activeVipKeys,
    totalBlockedIps,
    telemetry: {
      totalErrors,
      totalSuccesses,
      iosVersions: iosVersionsMap,
      deviceModels: deviceModelsMap,
      errorCodes: errorCodesMap,
    },
  };
}
