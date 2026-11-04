import { VerificationSessionRecord } from './sessionStore';

export interface RemoteConfig {
  isVerificationEnabled: boolean;
  maintenanceMode: boolean;
  emergencyKillSwitch: boolean;
  killSwitchMessage: string;
  latestVersion: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
  broadcastBanner: {
    enabled: boolean;
    message: string;
    type: 'info' | 'warning' | 'success' | 'danger';
    link?: string;
    linkText?: string;
  };
}

export interface CuratedIpa {
  id: string;
  name: string;
  bundleId: string;
  version: string;
  iconUrl: string;
  downloadUrl: string;
  sizeMb: number;
  category: 'Music' | 'Social' | 'Games' | 'Utilities' | 'Emulators';
  description: string;
  downloadsCount: number;
  isFeatured: boolean;
  createdAt: string;
}

export interface VipKey {
  key: string;
  note: string;
  createdAt: string;
  expiresAt: string | null; // null = lifetime
  usedCount: number;
  maxUses: number; // 0 = unlimited
  isActive: boolean;
}

export interface BlacklistedIp {
  ip: string;
  reason: string;
  blockedAt: string;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  clientVersion: string;
  deviceModel: string;
  iosVersion: string;
  action: 'sign_app' | 'install_app' | 'refresh_apps' | 'app_launch';
  status: 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
  clientIp?: string;
}

interface AdminGlobalStore {
  config: RemoteConfig;
  ipas: CuratedIpa[];
  vipKeys: VipKey[];
  blacklist: BlacklistedIp[];
  telemetry: TelemetryEvent[];
}

const globalAdmin = globalThis as unknown as { _SideLinkAdminStore?: AdminGlobalStore };

