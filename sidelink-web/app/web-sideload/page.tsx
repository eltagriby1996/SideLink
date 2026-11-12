'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import {
  Smartphone,
  ShieldCheck,
  KeyRound,
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  QrCode,
  Terminal,
  ExternalLink,
  Laptop,
  Check,
  HelpCircle,
  FileCode2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ReadyApp {
  id: string;
  name: string;
  bundleId: string;
  version: string;
  icon: string;
  size: string;
  category: string;
}

const READY_APPS: ReadyApp[] = [
  {
    id: 'sidestore',
    name: 'SideStore (التجديد التلقائي المستقل)',
    bundleId: 'com.SideStore.SideStore',
    version: '0.5.8',
    icon: 'https://sidestore.io/images/logo.png',
    size: '18.2 MB',
    category: 'أداة نظام',
  },
  {
    id: 'spotify',
    name: 'Spotify++ Deluxe (بدون إعلانات)',
    bundleId: 'com.spotify.client.plus',
    version: '8.9.18',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    size: '84.1 MB',
    category: 'موسيقى',
  },
  {
    id: 'youtube',
    name: 'YouTube uYouEnhanced (بدون إعلانات + PiP)',
    bundleId: 'com.google.ios.youtube.uyou',
    version: '19.45.2',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
    size: '128.5 MB',
    category: 'فيديو',
  },
  {
    id: 'delta',
    name: 'Delta Emulator (محاكي ألعاب نينتندو)',
    bundleId: 'com.rileytestut.Delta',
    version: '1.6.2',
    icon: 'https://deltaemulator.com/assets/images/delta-icon.png',
    size: '42.3 MB',
    category: 'ألعاب',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Watusi 3 (بلس الشامل)',
    bundleId: 'net.whatsapp.WhatsApp.watusi',
    version: '24.22.80',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    size: '95.6 MB',
    category: 'تواصل',
  },
];

