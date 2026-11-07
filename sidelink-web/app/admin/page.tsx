'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Activity,
  Layers,
  Key,
  Radio,
  Settings,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Smartphone,
  Eye,
  EyeOff,
  Bell,
  Sliders,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Flame,
  UserCheck,
  DollarSign,
  Megaphone,
  Laptop
} from 'lucide-react';

interface AdsConfigState {
  enabled: boolean;
  topBannerHtml: string;
  bottomBannerHtml: string;
  popunderScript: string;
  socialBarScript: string;
  smartlinkUrl: string;
  openSmartlinkOnVerify: boolean;
  adCountdownSeconds: number;
}

interface RemoteConfigState {
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

interface CuratedIpa {
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

interface VipKey {
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

interface BlacklistedIp {
  ip: string;
  reason: string;
  blockedAt: string;
}

interface TelemetryEvent {
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

interface VerificationSession {
  sessionId: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  clientIp?: string;
}

export default function AdminPage() {
  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'config' | 'sessions' | 'ipas' | 'vip' | 'telemetry' | 'security' | 'ads'
  >('overview');

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<RemoteConfigState | null>(null);
  const [ads, setAds] = useState<AdsConfigState>({
    enabled: true,
    topBannerHtml: '',
    bottomBannerHtml: '',
    popunderScript: '<script data-cfasync="false" src="https://accountut.com/1/0a6dadbbf05fcfc44cee6a5e531224e6"></script>',
    socialBarScript: '<script data-cfasync="false" src="https://bellnewyork.org/14/f504848a82ca24d1bee310ac6e6d8991"></script>',
    smartlinkUrl: 'https://ardance.org/4/8a4e54806bf1d2e4984078c43efd8205',
    openSmartlinkOnVerify: true,
    adCountdownSeconds: 0,
  });
  const [savingAds, setSavingAds] = useState<boolean>(false);
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [ipas, setIpas] = useState<CuratedIpa[]>([]);
  const [vipKeys, setVipKeys] = useState<VipKey[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistedIp[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string>('');

  // Modals & form states
  const [isNewIpaModalOpen, setIsNewIpaModalOpen] = useState<boolean>(false);
  const [newIpaForm, setNewIpaForm] = useState({
    name: '',
    bundleId: '',
    version: '1.0.0',
    iconUrl: '',
    downloadUrl: '',
    sizeMb: 50,
    category: 'Utilities' as const,
    description: '',
    isFeatured: true,
  });

  const [newVipNote, setNewVipNote] = useState<string>('');
  const [newVipExpiryDays, setNewVipExpiryDays] = useState<string>('0');
  const [newVipMaxUses, setNewVipMaxUses] = useState<string>('0');

  const [newBlockIp, setNewBlockIp] = useState<string>('');
  const [newBlockReason, setNewBlockReason] = useState<string>('');

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch all dashboard data
  const fetchAllData = useCallback(async () => {
    try {
      const [statsRes, configRes, sessionsRes, ipasRes, vipRes, telRes, blRes, adsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/config'),
        fetch('/api/admin/sessions'),
        fetch('/api/admin/ipas'),
        fetch('/api/admin/vip-keys'),
        fetch('/api/admin/telemetry?limit=80'),
        fetch('/api/admin/blacklist'),
        fetch('/api/admin/ads'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (configRes.ok) {
        const d = await configRes.json();
        setConfig(d.config);
      }
      if (sessionsRes.ok) {
        const d = await sessionsRes.json();
        setSessions(d.sessions);
      }
      if (ipasRes.ok) {
        const d = await ipasRes.json();
        setIpas(d.ipas);
      }
      if (vipRes.ok) {
        const d = await vipRes.json();
        setVipKeys(d.keys);
      }
      if (telRes.ok) {
        const d = await telRes.json();
        setTelemetry(d.events);
      }
      if (blRes.ok) {
        const d = await blRes.json();
        setBlacklist(d.blacklist);
      }
      if (adsRes.ok) {
        const d = await adsRes.json();
        if (d.ads) setAds(d.ads);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Save Remote Config
  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ تم حفظ الإعدادات والتحديثات بنجاح!');
        fetchAllData();
      } else {
        alert(data.error || 'فشل حفظ الإعدادات.');
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Save Ads Configuration
  const handleSaveAds = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAds(true);
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ads),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ تم حفظ ونشر إعدادات الإعلانات بنجاح!');
        if (data.ads) setAds(data.ads);
      } else {
        alert(data.error || 'فشل حفظ إعدادات الإعلانات.');
      }
    } catch {
      alert('خطأ في الاتصال بالسيرفر.');
    } finally {
      setSavingAds(false);
    }
  };

  // Session Actions
  const handleSessionAction = async (action: 'verify' | 'revoke' | 'delete' | 'cleanup', sessionId?: string) => {
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'تم تنفيذ الأمر بنجاح.');
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Add Curated IPA
  const handleAddIpa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpaForm.name || !newIpaForm.downloadUrl) return;

    try {
      const res = await fetch('/api/admin/ipas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIpaForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ تمت إضافة التطبيق إلى المتجر بنجاح!');
        setIsNewIpaModalOpen(false);
        setNewIpaForm({
          name: '',
          bundleId: '',
          version: '1.0.0',
          iconUrl: '',
          downloadUrl: '',
          sizeMb: 50,
          category: 'Utilities',
          description: '',
          isFeatured: true,
        });
        fetchAllData();
      } else {
        alert(data.error || 'فشل إضافة التطبيق.');
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Delete Curated IPA
  const handleDeleteIpa = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التطبيق من المتجر؟')) return;
    try {
      const res = await fetch(`/api/admin/ipas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف التطبيق بنجاح.');
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Generate VIP Key
  const handleGenerateVipKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const days = Number(newVipExpiryDays);
      const noteToSend = newVipNote.trim() || 'مفتاح ترخيص مخصص';
      const res = await fetch('/api/admin/vip-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: noteToSend,
          expiresInDays: days > 0 ? days : null,
          maxUses: Number(newVipMaxUses) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        showToast(`✓ تم إنشاء المفتاح: ${data.key.key}`);
        setNewVipNote('');
        setVipKeys(prev => [data.key, ...prev]);
        fetchAllData();
      } else {
        alert(data.error || 'فشل توليد المفتاح');
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Revoke VIP Key
  const handleRevokeVipKey = async (key: string) => {
    try {
      setVipKeys(prev => prev.map(k => k.key.toUpperCase() === key.toUpperCase() ? { ...k, isActive: false } : k));
      const res = await fetch(`/api/admin/vip-keys?key=${encodeURIComponent(key)}&action=revoke`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم تعطيل المفتاح بنجاح.');
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Activate VIP Key
  const handleActivateVipKey = async (key: string) => {
    try {
      setVipKeys(prev => prev.map(k => k.key.toUpperCase() === key.toUpperCase() ? { ...k, isActive: true } : k));
      const res = await fetch(`/api/admin/vip-keys?key=${encodeURIComponent(key)}&action=activate`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم إعادة تفعيل المفتاح بنجاح.');
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Delete VIP Key permanently
  const handleDeleteVipKey = async (key: string) => {
    if (!confirm(`هل أنت متأكد من مسح المفتاح (${key}) نهائياً؟`)) return;
    try {
      setVipKeys(prev => prev.filter(k => k.key.toUpperCase() !== key.toUpperCase()));
      const res = await fetch(`/api/admin/vip-keys?key=${encodeURIComponent(key)}&action=delete`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف المفتاح نهائياً.');
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Reset HWID binding for VIP Key
  const handleResetHwid = async (key: string) => {
    if (!confirm(`هل تريد فك ربط جهاز الكمبيوتر بهذا المفتاح (${key})؟ سيمكن للمستخدم الآن تفعيله على جهاز جديد.`)) return;
    try {
      const res = await fetch(`/api/admin/vip-keys?key=${encodeURIComponent(key)}&action=reset-hwid`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✓ ' + (data.message || 'تم فك ارتباط الجهاز بنجاح!'));
        fetchAllData();
      } else {
        alert(data.error || 'فشل فك ارتباط الجهاز.');
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Add Blacklist IP
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockIp.trim()) return;

    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newBlockIp, reason: newBlockReason }),
      });
      if (res.ok) {
        showToast(`تم حظر IP: ${newBlockIp}`);
        setNewBlockIp('');
        setNewBlockReason('');
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Remove Blacklist IP
  const handleRemoveBlacklist = async (ip: string) => {
    try {
      const res = await fetch(`/api/admin/blacklist?ip=${ip}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`تم فك الحظر عن: ${ip}`);
        fetchAllData();
      }
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Clear Telemetry
  const handleClearTelemetry = async () => {
    if (!confirm('هل تريد مسح جميع سجلات الـ Telemetry؟')) return;
    try {
      await fetch('/api/admin/telemetry', { method: 'DELETE' });
      showToast('تم مسح السجلات.');
      fetchAllData();
    } catch {
      alert('خطأ في الاتصال.');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  // ----------------------------------------------------
  // ADMIN DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-600/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">SideLink</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Master Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400">مركز التحكم والإدارة الشامل</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>الخادم متصل ونشط</span>
            </div>

            <button
              onClick={fetchAllData}
              title="تحديث البيانات"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">عرض الموقع</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. نظرة عامة وإحصائيات</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. التحكم والريموت كونفيج</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>3. جلسات التحقق ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ipas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'ipas'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. متجر تطبيقات IPA ({ipas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vip')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'vip'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>5. مفاتيح VIP والتراخيص</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>6. الأجهزة وسجل الأخطاء</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>7. الأمان وحظر الـ IPs</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'ads'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>8. الإعلانات والربح (Adsterra)</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono">
              Monetize
            </span>
          </button>
        </div>

        {/* ========================================================== */}
        {/* TAB 1: OVERVIEW & STATS */}
        {/* ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Verification Sessions */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>إجمالي جلسات التحقق</span>
                  <Radio className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {stats?.verification?.total ?? sessions.length}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{stats?.verification?.verified ?? 0} مكتمل بنجاح ({stats?.verification?.rate ?? 100}%)</span>
                </div>
              </div>

              {/* Card 2: IPA Downloads */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>تحميلات تطبيقات IPA</span>
                  <Download className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {stats?.totalIpaDownloads ?? 0}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{ipas.length} تطبيقات مميزة في المتجر</span>
                </div>
              </div>

              {/* Card 3: Active VIP Keys */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>مفاتيح VIP والتراخيص</span>
                  <Key className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {stats?.activeVipKeys ?? vipKeys.length}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-amber-400 font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>تخطي دائم لنظام التحقق</span>
                </div>
              </div>

              {/* Card 4: Crash Rate & Telemetry */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>الاستقرار ومعدل الأخطاء</span>
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {stats?.telemetry?.totalErrors ?? 0} <span className="text-sm font-normal text-slate-500">أخطاء</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-cyan-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>{stats?.telemetry?.totalSuccesses ?? 0} عملية توقيع ناجحة</span>
                </div>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span>حالة النظام والإعدادات الفورية الحالية</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">نظام التحقق (Link Unlock)</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {config?.isVerificationEnabled ? (
                        <span className="text-emerald-400">مُفعل للجميع</span>
                      ) : (
                        <span className="text-amber-400">مُعطل مؤقتاً (مفتوح تلقائياً)</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${config?.isVerificationEnabled ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">زر الطوارئ (Kill Switch)</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {config?.emergencyKillSwitch ? (
                        <span className="text-red-400">مُفعل (التطبيق متوقف)</span>
                      ) : (
                        <span className="text-emerald-400">طبيعي (التطبيق يعمل)</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${config?.emergencyKillSwitch ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">إصدار البرنامج الحالي</div>
                    <div className="text-sm font-bold text-white mt-1">
                      v{config?.latestVersion || '1.0.0'} {config?.forceUpdate && <span className="text-red-400 text-xs font-semibold">(إجباري)</span>}
                    </div>
                  </div>
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </div>

            {/* iOS & Devices Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* iOS Versions */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>توزيع إصدارات iOS المستخدمة</span>
                </h3>
                {stats?.telemetry?.iosVersions && Object.keys(stats.telemetry.iosVersions).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.telemetry.iosVersions).map(([ver, count]) => (
                      <div key={ver} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg text-xs">
                        <span className="font-mono text-slate-300">iOS {ver}</span>
                        <span className="font-bold text-blue-400">{count as number} عملية</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">لا توجد بيانات كافية حالياً</p>
                )}
              </div>

              {/* Device Models */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>أشهر موديلات الآيفون المتصلة</span>
                </h3>
                {stats?.telemetry?.deviceModels && Object.keys(stats.telemetry.deviceModels).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.telemetry.deviceModels).map(([model, count]) => (
                      <div key={model} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg text-xs">
                        <span className="font-semibold text-slate-300">{model}</span>
                        <span className="font-bold text-cyan-400">{count as number} جهاز</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">لا توجد بيانات كافية حالياً</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: REMOTE CONFIG & CONTROLS */}
        {/* ========================================================== */}
        {activeTab === 'config' && config && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">التحكم عن بُعد في تطبيق SideLink</h2>
                <p className="text-xs text-slate-400">التغييرات هنا تؤثر فوراً على كافة المستخدمين المشغلين للتطبيق دون الحاجة لإعادة بنائه</p>
              </div>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات الآن</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section 1: Verification Gate Switch */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">نظام التحقق (Link Unlock)</h3>
                      <p className="text-xs text-slate-400">طلب خطوة المتصفح عند بدء تشغيل البرنامج</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isVerificationEnabled}
                      onChange={(e) => setConfig({ ...config, isVerificationEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-400 leading-relaxed border border-slate-800/80">
                  إذا تم إلغاء تفعيل هذا الخيار، سيفتح التطبيق مباشرة لجميع المستخدمين بدون المطالبة بأي جلسة تحقق في المتصفح.
                </div>
              </div>

              {/* Section 2: Emergency Kill Switch */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">زر الطوارئ (Emergency Kill Switch)</h3>
                      <p className="text-xs text-slate-400">إيقاف تشغيل التطبيق مؤقتاً في حال وجود عطل</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.emergencyKillSwitch}
                      onChange={(e) => setConfig({ ...config, emergencyKillSwitch: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">رسالة التوقف التي تظهر للجميع:</label>
                  <textarea
                    rows={2}
                    value={config.killSwitchMessage}
                    onChange={(e) => setConfig({ ...config, killSwitchMessage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Section 3: Broadcast Banner */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">شريط الإعلانات والتنبيهات المباشرة (Broadcast Banner)</h3>
                      <p className="text-xs text-slate-400">عرض شريط تنبيهي أعلى واجهة التطبيق لجميع المستخدمين</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.broadcastBanner.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          broadcastBanner: { ...config.broadcastBanner, enabled: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">نص التنبيه:</label>
                    <input
                      type="text"
                      value={config.broadcastBanner.message}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          broadcastBanner: { ...config.broadcastBanner, message: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">نوع التنبيه:</label>
                    <select
                      value={config.broadcastBanner.type}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          broadcastBanner: {
                            ...config.broadcastBanner,
                            type: e.target.value as 'info' | 'warning' | 'success' | 'danger',
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="info">أزرق (معلومات / Info)</option>
                      <option value="warning">أصفر (تنبيه / Warning)</option>
                      <option value="success">أخضر (نجاح / Success)</option>
                      <option value="danger">أحمر (خطر / Danger)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: App Version & Updates */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 md:col-span-2">
                <div className="flex items-center gap-2.5">
                  <Download className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">إدارة إصدارات البرنامج وتحديثات المستخدمين</h3>
                    <p className="text-xs text-slate-400">تنبيه مستخدمي الإصدارات القديمة عند توفر تحديث</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">أحدث رقم إصدار (Latest Version):</label>
                    <input
                      type="text"
                      value={config.latestVersion}
                      onChange={(e) => setConfig({ ...config, latestVersion: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">رابط تحميل ملف التحديث (ZIP / EXE):</label>
                    <input
                      type="text"
                      value={config.downloadUrl}
                      onChange={(e) => setConfig({ ...config, downloadUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.forceUpdate}
                        onChange={(e) => setConfig({ ...config, forceUpdate: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                    <span className="text-xs font-semibold text-slate-300">تحديث إجباري (Force Update)</span>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">سجل التغييرات ومميزات التحديث (Release Notes):</label>
                    <textarea
                      rows={2}
                      value={config.releaseNotes}
                      onChange={(e) => setConfig({ ...config, releaseNotes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: LIVE SESSIONS */}
        {/* ========================================================== */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">جلسات التحقق الحية (Active Sessions)</h2>
                <p className="text-xs text-slate-400">مراقبة الجلسات المفتوحة وحالتها مع إمكانية التأكيد أو الإلغاء الفوري</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSessionAction('cleanup')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ المنتهية</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3.5">معرّف الجلسة (Session ID)</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">وقت الإنشاء</th>
                      <th className="p-3.5">عنوان IP</th>
                      <th className="p-3.5 text-center">إجراءات التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <tr key={s.sessionId} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono text-slate-200">{s.sessionId}</td>
                          <td className="p-3.5">
                            {s.status === 'verified' && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                                ✓ مكتمل (Verified)
                              </span>
                            )}
                            {s.status === 'pending' && (
                              <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[11px] font-semibold animate-pulse">
                                قيد الانتظار (Pending)
                              </span>
                            )}
                            {s.status === 'expired' && (
                              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-semibold">
                                منتهية (Expired)
                              </span>
                            )}
                            {s.status === 'failed' && (
                              <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[11px] font-semibold">
                                ملغاة (Revoked)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono">
                            {new Date(s.createdAt).toLocaleTimeString('ar-EG')}
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono">{s.clientIp || '127.0.0.1'}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {s.status !== 'verified' && (
                                <button
                                  type="button"
                                  onClick={() => handleSessionAction('verify', s.sessionId)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition text-[11px] font-semibold"
                                  title="تأكيد الجلسة يدوياً"
                                >
                                  تأكيد يدوي
                                </button>
                              )}
                              {s.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleSessionAction('revoke', s.sessionId)}
                                  className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition text-[11px] font-semibold"
                                  title="إلغاء الجلسة فوراً"
                                >
                                  إلغاء
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSessionAction('delete', s.sessionId)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                                title="مسح من السجل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          لا توجد جلسات حالياً. تبدأ الجلسات فور فتح برنامج SideLink.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: CURATED IPAS STORE */}
        {/* ========================================================== */}
        {activeTab === 'ipas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">متجر تطبيقات الـ IPA المقترحة</h2>
                <p className="text-xs text-slate-400">إدارة التطبيقات الشهيرة المتاحة للمستخدمين للتحميل المباشر والتوقيع الفوري</p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewIpaModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تطبيق جديد</span>
              </button>
            </div>

            {/* Grid of IPAs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ipas.map((ipa) => (
                <div
                  key={ipa.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ipa.iconUrl}
                      alt={ipa.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80';
                      }}
                      className="w-14 h-14 rounded-2xl object-cover bg-slate-950 border border-slate-800 shadow-md shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-white truncate">{ipa.name}</h3>
                        {ipa.isFeatured && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Flame className="w-3 h-3" />
                            <span>مميز</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">{ipa.bundleId}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>v{ipa.version}</span>
                        <span>•</span>
                        <span>{ipa.sizeMb} MB</span>
                        <span>•</span>
                        <span className="text-blue-400">{ipa.category}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{ipa.description}</p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{ipa.downloadsCount} تحميل</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={ipa.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                        title="رابط التحميل"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteIpa(ipa.id)}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs"
                        title="حذف من المتجر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New IPA Modal */}
            {isNewIpaModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white">إضافة تطبيق IPA جديد للمتجر</h3>
                    <button
                      type="button"
                      onClick={() => setIsNewIpaModalOpen(false)}
                      className="text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddIpa} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">اسم التطبيق:</label>
                      <input
                        type="text"
                        required
                        value={newIpaForm.name}
                        onChange={(e) => setNewIpaForm({ ...newIpaForm, name: e.target.value })}
                        placeholder="مثل: Spotify++ أو YouTube uYou"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Bundle Identifier:</label>
                        <input
                          type="text"
                          value={newIpaForm.bundleId}
                          onChange={(e) => setNewIpaForm({ ...newIpaForm, bundleId: e.target.value })}
                          placeholder="com.spotify.client"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">رقم الإصدار (Version):</label>
                        <input
                          type="text"
                          value={newIpaForm.version}
                          onChange={(e) => setNewIpaForm({ ...newIpaForm, version: e.target.value })}
                          placeholder="1.0.0"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">رابط ملف الـ IPA المباشر (Direct Download):</label>
                      <input
                        type="url"
                        required
                        value={newIpaForm.downloadUrl}
                        onChange={(e) => setNewIpaForm({ ...newIpaForm, downloadUrl: e.target.value })}
                        placeholder="https://.../app.ipa"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">رابط صورة الأيقونة:</label>
                        <input
                          type="url"
                          value={newIpaForm.iconUrl}
                          onChange={(e) => setNewIpaForm({ ...newIpaForm, iconUrl: e.target.value })}
                          placeholder="https://.../icon.png"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">القسم (Category):</label>
                        <select
                          value={newIpaForm.category}
                          onChange={(e) => setNewIpaForm({ ...newIpaForm, category: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="Music">Music</option>
                          <option value="Social">Social</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Games">Games</option>
                          <option value="Emulators">Emulators</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">وصف التطبيق ومميزاته:</label>
                      <textarea
                        rows={2}
                        value={newIpaForm.description}
                        onChange={(e) => setNewIpaForm({ ...newIpaForm, description: e.target.value })}
                        placeholder="مميزات هذا الإصدار وتفاصيله..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsNewIpaModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30"
                      >
                        حفظ ونشر التطبيق
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: VIP KEYS & LICENSES */}
        {/* ========================================================== */}
        {activeTab === 'vip' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">إدارة مفاتيح الـ VIP وتراخيص التخطي الدائم</h2>
              <p className="text-xs text-slate-400">توليد أكواد ترخيص لتخطي نظام التحقق بشكل دائم أو لفترة محددة</p>
            </div>

            {/* Generate Key Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>توليد مفتاح VIP جديد</span>
              </h3>

              <form onSubmit={handleGenerateVipKey} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">ملاحظة أو اسم المستفيد:</label>
                  <input
                    type="text"
                    value={newVipNote}
                    onChange={(e) => setNewVipNote(e.target.value)}
                    placeholder="مثل: ترخيص أحمد منجد - مدى الحياة (اختياري)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">المدة (أيام - 0 يعني دائم):</label>
                  <input
                    type="number"
                    min="0"
                    value={newVipExpiryDays}
                    onChange={(e) => setNewVipExpiryDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
                  >
                    توليد الكود الآن
                  </button>
                </div>
              </form>
            </div>

            {/* Keys Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3.5">كود المفتاح (VIP Key)</th>
                      <th className="p-3.5">الملاحظة</th>
                      <th className="p-3.5">الصلاحية</th>
                      <th className="p-3.5">الاستخدامات</th>
                      <th className="p-3.5">الجهاز المقترن (HWID)</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {vipKeys.map((k) => (
                      <tr key={k.key} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800/60">
                              {k.key}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(k.key)}
                              className="p-1 hover:text-white text-slate-400 transition"
                              title="نسخ الكود"
                            >
                              {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">{k.note}</td>
                        <td className="p-3.5 font-mono text-slate-400">
                          {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('ar-EG') : 'مدى الحياة (Lifetime)'}
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">{k.usedCount} مرة</td>
                        <td className="p-3.5">
                          {k.boundMachine ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-mono">
                                <Laptop className="w-3 h-3 text-blue-400" />
                                {k.boundMachine}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleResetHwid(k.key)}
                                className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black text-[10px] font-semibold transition"
                                title="فك ربط الجهاز (HWID) للسماح بتفعيله على جهاز جديد"
                              >
                                فك الارتباط
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">لم يُربط بعد (متاح)</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {k.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                              فعال
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[11px] font-semibold">
                              معطل
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {k.isActive ? (
                              <button
                                type="button"
                                onClick={() => handleRevokeVipKey(k.key)}
                                className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition text-[11px]"
                                title="تعطيل الكود مؤقتاً"
                              >
                                تعطيل
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivateVipKey(k.key)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition text-[11px]"
                                title="إعادة تفعيل الكود"
                              >
                                تفعيل
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteVipKey(k.key)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-700 text-slate-400 hover:text-white transition text-[11px]"
                              title="حذف المفتاح نهائياً"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 6: TELEMETRY & CRASH LOGS */}
        {/* ========================================================== */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">سجلات الأخطاء والـ Telemetry المباشرة</h2>
                <p className="text-xs text-slate-400">متابعة مشاكل التوقيع والتثبيت وتقارير الأجهزة الواردة من برنامج الكمبيوتر</p>
              </div>

              <button
                type="button"
                onClick={handleClearTelemetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجلات</span>
              </button>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3.5">الوقت</th>
                      <th className="p-3.5">الجهاز</th>
                      <th className="p-3.5">نظام iOS</th>
                      <th className="p-3.5">العملية</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">تفاصيل الخطأ إن وجد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {telemetry.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 text-slate-400 font-mono">
                          {new Date(t.timestamp).toLocaleTimeString('ar-EG')}
                        </td>
                        <td className="p-3.5 text-slate-200 font-semibold">{t.deviceModel}</td>
                        <td className="p-3.5 text-slate-400 font-mono">{t.iosVersion}</td>
                        <td className="p-3.5 text-slate-300 font-mono">{t.action}</td>
                        <td className="p-3.5">
                          {t.status === 'success' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                              ناجح
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[11px] font-semibold">
                              خطأ ({t.errorCode || 'Error'})
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                          {t.errorMessage || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 8: ADS & MONETIZATION (ADSTERRA INTEGRATION) */}
        {/* ========================================================== */}
        {activeTab === 'ads' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">إدارة الإعلانات والربح (Ads Monetization)</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Adsterra Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  تحكم كامل في إعلانات Adsterra وشبكات الإعلانات الأخرى داخل صفحة التحقق لتوليد أرباح من كل جلسة تشغيل
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/verify?session=demo-session-preview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>معاينة صفحة التحقق الحية</span>
                </a>

                <button
                  type="button"
                  onClick={handleSaveAds}
                  disabled={savingAds}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {savingAds ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ ونشر الإعلانات فوراً</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Adsterra Setup Guide matching the user's screenshot */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-900/90 border border-emerald-800/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    دليل ملء نموذج Adsterra (الظاهر في صورتك)
                  </h3>
                  <p className="text-[11px] text-emerald-400/80">
                    اتبع هذه الخطوات البسيطة لتفعيل حسابك والحصول على الأكواد
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-emerald-400 font-bold font-mono">1. Website</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    اكتب دومين موقعك أو الرابط الذي ترفع عليه SideLink (مثلاً رابط Vercel أو دومينك الخاص).
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-emerald-400 font-bold font-mono">2. Category</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    اختر <strong>Software</strong> أو <strong>Downloads</strong> أو <strong>Other</strong> ليتطابق مع طبيعة البرنامج.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-emerald-400 font-bold font-mono">3. Show adult ads</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    يُفضل تركها <strong>معطلة (Off)</strong> لتجنب الإعلانات غير اللائقة، أو تفعيلها إذا كنت ترغب في رفع الـ CPM لأقصى حد.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-emerald-400 font-bold font-mono">4. Ad Unit Format</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    اختر <strong>Social Bar</strong> أو <strong>Popunder</strong> (الأعلى ربحاً)، أو <strong>Banner</strong> (728x90)، ثم انسخ الكود وضعه بالأسفل.
                  </p>
                </div>
              </div>
            </div>

            {/* Ads Master Controls Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>المفاتيح العامة للتحكم في الإعلانات</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Master Switch */}
                <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      تفعيل الإعلانات على صفحة التحقق
                    </span>
                    <span className="text-[11px] text-slate-400">
                      تشغيل أو إيقاف ظهور كافة الإعلانات فورياً
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ads.enabled}
                      onChange={(e) => setAds({ ...ads, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Smartlink on Verify Click */}
                <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      فتح رابط السمارت لينك عند الضغط على تأكيد
                    </span>
                    <span className="text-[11px] text-slate-400">
                      فتح صفحة الرعاية في تبويب جديد مع إتمام التحقق
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ads.openSmartlinkOnVerify}
                      onChange={(e) => setAds({ ...ads, openSmartlinkOnVerify: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Direct Smartlink URL Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رابط السمارت لينك المباشر (Adsterra Direct Link / Smartlink URL):</span>
                </label>
                <input
                  type="url"
                  value={ads.smartlinkUrl || ''}
                  onChange={(e) => setAds({ ...ads, smartlinkUrl: e.target.value })}
                  placeholder="https://www.highcpmgate.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  إذا أنشأت في Adsterra وحدة &quot;Smartlink&quot;، ضع الرابط هنا وسيتم توجيه الزائر له في تبويب جديد بمجرد الضغط على زر التحقق.
                </span>
              </div>
            </div>

            {/* Ad Units Code Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit 1: Social Bar */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <span className="text-xs font-bold text-white">
                      سكريبت السوشيال بار (Social Bar Code)
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                    TOP CPM
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  إشعار أو شريط عائم ذكي يظهر للمستخدم في صفحة التحقق بدون حجب المحتوى:
                </p>
                <textarea
                  rows={4}
                  value={ads.socialBarScript || ''}
                  onChange={(e) => setAds({ ...ads, socialBarScript: e.target.value })}
                  placeholder="<script type='text/javascript' src='//.../invoke.js'></script>"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 placeholder-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Unit 2: Popunder */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <span className="text-xs font-bold text-white">
                      سكريبت البوب أندر (Popunder Script)
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                    High Revenue
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  يفتح نافذة إعلان في الخلفية عند نقر المستخدم في أي مكان بالصفحة:
                </p>
                <textarea
                  rows={4}
                  value={ads.popunderScript || ''}
                  onChange={(e) => setAds({ ...ads, popunderScript: e.target.value })}
                  placeholder="<script type='text/javascript' src='//.../invoke.js'></script>"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 placeholder-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Unit 3: Top Banner */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <span className="text-xs font-bold text-white">
                      بانر الإعلان العلوي (Top Banner 728x90 / 468x60)
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    Header
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  كود البانر المستطيل الذي يظهر في أعلى صفحة التحقق فوق بطاقة الجلسة:
                </p>
                <textarea
                  rows={4}
                  value={ads.topBannerHtml || ''}
                  onChange={(e) => setAds({ ...ads, topBannerHtml: e.target.value })}
                  placeholder="ضع كود الـ HTML / Script الخاص ببانر 728x90 هنا..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-blue-300 placeholder-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Unit 4: Bottom Banner */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <span className="text-xs font-bold text-white">
                      بانر الإعلان السفلي (Bottom Banner 300x250 / Responsive)
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    Footer
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  كود البانر المربع أو المتجاوب الذي يظهر أسفل بطاقة التحقق مباشرة:
                </p>
                <textarea
                  rows={4}
                  value={ads.bottomBannerHtml || ''}
                  onChange={(e) => setAds({ ...ads, bottomBannerHtml: e.target.value })}
                  placeholder="ضع كود الـ HTML / Script الخاص ببانر 300x250 هنا..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-blue-300 placeholder-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Save Button Floating / Bottom Bar */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveAds}
                disabled={savingAds}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingAds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ وتطبيق الإعلانات...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>حفظ ونشر التعديلات على صفحة التحقق</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {/* ========================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">الأمان وحظر العناوين المشبوهة (IP Blacklist)</h2>
              <p className="text-xs text-slate-400">حظر البوتات ومحاولات السبام لمنع الوصول إلى بوابات التحقق وسيرفر التطبيق</p>
            </div>

            {/* Block IP Form */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>حظر عنوان IP جديد</span>
              </h3>

              <form onSubmit={handleAddBlacklist} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">عنوان الـ IP:</label>
                  <input
                    type="text"
                    required
                    value={newBlockIp}
                    onChange={(e) => setNewBlockIp(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">سبب الحظر:</label>
                  <input
                    type="text"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    placeholder="محاولة سبام أو هجوم تكرار"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-lg shadow-red-600/30"
                  >
                    حظر العنوان فوراً
                  </button>
                </div>
              </form>
            </div>

            {/* Blocked IPs Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3.5">عنوان IP المحظور</th>
                      <th className="p-3.5">السبب</th>
                      <th className="p-3.5">تاريخ الحظر</th>
                      <th className="p-3.5 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {blacklist.length > 0 ? (
                      blacklist.map((b) => (
                        <tr key={b.ip} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono text-red-400 font-bold">{b.ip}</td>
                          <td className="p-3.5 text-slate-300">{b.reason}</td>
                          <td className="p-3.5 font-mono text-slate-400">
                            {new Date(b.blockedAt).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBlacklist(b.ip)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                            >
                              إلغاء الحظر
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          لا توجد عناوين IP محظورة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