if (!globalAdmin._SideLinkAdminStore) {
  globalAdmin._SideLinkAdminStore = {
    config: {
      isVerificationEnabled: true,
      maintenanceMode: false,
      emergencyKillSwitch: false,
      killSwitchMessage: 'تطبيق SideLink متوقف مؤقتاً لأعمال الصيانة والتطوير الأمني. سنعود للعمل قريباً.',
      latestVersion: '1.0.0',
      downloadUrl: '/downloads/SideLink-v1.0.0-win-x64.zip',
      forceUpdate: false,
      releaseNotes: 'الإصدار الأول المستقر: دعم توقيع وتثبيت تطبيقات iOS بحسابات أبل الشخصية، مع شهادات RSA PKCS#8 ونظام التجديد التلقائي.',
      broadcastBanner: {
        enabled: true,
        message: 'مرحباً بكم في SideLink v1.0.0! تم تفعيل دعم التوقيع الفوري لكافة أجهزة iOS 15 - 18.2.',
        type: 'info',
        link: 'https://github.com/eltagriby1996/SideLink',
        linkText: 'عرض التحديثات',
      },
    },
    ipas: [
      {
        id: 'spotify-plus',
        name: 'Spotify++',
        bundleId: 'com.spotify.client',
        version: '9.0.56',
        iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
        downloadUrl: 'https://github.com/eltagriby1996/SideLink/releases/download/v1.0.0/Spotify.ipa',
        sizeMb: 80.8,
        category: 'Music',
        description: 'نسخة معدلة من سبوتيفاي تدعم تخطي الإعلانات، جودة الصوت القصوى، والتخطي غير المحدود للأغاني.',
        downloadsCount: 1420,
        isFeatured: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'uyou-plus',
        name: 'YouTube uYouEnhanced',
        bundleId: 'com.google.ios.youtube',
        version: '19.45.2',
        iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
        downloadUrl: 'https://github.com/qnblackcat/uYouPlus/releases/latest',
        sizeMb: 125.4,
        category: 'Social',
        description: 'يوتيوب بلس مع حظر الإعلانات، التشغيل في الخلفية، خاصية صورة داخل صورة (PiP)، وتنزيل الفيديوهات بدقة عالية.',
        downloadsCount: 2890,
        isFeatured: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'delta-emulator',
        name: 'Delta Game Emulator',
        bundleId: 'com.rileytestut.Delta',
        version: '1.6.2',
        iconUrl: 'https://deltaemulator.com/assets/images/delta-icon.png',
        downloadUrl: 'https://github.com/rileytestut/Delta/releases/latest',
        sizeMb: 58.2,
        category: 'Emulators',
        description: 'أقوى محاكي ألعاب ريترو لأجهزة iOS: يدعم GBA, GBC, SNES, N64, Nintendo DS بجودة عالية وحفظ تلقائي.',
        downloadsCount: 1980,
        isFeatured: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sidestore',
        name: 'SideStore Community',
        bundleId: 'com.SideStore.SideStore',
        version: '0.5.8',
        iconUrl: 'https://sidestore.io/images/logo.png',
        downloadUrl: 'https://github.com/SideStore/SideStore/releases/latest',
        sizeMb: 24.1,
        category: 'Utilities',
        description: 'متجر التثبيت الذاتي على الآيفون عبر الـ WireGuard VPN بدون الحاجة لجهاز كمبيوتر متصل دائماً.',
        downloadsCount: 3410,
        isFeatured: false,
        createdAt: new Date().toISOString(),
      },
    ],
    vipKeys: [
      {
        key: 'SL-VIP-PRO-2026-X77',
        note: 'مفتاح المطور الأساسي (Lifetime Master Key)',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        usedCount: 1,
        maxUses: 0,
        isActive: true,
      },
      {
        key: 'SL-VIP-BETA-TEST-99',
        note: 'كود تجريبي لمجتمع المطورين',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usedCount: 4,
        maxUses: 50,
        isActive: true,
      },
    ],
    blacklist: [
      {
        ip: '198.51.100.24',
        reason: 'محاولات متكررة لإرسال سبام إلى سيرفر التحقق',
        blockedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
    ],
    telemetry: [
      {
        id: 'evt-1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        clientVersion: '1.0.0',
        deviceModel: 'iPhone 15 Pro Max',
        iosVersion: '18.1',
        action: 'sign_app',
        status: 'success',
        clientIp: '197.34.12.80',
      },
      {
        id: 'evt-2',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        clientVersion: '1.0.0',
        deviceModel: 'iPhone 13',
        iosVersion: '17.6.1',
        action: 'install_app',
        status: 'success',
        clientIp: '156.204.18.99',
      },
      {
        id: 'evt-3',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        clientVersion: '1.0.0',
        deviceModel: 'iPhone 12 Pro',
        iosVersion: '16.7.2',
        action: 'sign_app',
        status: 'error',
        errorCode: '0xe8008001',
        errorMessage: 'ApplicationVerificationFailed: Code signature mismatch',
        clientIp: '102.188.42.11',
      },
    ],
  };
}

const store = globalAdmin._SideLinkAdminStore;

// Config Methods
export function getRemoteConfig(): RemoteConfig {
  return { ...store.config };
}

export function updateRemoteConfig(partial: Partial<RemoteConfig>): RemoteConfig {
  store.config = {
    ...store.config,
    ...partial,
    broadcastBanner: {
      ...store.config.broadcastBanner,
      ...(partial.broadcastBanner || {}),
    },
  };
  return store.config;
}

// Curated IPAs Methods
export function getCuratedIpas(): CuratedIpa[] {
  return [...store.ipas];
}

export function addCuratedIpa(ipa: Omit<CuratedIpa, 'id' | 'downloadsCount' | 'createdAt'>): CuratedIpa {
  const newIpa: CuratedIpa = {
    ...ipa,
    id: 'ipa-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    downloadsCount: 0,
    createdAt: new Date().toISOString(),
  };
  store.ipas.unshift(newIpa);
  return newIpa;
}

export function updateCuratedIpa(id: string, partial: Partial<CuratedIpa>): CuratedIpa | null {
  const idx = store.ipas.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  store.ipas[idx] = { ...store.ipas[idx], ...partial };
  return store.ipas[idx];
}

export function deleteCuratedIpa(id: string): boolean {
  const initialLen = store.ipas.length;
  store.ipas = store.ipas.filter((i) => i.id !== id);
  return store.ipas.length < initialLen;
}

export function incrementIpaDownload(id: string): boolean {
  const ipa = store.ipas.find((i) => i.id === id);
  if (!ipa) return false;
  ipa.downloadsCount += 1;
  return true;
}

// VIP Keys Methods
export function getVipKeys(): VipKey[] {
  return [...store.vipKeys];
}

export function generateVipKey(params: {
  note: string;
  expiresInDays?: number | null;
  maxUses?: number;
}): VipKey {
  const randomPart = Array.from({ length: 3 }, () =>
    Math.random().toString(36).substring(2, 6).toUpperCase()
  ).join('-');
  const key = `SL-VIP-${randomPart}`;

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

  store.vipKeys.unshift(vipKey);
  return vipKey;
}

export function revokeVipKey(key: string): boolean {
  const item = store.vipKeys.find((k) => k.key === key);
  if (!item) return false;
  item.isActive = false;
  return true;
}

export function deleteVipKey(key: string): boolean {
  const initLen = store.vipKeys.length;
  store.vipKeys = store.vipKeys.filter((k) => k.key !== key);
  return store.vipKeys.length < initLen;
}

export function validateVipKey(key: string): { isValid: boolean; reason?: string } {
  const cleanKey = key.trim().toUpperCase();
  const found = store.vipKeys.find((k) => k.key === cleanKey);

  if (!found) {
    return { isValid: false, reason: 'مفتاح الـ VIP غير موجود أو غير صالح.' };
  }
  if (!found.isActive) {
    return { isValid: false, reason: 'تم إيقاف هذا المفتاح من قبل الإدارة.' };
  }
  if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
    return { isValid: false, reason: 'انتهت صلاحية هذا المفتاح.' };
  }
  if (found.maxUses > 0 && found.usedCount >= found.maxUses) {
    return { isValid: false, reason: 'تم استهلاك الحد الأقصى لاستخدام هذا المفتاح.' };
  }

  found.usedCount += 1;
  return { isValid: true };
}

