'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Activity,
  Key,
  Settings,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Smartphone,
  Sliders,
  CheckCircle2,
  ExternalLink,
  UserCheck,
  Laptop,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';

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

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'vip'>('overview');

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<RemoteConfigState | null>(null);
  const [vipKeys, setVipKeys] = useState<VipKey[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // VIP Key Generator form state
  const [newVipNote, setNewVipNote] = useState<string>('');
  const [newVipDurationType, setNewVipDurationType] = useState<string>('lifetime');
  const [newVipCustomValue, setNewVipCustomValue] = useState<string>('24');
  const [newVipMaxUses, setNewVipMaxUses] = useState<string>('0');

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch all dashboard data
  const fetchAllData = useCallback(async () => {
    try {
      const [statsRes, configRes, vipRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/config'),
        fetch('/api/admin/vip-keys'),
      ]);

      if (statsRes.status === 401 || configRes.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (configRes.ok) {
        const d = await configRes.json();
        setConfig(d.config);
      }
      if (vipRes.ok) {
        const d = await vipRes.json();
        setVipKeys(d.keys);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, []);

  // Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth');
        if (res.ok) {
          setIsAuthenticated(true);
          fetchAllData();
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [fetchAllData]);

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword.trim() || isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setLoginPassword('');
        fetchAllData();
      } else {
        setLoginError(data.error || 'كلمة المرور غير صحيحة. حاول مرة أخرى.');
      }
    } catch {
      setLoginError('تعذر الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {}
    setIsAuthenticated(false);
    setLoginPassword('');
    setLoginError('');
  };

  // Save Remote Config
  const handleSaveConfig = async () => {
    if (!config || isSavingConfig) return;
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ تم حفظ الإعدادات والتحديثات ومزامنتها سحابياً بنجاح!');
        fetchAllData();
      } else {
        alert(data.error || 'فشل حفظ الإعدادات.');
      }
    } catch {
      alert('خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Generate VIP Key
  const handleGenerateVipKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let expiresInHours: number | null = null;
      let expiresInDays: number | null = null;

      if (newVipDurationType === '1h') expiresInHours = 1;
      else if (newVipDurationType === '6h') expiresInHours = 6;
      else if (newVipDurationType === '12h') expiresInHours = 12;
      else if (newVipDurationType === '24h') expiresInHours = 24;
      else if (newVipDurationType === '3d') expiresInDays = 3;
      else if (newVipDurationType === '7d') expiresInDays = 7;
      else if (newVipDurationType === '30d') expiresInDays = 30;
      else if (newVipDurationType === 'custom_hours') expiresInHours = Math.max(1, Number(newVipCustomValue) || 1);
      else if (newVipDurationType === 'custom_days') expiresInDays = Math.max(1, Number(newVipCustomValue) || 1);

      const noteToSend = newVipNote.trim() || 'كود تحقق مخصص';
      const res = await fetch('/api/admin/vip-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: noteToSend,
          expiresInHours,
          expiresInDays,
          maxUses: Number(newVipMaxUses) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        showToast(`✓ تم إنشاء الكود بنجاح: ${data.key.key}`);
        setNewVipNote('');
        setVipKeys(prev => [data.key, ...prev]);
        fetchAllData();
      } else {
        alert(data.error || 'فشل توليد الكود');
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

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  // ----------------------------------------------------
  // 1. LOADING STATE
  // ----------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-xs text-slate-400 animate-pulse font-medium">جاري فحص صلاحيات الأمان...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. LOCKED / LOGIN GATE SCREEN
  // ----------------------------------------------------
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden" dir="rtl">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl">
          {/* Header Icon */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 mx-auto shadow-xl shadow-blue-600/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Lock className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">SideLink Master Admin</h1>
              <p className="text-xs text-slate-400 mt-1">منطقة محمية ومخصصة لمدير النظام فقط</p>
            </div>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة مرور الإدارة (Admin Password):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition pl-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق من الصلاحيات...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>تسجيل الدخول إلى لوحة التحكم</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-slate-800/80">
            <a
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition inline-flex items-center gap-1.5"
            >
              <span>العودة للصفحة الرئيسية للموقع</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. AUTHENTICATED ADMIN DASHBOARD
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
              <p className="text-[10px] text-slate-400">مركز التحكم والإدارة المحمي</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>جلسة موثوقة ومحمية</span>
            </div>

            <button
              onClick={fetchAllData}
              title="تحديث البيانات"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">عرض الموقع</span>
            </a>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="تسجيل الخروج وقفل اللوحة"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">قفل وخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. التحكم والريموت كونفيج</span>
          </button>

          <button
            onClick={() => setActiveTab('vip')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'vip'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>3. مفاتيح VIP والتراخيص ({vipKeys.length})</span>
          </button>
        </div>

        {/* ========================================================== */}
        {/* TAB 1: OVERVIEW & STATS */}
        {/* ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active VIP Keys */}
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

              {/* Card 2: App Version */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>إصدار التطبيق الرسمي</span>
                  <Smartphone className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  v{config?.latestVersion || '1.0.0'}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-blue-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{config?.forceUpdate ? 'تحديث إجباري مفعّل' : 'تحديث اختياري'}</span>
                </div>
              </div>

              {/* Card 3: Verification System Status */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>نظام التحقق (Link Unlock)</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {config?.isVerificationEnabled ? (
                    <span className="text-emerald-400">مُفعل للجميع</span>
                  ) : (
                    <span className="text-amber-400">مفتوح تلقائياً</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>توليد كود التفعيل عند التثبيت</span>
                </div>
              </div>

              {/* Card 4: Kill Switch Status */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>حالة زر الطوارئ (Kill Switch)</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {config?.emergencyKillSwitch ? (
                    <span className="text-rose-400">مُفعل (التطبيق متوقف)</span>
                  ) : (
                    <span className="text-emerald-400">طبيعي (التطبيق يعمل)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>التحكم الفوري بالإيقاف والصيانة</span>
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
                disabled={isSavingConfig}
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                {isSavingConfig ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ والمزامنة السحابية...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>حفظ وتطبيق التغييرات فوراً</span>
                  </>
                )}
              </button>
            </div>

            {/* Remote Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verification Enable / Disable */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">نظام التحقق وتخطي الروابط (Link Unlock)</h3>
                  <p className="text-xs text-slate-400 mt-1">عند تفعيله، سيُطلب من المستخدم إتمام التحقق على الموقع للحصول على كود الفك</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isVerificationEnabled}
                    onChange={(e) => setConfig({ ...config, isVerificationEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Maintenance Mode */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">وضع الصيانة العامة (Maintenance Mode)</h3>
                  <p className="text-xs text-slate-400 mt-1">إظهار رسالة صيانة لكافة المستخدمين وإيقاف العمليات مؤقتاً</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
                </label>
              </div>

              {/* Emergency Kill Switch */}
              <div className="bg-slate-900/90 border border-rose-900/30 rounded-2xl p-5 flex items-center justify-between col-span-1 md:col-span-2">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-bold text-white">زر الإيقاف الاضطراري العام (Emergency Kill Switch)</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">تعطيل كامل لتشغيل أداة SideLink عند جميع المستخدمين فورياً في حال اكتشاف ثغرة أو تحديث أبل حرج</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.emergencyKillSwitch}
                    onChange={(e) => setConfig({ ...config, emergencyKillSwitch: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                </label>
              </div>
            </div>

            {/* Version & Update Settings */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span>إدارة التحديثات والإصدارات الجديدة</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">أحدث رقم إصدار متاح (Latest Version):</label>
                  <input
                    type="text"
                    value={config.latestVersion}
                    onChange={(e) => setConfig({ ...config, latestVersion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">رابط تحميل التحديث الجديد (Download URL):</label>
                  <input
                    type="text"
                    value={config.downloadUrl}
                    onChange={(e) => setConfig({ ...config, downloadUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ملاحظات الإصدار والتغييرات (Release Notes):</label>
                <textarea
                  rows={2}
                  value={config.releaseNotes}
                  onChange={(e) => setConfig({ ...config, releaseNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forceUpdate"
                  checked={config.forceUpdate}
                  onChange={(e) => setConfig({ ...config, forceUpdate: e.target.checked })}
                  className="rounded border-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="forceUpdate" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  تحديث إجباري (يمنع استخدام التطبيق حتى يقوم المستخدم بتنزيل الإصدار الجديد)
                </label>
              </div>
            </div>

            {/* Broadcast Banner Settings */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">شريط التنبيهات المباشرة (Broadcast Banner)</h3>
                    <p className="text-xs text-slate-400">عرض شريط تنبيهي أعلى واجهة التطبيق لجميع المستخدمين</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.broadcastBanner?.enabled ?? false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        broadcastBanner: {
                          ...(config.broadcastBanner || { type: 'info' }),
                          enabled: e.target.checked,
                          message: config.broadcastBanner?.message || '',
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">نص الرسالة أو الإشعار:</label>
                  <input
                    type="text"
                    value={config.broadcastBanner?.message || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        broadcastBanner: {
                          ...(config.broadcastBanner || { type: 'info', enabled: false }),
                          message: e.target.value,
                        },
                      })
                    }
                    placeholder="مثال: يرجى العلم أنه تم إصدار تحديث أمني جديد للأداة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">نوع الشريط وألوانه:</label>
                  <select
                    value={config.broadcastBanner?.type || 'info'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        broadcastBanner: {
                          ...(config.broadcastBanner || { enabled: false, message: '' }),
                          type: e.target.value as any,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="info">أزرق - معلومات وتنبيه (Info)</option>
                    <option value="warning">أصفر - تحذير هام (Warning)</option>
                    <option value="success">أخضر - نجاح وبشرى (Success)</option>
                    <option value="danger">أحمر - طوارئ عاجلة (Danger)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: VIP KEYS & LICENSES */}
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
                <Plus className="w-4 h-4 text-amber-400" />
                <span>توليد كود VIP جديد</span>
              </h3>

              <form onSubmit={handleGenerateVipKey} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ملاحظة / اسم المشترك:</label>
                    <input
                      type="text"
                      value={newVipNote}
                      onChange={(e) => setNewVipNote(e.target.value)}
                      placeholder="مثال: اشتراك شهر لمحمد"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">صلاحية الكود:</label>
                    <select
                      value={newVipDurationType}
                      onChange={(e) => setNewVipDurationType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    >
                      <option value="1h">ساعة واحدة (1 Hour)</option>
                      <option value="6h">6 ساعات (6 Hours)</option>
                      <option value="12h">12 ساعة (12 Hours)</option>
                      <option value="24h">24 ساعة / يوم كامل (24 Hours)</option>
                      <option value="3d">3 أيام (3 Days)</option>
                      <option value="7d">أسبوع كامل (7 Days)</option>
                      <option value="30d">شهر كامل (30 Days)</option>
                      <option value="custom_hours">عدد ساعات مخصص...</option>
                      <option value="custom_days">عدد أيام مخصص...</option>
                      <option value="lifetime">مدى الحياة (Lifetime - بلا انتهاء)</option>
                    </select>
                  </div>

                  {(newVipDurationType === 'custom_hours' || newVipDurationType === 'custom_days') && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {newVipDurationType === 'custom_hours' ? 'العدد بالساعات:' : 'العدد بالأيام:'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newVipCustomValue}
                        onChange={(e) => setNewVipCustomValue(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">أقصى عدد مرات استخدام (0 = غير محدود):</label>
                    <input
                      type="number"
                      min="0"
                      value={newVipMaxUses}
                      onChange={(e) => setNewVipMaxUses(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/20 cursor-pointer"
                  >
                    <Key className="w-4 h-4" />
                    <span>توليد وحفظ الكود فوراً</span>
                  </button>
                </div>
              </form>
            </div>

            {/* VIP Keys Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3.5">الكود (Key)</th>
                      <th className="p-3.5">الملاحظة</th>
                      <th className="p-3.5">الصلاحية</th>
                      <th className="p-3.5">الاستخدام</th>
                      <th className="p-3.5">ربط الجهاز (HWID)</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {vipKeys.length > 0 ? (
                      vipKeys.map((k) => (
                        <tr key={k.key} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono text-amber-300 font-bold">
                            <div className="flex items-center gap-2">
                              <span>{k.key}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(k.key)}
                                className="text-slate-400 hover:text-white transition cursor-pointer"
                                title="نسخ الكود"
                              >
                                {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-300">{k.note}</td>
                          <td className="p-3.5 font-mono text-slate-400">
                            {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('ar-EG') : 'مدى الحياة'}
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {k.usedCount} / {k.maxUses === 0 ? '∞' : k.maxUses}
                          </td>
                          <td className="p-3.5 text-xs">
                            {k.boundHwid ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono">
                                  <Laptop className="w-3 h-3 text-blue-400" />
                                  <span>{k.boundMachine || 'مرتبط بجهاز'}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleResetHwid(k.key)}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold transition cursor-pointer"
                                  title="فك ربط الجهاز بالسماح بتفعيله على كمبيوتر آخر"
                                >
                                  فك الارتباط
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono">غير مقترن (جاهز للتفعيل)</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {k.isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                                نشط
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[11px] font-semibold">
                                معطل
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {k.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeVipKey(k.key)}
                                  className="px-2 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white transition text-[11px] font-semibold cursor-pointer"
                                >
                                  تعطيل
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleActivateVipKey(k.key)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition text-[11px] font-semibold cursor-pointer"
                                >
                                  تفعيل
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteVipKey(k.key)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition cursor-pointer"
                                title="حذف نهائي"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          لا توجد مفاتيح VIP منشأة حالياً.
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