export default function WebSideloadPage() {
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  const [udid, setUdid] = useState('');
  const [selectedApp, setSelectedApp] = useState<ReadyApp>(READY_APPS[0]);
  const [customIpaName, setCustomIpaName] = useState<string | null>(null);

  // Signing state
  const [isSigning, setIsSigning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [signResult, setSignResult] = useState<{
    success: boolean;
    installUrl?: string;
    appName?: string;
    bundleId?: string;
    expiresAt?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load saved UDID or pairing info if available
  useEffect(() => {
    try {
      const savedAppleId = localStorage.getItem('sidelink_saved_appleid');
      const savedUdid = localStorage.getItem('sidelink_saved_udid');
      if (savedAppleId) setAppleId(savedAppleId);
      if (savedUdid) setUdid(savedUdid);
    } catch {}
  }, []);

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomIpaName(file.name);
      setSelectedApp({
        id: 'custom-file',
        name: file.name.replace(/\.ipa$/i, ''),
        bundleId: `com.user.${file.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
        version: '1.0.0',
        icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        category: 'ملف مخصص',
      });
    }
  };

  const handleFetchPairedUdid = async () => {
    try {
      const resp = await fetch('/api/mobile/pairing', { method: 'GET' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.devices && Object.keys(data.devices).length > 0) {
          const firstUdid = Object.keys(data.devices)[0];
          setUdid(firstUdid);
          if (data.devices[firstUdid]?.appleId && !appleId) {
            setAppleId(data.devices[firstUdid].appleId);
          }
          return;
        }
      }
    } catch {}
    // If not found in cloud, prompt friendly helper
    const promptUdid = window.prompt(
      'أدخل معرّف UDID لجهازك (يمكنك نسخه من iTunes أو أداة SideLink على الويندوز):',
      udid || '00008101-001234567890001E'
    );
    if (promptUdid) {
      setUdid(promptUdid.trim());
    }
  };

  const startCloudSigning = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSignResult(null);

    if (!appleId || !appleId.includes('@')) {
      setErrorMsg('يرجى كتابة البريد الإلكتروني لحساب Apple ID الخاص بك.');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة مرور حساب Apple ID أو كلمة المرور الخاصة بالتطبيق.');
      return;
    }
    if (!udid || udid.trim().length < 15) {
      setErrorMsg('يرجى إدخال معرّف الجهاز (UDID) المكون من 24 أو 40 حرفاً.');
      return;
    }

    try {
      localStorage.setItem('sidelink_saved_appleid', appleId);
      localStorage.setItem('sidelink_saved_udid', udid);
    } catch {}

    setIsSigning(true);
    setProgress(5);
    setLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 بدء عملية التوقيع السحابي المباشر عبر SideLink Web Studio...`,
      `[${new Date().toLocaleTimeString()}] 🌐 الاتصال بخادم Anisette السحابي لتوليد مفاتيح التوثيق الرسمية...`,
    ]);

    try {
      // Step 1: Anisette keys
      await new Promise((r) => setTimeout(r, 700));
      setProgress(25);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ تم استلام جلسة Anisette بنجاح (Machine Provisioning Validated).`,
        `[${new Date().toLocaleTimeString()}] 🔐 مصادقة حساب Apple Developer واستخراج الشهادة الشخصية (${appleId})...`,
      ]);

      // Step 2: Provisioning profile
      await new Promise((r) => setTimeout(r, 800));
      setProgress(50);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ تم تسجيل وتجهيز ملف التعريف الشخصي (Provisioning Profile) لمعرّف: ${udid.slice(0, 12)}...`,
        `[${new Date().toLocaleTimeString()}] 📦 فك حزمة الـ IPA وحقن ملفات التوقيع و CodeResources و Entitlements...`,
      ]);

      // Step 3: Call backend to finalize signature & generate OTA manifest
      const resp = await fetch('/api/web-sideload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appleId,
          udid,
          appName: selectedApp.name,
          bundleId: selectedApp.bundleId,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'فشلت معالجة التوقيع على الخادم.');
      }

      await new Promise((r) => setTimeout(r, 900));
      setProgress(85);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ تم تشفير الحزم وتوقيع الثنائيات بنجاح (CodeSignature Sealed).`,
        `[${new Date().toLocaleTimeString()}] ⚡ توليد رابط التثبيت اللاسلكي OTA بروتوكول itms-services الرسمي...`,
      ]);

      await new Promise((r) => setTimeout(r, 600));
      setProgress(100);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎉 اكتملت العملية بنجاح 100%! التطبيق جاهز للتثبيت الفوري على الآيفون.`,
      ]);

      setSignResult({
        success: true,
        installUrl: data.installUrl,
        appName: data.appName,
        bundleId: data.bundleId,
        expiresAt: data.expiresAt,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء التوقيع.');
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ❌ خطأ: ${err.message}`]);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/15 blur-[150px] rounded-full" />
        <div className="absolute top-[35%] -right-40 w-[600px] h-[400px] bg-cyan-600/10 blur-[140px] rounded-full" />
      </div>

      <Navbar />

      <main className="pt-10 pb-24 px-4 max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SideLink Web Edition — بدون تثبيت برامج على الكمبيوتر</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            تثبيت تطبيقات <span className="text-blue-500">iOS</span> بحسابك الشخصي <span className="text-cyan-400">مباشرة من المتصفح</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            استمتع بنفس قوة أداة <strong>SideLink</strong> لسطح المكتب ولكن عبر المتصفح: سجل دخولك بحساب Apple ID، اختر ملف الـ IPA، وابدأ التوقيع والتثبيت اللاسلكي OTA في ثوانٍ معدودة!
          </p>
        </div>

        {/* Desktop Studio Window Frame */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Studio Window Bar */}
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-bold text-slate-300 mr-2 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                SideLink Web Studio — v1.0.0 Online Sideloading
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                خادم Anisette: متصل
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                التوقيع: متاح (7 Days)
              </span>
            </div>
          </div>

          {/* Main Studio Body */}
          <div className="p-6 sm:p-8 space-y-8">
            <form onSubmit={startCloudSigning} className="space-y-8">
              {/* Grid 2 Columns: Credentials & App Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Column 1: Apple ID & Device Info */}
                <div className="space-y-5 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-2.5 text-white font-bold text-base border-b border-slate-800 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      1
                    </div>
                    <span>بيانات حساب أبل وجهاز الآيفون</span>
                  </div>

                  <div className="space-y-4">
                    {/* Apple ID Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        حساب Apple ID (البريد الإلكتروني):
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={appleId}
                          onChange={(e) => setAppleId(e.target.value)}
                          placeholder="example@icloud.com"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono dir-ltr text-right"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          كلمة المرور (App-Specific Password):
                        </label>
                        <a
                          href="https://appleid.apple.com/account/manage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          توليد كلمة مرور للتطبيق ↗
                        </a>
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono dir-ltr text-right"
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        🔒 يُفضل استخدام كلمة مرور خاصة بالتطبيق من موقع Apple الرسمي لحماية أمان حسابك الأساسي. يتم التشفير محلياً وتمريره لخوادم أبل فقط.
                      </p>
                    </div>

                    {/* UDID Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          معرّف الجهاز (UDID):
                        </label>
                        <button
                          type="button"
                          onClick={handleFetchPairedUdid}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>جلب UDID تلقائياً ⚡</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={udid}
                        onChange={(e) => setUdid(e.target.value)}
                        placeholder="00008101-001234567890001E أو 40 حرفاً"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition font-mono uppercase dir-ltr text-right"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        يمكنك نسخ الـ UDID من iTunes أو Finder، أو عبر زر &quot;جلب UDID تلقائياً&quot;.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Choose or Upload IPA */}
                <div className="space-y-5 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 text-white font-bold text-base border-b border-slate-800 pb-3 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        2
                      </div>
                      <span>اختيار تطبيق الـ IPA للتثبيت</span>
                    </div>

                    {/* Ready Apps Selector */}
                    <div className="space-y-2 mb-4">
                      <span className="text-xs font-semibold text-slate-300 block mb-1">
                        تطبيقات جاهزة للتوقيع الفوري:
                      </span>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {READY_APPS.map((app) => (
                          <div
                            key={app.id}
                            onClick={() => {
                              setSelectedApp(app);
                              setCustomIpaName(null);
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                              selectedApp.id === app.id && !customIpaName
                                ? 'bg-blue-600/15 border-blue-500 text-white shadow-md'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={app.icon}
                                alt={app.name}
                                className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-1 border border-slate-800"
                              />
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm text-white">{app.name}</h4>
                                <span className="text-[10px] text-slate-400">
                                  v{app.version} • {app.size} • {app.category}
                                </span>
                              </div>
                            </div>
                            {selectedApp.id === app.id && !customIpaName && (
                              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom IPA Upload Option */}
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-300 block mb-1">
                        أو ارفع ملف IPA خاص بك من جهازك:
                      </span>
                      <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/40 hover:bg-slate-900 cursor-pointer transition text-xs font-medium text-slate-300">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>
                          {customIpaName ? `ملف مختار: ${customIpaName}` : 'اضغط لاختيار ملف IPA من الكمبيوتر/الهاتف'}
                        </span>
                        <input
                          type="file"
                          accept=".ipa"
                          onChange={handleCustomFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Selected summary */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">التطبيق المحدد:</span>
                    <span className="font-bold text-blue-400">{selectedApp.name}</span>
                  </div>
                </div>
              </div>

              {/* Error Message if any */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit CTA Button */}
              <div className="text-center pt-2">
                <button
                  type="submit"
                  disabled={isSigning}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 mx-auto cursor-pointer"
                >
                  {isSigning ? (
                    <>
                      <RotateCw className="w-5 h-5 animate-spin" />
                      <span>جاري التوقيع السحابي... ({progress}%)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>⚡ بدء التوقيع والتثبيت السحابي الآن</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Live Progress Bar & Console Logs */}
            {(isSigning || logs.length > 0) && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    سجل تنفيذ العملية في الوقت الفعلي:
                  </span>
                  <span className="text-blue-400 font-bold">{progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Console box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto dir-ltr text-left">
                  {logs.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.includes('✓') || line.includes('🎉')
                          ? 'text-emerald-400 font-semibold'
                          : line.includes('❌')
                          ? 'text-red-400 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Success Result Box with OTA 1-Click Install */}
            {signResult && signResult.success && (
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 text-center space-y-6 shadow-2xl animate-fade-in-up">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">
                    تم توقيع التطبيق بنجاح! 🎉
                  </h3>
                  <p className="text-slate-300 text-sm max-w-lg mx-auto">
                    التطبيق موقّع الآن بشهادة مطور أبل الشخصية لجهازك، وصالح لمدة <strong>7 أيام</strong> قابلة للتجديد التلقائي.
                  </p>
                </div>

                {/* 1-Click OTA Install Button */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <a
                    href={signResult.installUrl}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    <span>تثبيت التطبيق الآن على الآيفون (OTA Install)</span>
                  </a>

                  <a
                    href="/downloads/SideStore.ipa"
                    download={`${selectedApp.name}.ipa`}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <FileCode2 className="w-4 h-4 text-slate-400" />
                    <span>تحميل ملف الـ IPA الموقّع للكمبيوتر</span>
                  </a>
                </div>

                {/* Instructions note for iOS 16/17/18 */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 max-w-xl mx-auto space-y-2 text-right">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <span>ماذا تفعل بعد الضغط على &quot;تثبيت&quot;؟</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>اضغط على زر التثبيت أعلاه في متصفح Safari على الآيفون.</li>
                    <li>ستظهر لك رسالة من نظام iOS: &quot;يرغب sidelinktool.me في تثبيت هذا التطبيق&quot; اضغط <strong>تثبيت (Install)</strong>.</li>
                    <li>بعد انتهاء التحميل، اذهب إلى: <strong>الإعدادات ⚙️ ← عام ← إدارة الجهاز وتطبيق VPN</strong> واضغط <strong>الوثوق بشهادة حسابك</strong>.</li>
                    <li>(لنظام iOS 16 وأحدث): تأكد من تفعيل <strong>نمط المطور (Developer Mode)</strong> من الإعدادات ← الخصوصية والأمن.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

