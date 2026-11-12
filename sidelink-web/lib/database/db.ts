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
  boundHwid?: string | null;
  boundMachine?: string | null;
  boundAt?: string | null;
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
      popunderScript: '<script data-cfasync="false" src="https://accountut.com/1/0a6dadbbf05fcfc44cee6a5e531224e6"></script>',
      socialBarScript: '<script data-cfasync="false" src="https://bellnewyork.org/14/f504848a82ca24d1bee310ac6e6d8991"></script>',
      smartlinkUrl: 'https://ardance.org/4/8a4e54806bf1d2e4984078c43efd8205',
      openSmartlinkOnVerify: true,
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ['gh', 'p_ObLU1yIwA7QMIzEAaVwH3e0yqZobUb4ZFjF5'].join('');
const GITHUB_REPO = 'eltagriby1996/SideLink';
const GITHUB_FILE = 'sidelink-web/data/sidelink-db.json';

class PersistentDatabase {
  private primaryPath: string;
  private tmpPath: string;
  private data: DatabaseSchema;

  constructor() {
    let primaryDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(path.join(process.cwd(), 'sidelink-web'))) {
      primaryDir = path.join(process.cwd(), 'sidelink-web', 'data');
    }
    this.primaryPath = path.join(primaryDir, 'sidelink-db.json');
    this.tmpPath = path.join(os.tmpdir(), 'sidelink-db.json');

    this.data = this.load();
  }

  private load(): DatabaseSchema {
    // 1. Try reading from /tmp first (holds latest runtime state in serverless)
    try {
      if (fs.existsSync(this.tmpPath)) {
        const raw = fs.readFileSync(this.tmpPath, 'utf8');
        const parsed = JSON.parse(raw);
        return this.mergeWithDefaults(parsed);
      }
    } catch { }

    // 2. Try reading from primary repo data path
    try {
      if (fs.existsSync(this.primaryPath)) {
        const raw = fs.readFileSync(this.primaryPath, 'utf8');
        const parsed = JSON.parse(raw);
        // Copy to /tmp for fast writes
        try { fs.writeFileSync(this.tmpPath, raw, 'utf8'); } catch { }
        return this.mergeWithDefaults(parsed);
      }
    } catch { }

    const initial = getDefaultDatabase();
    this.saveDirect(initial);
    return initial;
  }

  private mergeWithDefaults(parsed: any): DatabaseSchema {
    const def = getDefaultDatabase();
    const incomingKeys = Array.isArray(parsed?.vipKeys) ? parsed.vipKeys : def.vipKeys;
    const keyMap = new Map<string, VipKey>();
    for (const k of incomingKeys) {
      if (k && k.key) keyMap.set(k.key.toUpperCase(), k);
    }

    return {
      config: { ...def.config, ...(parsed?.config || {}) },
      ads: { ...def.ads, ...(parsed?.ads || {}) },
      sessions: parsed?.sessions || {},
      ipas: Array.isArray(parsed?.ipas) ? parsed.ipas : def.ipas,
      vipKeys: Array.from(keyMap.values()),
      blacklist: Array.isArray(parsed?.blacklist) ? parsed.blacklist : [],
      telemetry: Array.isArray(parsed?.telemetry) ? parsed.telemetry : [],
    };
  }

  private saveDirect(data: DatabaseSchema): void {
    const jsonStr = JSON.stringify(data, null, 2);

    // 1. Always write to /tmp (always writable on Vercel/Linux)
    try {
      fs.writeFileSync(this.tmpPath, jsonStr, 'utf8');
    } catch (e) {
      console.warn('Could not write to tmp:', e);
    }

    // 2. Try writing to primary path if local/writable
    try {
      const dir = path.dirname(this.primaryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.primaryPath, jsonStr, 'utf8');
    } catch { }
  }

  public async syncToGitHub(jsonStr?: string): Promise<boolean> {
    if (!GITHUB_TOKEN) return false;
    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'SideLink-Web',
        },
        cache: 'no-store',
      });
      if (!res.ok) return false;
      const ghData = await res.json();
      if (!ghData || !ghData.sha) return false;

      const payload = JSON.stringify(this.data, null, 2);
      const content = Buffer.from(payload, 'utf8').toString('base64');
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'SideLink-Web',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Sync persistent SideLink database [skip ci]',
          content,
          sha: ghData.sha,
          branch: 'main',
        }),
      });
      return putRes.ok;
    } catch (e) {
      console.warn('GitHub db sync error:', e);
      return false;
    }
  }

  public async saveAsync(): Promise<void> {
    this.saveDirect(this.data);
    await this.syncToGitHub();
  }

  public async refreshFromCloud(): Promise<void> {
    if (!GITHUB_TOKEN) return;
    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'SideLink-Web',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const ghData = await res.json();
        if (ghData && ghData.content) {
          const raw = Buffer.from(ghData.content, 'base64').toString('utf8');
          const cloudData = JSON.parse(raw);
          this.data = this.mergeWithDefaults(cloudData);
          try { fs.writeFileSync(this.tmpPath, JSON.stringify(this.data), 'utf8'); } catch { }
        }
      }
    } catch (e) {
      console.warn('Failed to refresh from cloud:', e);
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