// Blacklist Methods
export function getBlacklist(): BlacklistedIp[] {
  return [...store.blacklist];
}

export function addBlacklistIp(ip: string, reason: string): BlacklistedIp {
  const cleanIp = ip.trim();
  const existing = store.blacklist.find((b) => b.ip === cleanIp);
  if (existing) {
    existing.reason = reason;
    existing.blockedAt = new Date().toISOString();
    return existing;
  }
  const item: BlacklistedIp = {
    ip: cleanIp,
    reason: reason || 'حظر يدوي من الإدارة',
    blockedAt: new Date().toISOString(),
  };
  store.blacklist.unshift(item);
  return item;
}

export function removeBlacklistIp(ip: string): boolean {
  const cleanIp = ip.trim();
  const init = store.blacklist.length;
  store.blacklist = store.blacklist.filter((b) => b.ip !== cleanIp);
  return store.blacklist.length < init;
}

export function isIpBlocked(ip: string): boolean {
  return store.blacklist.some((b) => b.ip === ip.trim());
}

// Telemetry & Error Reports Methods
export function recordTelemetryEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): TelemetryEvent {
  const newEvt: TelemetryEvent = {
    ...event,
    id: 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  };
  store.telemetry.unshift(newEvt);
  // Keep last 1000 events
  if (store.telemetry.length > 1000) {
    store.telemetry = store.telemetry.slice(0, 1000);
  }
  return newEvt;
}

export function getTelemetryEvents(limit = 100): TelemetryEvent[] {
  return store.telemetry.slice(0, limit);
}

export function clearTelemetryEvents(): void {
  store.telemetry = [];
}

// Overall Admin Stats
export function getAdminStats(sessions: VerificationSessionRecord[]) {
  const totalSessions = sessions.length;
  const verifiedSessions = sessions.filter((s) => s.status === 'verified').length;
  const pendingSessions = sessions.filter((s) => s.status === 'pending').length;
  const expiredSessions = sessions.filter((s) => s.status === 'expired').length;

  const totalIpaDownloads = store.ipas.reduce((sum, i) => sum + i.downloadsCount, 0);
  const activeVipKeys = store.vipKeys.filter((k) => k.isActive).length;
  const totalBlockedIps = store.blacklist.length;

  const totalErrors = store.telemetry.filter((e) => e.status === 'error').length;
  const totalSuccesses = store.telemetry.filter((e) => e.status === 'success').length;

  // iOS Versions breakdown
  const iosVersionsMap: Record<string, number> = {};
  const deviceModelsMap: Record<string, number> = {};
  const errorCodesMap: Record<string, number> = {};

  store.telemetry.forEach((t) => {
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
    remoteConfig: store.config,
    ipasCount: store.ipas.length,
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
