import fs from 'fs';
import path from 'path';
import os from 'os';

export interface AdsConfig {
  enabled: boolean;
  topBannerHtml: string;
  bottomBannerHtml: string;
  popunderScript: string;
  socialBarScript: string;
  smartlinkUrl: string;
  openSmartlinkOnVerify: boolean;
  adCountdownSeconds: number;
}

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
  expiresAt: string | null;
  usedCount: number;
  maxUses: number;
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
  action: string;
  status: 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
  clientIp?: string;
}

export interface VerificationSessionRecord {
  sessionId: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  challengeNonce: string;
  clientIp?: string;
}

interface RawStoredSession {
  sessionId: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  challengeNonce: string;
  clientIp?: string;
}

export interface DatabaseSchema {
  config: RemoteConfig;
  ads: AdsConfig;
  sessions: Record<string, RawStoredSession>;
  ipas: CuratedIpa[];
  vipKeys: VipKey[];
  blacklist: BlacklistedIp[];
  telemetry: TelemetryEvent[];
}

function getDefaultDatabase(): DatabaseSchema {
  return {
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
    ads: {
      enabled: true,
      topBannerHtml: '',
      bottomBannerHtml: '',
      popunderScript: '',
      socialBarScript: '',
      smartlinkUrl: '',
      openSmartlinkOnVerify: false,
      adCountdownSeconds: 0,
    },
    sessions: {},
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
        description: 'نسخة سبوتيفاي المعدلة مع تخطي الإعلانات وجودة الصوت القصوى بدون قيود.',
        downloadsCount: 0,
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
        description: 'متجر التثبيت الذاتي والتجديد التلقائي عبر WireGuard VPN بدون حاسوب.',
        downloadsCount: 0,
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
        description: 'يوتيوب بدون إعلانات مع تشغيل في الخلفية وصورة داخل صورة وتنزيل المقاطع.',
        downloadsCount: 0,
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
        description: 'أفضل محاكي ألعاب ريترو لأجهزة iOS: يدعم GBA, GBC, SNES, N64, Nintendo DS.',
        downloadsCount: 0,
        isFeatured: false,
        createdAt: new Date().toISOString(),
      },
    ],
    vipKeys: [
      {
        key: 'SL-VIP-MASTER-2026',
        note: 'مفتاح المطور الأساسي الدائم (Master Lifetime Key)',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        usedCount: 0,
        maxUses: 0,
        isActive: true,
      },
    ],
    blacklist: [],
    telemetry: [],
  };
}

class PersistentDatabase {
  private dbPath: string;
  private data: DatabaseSchema;
  private isMemoryOnly = false;

  constructor() {
    let primaryDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(path.join(process.cwd(), 'sidelink-web'))) {
      primaryDir = path.join(process.cwd(), 'sidelink-web', 'data');
    }
    const primaryPath = path.join(primaryDir, 'sidelink-db.json');

    try {
      if (!fs.existsSync(primaryDir)) {
        fs.mkdirSync(primaryDir, { recursive: true });
      }
      this.dbPath = primaryPath;
    } catch {
      // Fallback to OS temp dir if filesystem is read-only
      this.dbPath = path.join(os.tmpdir(), 'sidelink-db.json');
    }

    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        // Merge with defaults in case of missing keys
        const def = getDefaultDatabase();
        return {
          config: { ...def.config, ...(parsed.config || {}) },
          ads: { ...def.ads, ...(parsed.ads || {}) },
          sessions: parsed.sessions || {},
          ipas: Array.isArray(parsed.ipas) ? parsed.ipas : def.ipas,
          vipKeys: Array.isArray(parsed.vipKeys) ? parsed.vipKeys : def.vipKeys,
          blacklist: Array.isArray(parsed.blacklist) ? parsed.blacklist : [],
          telemetry: Array.isArray(parsed.telemetry) ? parsed.telemetry : [],
        };
      }
    } catch (e) {
      console.warn('Could not read persistent db file, initializing clean database:', e);
    }

    const initial = getDefaultDatabase();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema): void {
    if (this.isMemoryOnly) return;
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.dbPath);
    } catch (e) {
      console.warn('Persistent write failed, falling back to in-memory state:', e);
      this.isMemoryOnly = true;
    }
  }

  public getDb(): DatabaseSchema {
    return this.data;
  }

  public save(): void {
    this.saveDirect(this.data);
  }
}

// Global singleton to prevent re-instantiation across hot-reloads
const globalDbHolder = globalThis as unknown as { _SideLinkDbInstance?: PersistentDatabase };
if (!globalDbHolder._SideLinkDbInstance) {
  globalDbHolder._SideLinkDbInstance = new PersistentDatabase();
}

export const dbInstance = globalDbHolder._SideLinkDbInstance;
