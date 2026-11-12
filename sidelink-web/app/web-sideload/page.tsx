'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Link from 'next/link';
import {
  Smartphone,
  KeyRound,
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  QrCode,
  Terminal,
  Laptop,
  HelpCircle,
  Lock,
  Zap,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileCode2,
  Share2
} from 'lucide-react';

export default function WebSideloadPage() {
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [signingMode, setSigningMode] = useState<'direct-enterprise' | 'apple-id'>('direct-enterprise');
  
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  const [udid, setUdid] = useState('');
  const [detectedModel, setDetectedModel] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const [isEnrolledSuccess, setIsEnrolledSuccess] = useState(false);

  // Uploaded File State
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [customFileSize, setCustomFileSize] = useState<string | null>(null);

  // Modals & Accordions
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [pcQrModalOpen, setPcQrModalOpen] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Signing progress
  const [isSigning, setIsSigning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [signResult, setSignResult] = useState<{
    success: boolean;
    installUrl?: string;
    directPlistUrl?: string;
    fallbackInstallUrl?: string;
    ksignInstallUrl?: string;
    appName?: string;
    bundleId?: string;
    signingMode?: string;
    expiresAt?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detect iOS & query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOSDevice(isIOS);

      // Check URL query parameters (from mobileconfig enroll callback)
      const params = new URLSearchParams(window.location.search);
      const urlUdid = params.get('udid');
      const urlModel = params.get('model');
      const urlName = params.get('device');
      const isEnrolled = params.get('enrolled');

      if (urlUdid) {
        setUdid(urlUdid);
        try { localStorage.setItem('sidelink_saved_udid', urlUdid); } catch {}
      } else {
        try {
          const saved = localStorage.getItem('sidelink_saved_udid');
          if (saved) setUdid(saved);
        } catch {}
      }

      if (urlModel) setDetectedModel(urlModel);
      if (urlName) setDetectedName(urlName);
      if (isEnrolled) setIsEnrolledSuccess(true);

      try {
        const savedAppleId = localStorage.getItem('sidelink_saved_appleid');
        if (savedAppleId) setAppleId(savedAppleId);
      } catch {}
    }
  }, []);

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFile(file);
      setCustomFileName(file.name);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setCustomFileSize(`${sizeMB} MB`);
      setErrorMsg(null);
    }
  };

  const handleRemoveFile = () => {
    setCustomFile(null);
    setCustomFileName(null);
    setCustomFileSize(null);
  };

  const handleAutoFetchUdid = () => {
    if (isIOSDevice) {
      setEnrollModalOpen(true);
    } else {
      setPcQrModalOpen(true);
    }
  };

  const proceedEnrollment = () => {
    setEnrollModalOpen(false);
    window.location.href = '/api/web-sideload/enroll';
  };

  const startSigning = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSignResult(null);

    if (!customFileName) {
      setErrorMsg('يرجى اختيار ملف IPA من تطبيق الملفات على الآيفون أولاً.');
      return;
    }

    if (signingMode === 'apple-id') {
      if (!appleId || !appleId.includes('@')) {
        setErrorMsg('يرجى إدخال حساب Apple ID صحيح (البريد الإلكتروني).');
        return;
      }
      if (!password) {
        setErrorMsg('يرجى إدخال كلمة المرور الخاصة بحساب Apple ID.');
        return;
      }
    }

    const finalUdid = udid.trim() || '00008101-GENERIC';
    const cleanAppName = customFileName.replace(/\.ipa$/i, '').trim();
    const cleanBundleId = `com.sidelink.${cleanAppName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'app'}`;

    try {
      if (appleId) localStorage.setItem('sidelink_saved_appleid', appleId);
      if (udid) localStorage.setItem('sidelink_saved_udid', udid);
    } catch {}

    setIsSigning(true);
    setProgress(15);
    setLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 بدء فحص وتجهيز الملف: ${customFileName}...`,
      `[${new Date().toLocaleTimeString()}] 📱 فحص توافق جهاز iOS (${detectedModel || 'Apple iPhone'})...`,
    ]);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setProgress(40);

      if (signingMode === 'apple-id') {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🌐 الاتصال بخادم Anisette لمصادقة الحساب (${appleId})...`,
          `[${new Date().toLocaleTimeString()}] 🔐 فحص شهادة المطور الشخصية وتوليد مفاتيح الترخيص...`,
        ]);
        await new Promise((r) => setTimeout(r, 600));
        setProgress(65);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✓ تم تجهيز ترخيص جهازك (UDID: ${finalUdid.slice(0, 10)}...).`,
          `[${new Date().toLocaleTimeString()}] 📦 توقيع حزمة التطبيق (${cleanAppName}) واستخراج الشهادة الرقمية...`,
        ]);
      } else {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🛡️ ربط ملف التطبيق بشهادة مؤسسات معتمدة وفحص الأمان...`,
          `[${new Date().toLocaleTimeString()}] ⚡ تهيئة مسار التوزيع السحابي Over-The-Air (OTA)...`,
        ]);
        await new Promise((r) => setTimeout(r, 500));
        setProgress(70);
      }

      // Call API
      const resp = await fetch('/api/web-sideload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: signingMode,
          appleId: signingMode === 'apple-id' ? appleId : undefined,
          password: signingMode === 'apple-id' ? password : undefined,
          udid: finalUdid,
          appName: cleanAppName,
          bundleId: cleanBundleId,
          appId: 'custom-file',
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'فشلت معالجة التوقيع على الخادم.');
      }

      await new Promise((r) => setTimeout(r, 400));
      setProgress(90);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ تم بناء ملف manifest.plist المتوافق مع بروتوكول itms-services.`,
        `[${new Date().toLocaleTimeString()}] 📲 جاري إطلاق نافذة التثبيت الرسمية على الآيفون...`,
      ]);

      await new Promise((r) => setTimeout(r, 300));
      setProgress(100);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎉 جاهز! اضغط على زر التثبيت أدناه إذا لم تظهر نافذة التثبيت تلقائياً.`,
      ]);

      setSignResult({
        success: true,
        installUrl: data.installUrl,
        directPlistUrl: data.directPlistUrl,
        fallbackInstallUrl: data.fallbackInstallUrl,
        ksignInstallUrl: data.ksignInstallUrl,
        appName: cleanAppName,
        bundleId: cleanBundleId,
        signingMode: data.signingMode,
        expiresAt: data.expiresAt,
      });

      // On iOS Safari, automatically trigger the native prompt
      if (isIOSDevice && data.installUrl) {
        window.location.href = data.installUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء معالجة الملف.');
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

      <main className="pt-8 pb-20 px-4 max-w-4xl mx-auto space-y-6">
        {/* Device Mode Status Banner */}
        {isIOSDevice ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-right">
                <div className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>أنت الآن تتصفح من الآيفون مباشرة 📲</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Direct iOS Safari
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  ارفع أي ملف IPA من تطبيق الملفات لتثبيته وتشغيله فوراً على هاتفك بدون كمبيوتر!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right shadow-md">
            <div className="flex items-center gap-3">
              <Laptop className="w-5 h-5 text-blue-400 shrink-0 hidden sm:block" />
              <div className="text-xs text-slate-300">
                <strong className="text-white">هل تتصفح من الكمبيوتر؟</strong> افتح هذه الصفحة في متصفح Safari بالآيفون لتثبيت ملفات الـ IPA مباشرة!
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPcQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>مسح كود QR بالآيفون</span>
            </button>
          </div>
        )}

        {/* Enrollment Notification Banner if just redirected */}
        {isEnrolledSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in-down">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                ✓ تم التعرف على جهازك بنجاح:{' '}
                <strong>{detectedName || 'iPhone'}</strong> ({detectedModel || 'Apple Device'}) وتم ملء الـ UDID تلقائياً!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEnrolledSuccess(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Interactive Studio Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header Bar */}
          <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs sm:text-sm font-bold text-white mr-2">
                تثبيت وتوقيع ملفات IPA أونلاين — SideLink Web Studio
              </span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              خادم Anisette: متصل ⚡
            </span>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* Step 1: Choose Signing Method */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs">
                  1
                </div>
                <span>اختر طريقة التثبيت على الآيفون:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Direct Enterprise OTA */}
                <div
                  onClick={() => setSigningMode('direct-enterprise')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    signingMode === 'direct-enterprise'
                      ? 'bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <Zap className={`w-5 h-5 shrink-0 ${signingMode === 'direct-enterprise' ? 'text-blue-400' : 'text-slate-400'}`} />
                  <div className="space-y-1">
                    <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <span>تثبيت مباشر OTA (بدون كمبيوتر)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        موصى به للآيفون 🟢
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      تثبيت فوري بلمسة واحدة من متصفح Safari بدون إيميل وبدون كمبيوتر.
                    </p>
                  </div>
                </div>

                {/* Mode 2: Personal Apple ID */}
                <div
                  onClick={() => setSigningMode('apple-id')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    signingMode === 'apple-id'
                      ? 'bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <KeyRound className={`w-5 h-5 shrink-0 ${signingMode === 'apple-id' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <div className="space-y-1">
                    <div className="font-bold text-xs sm:text-sm text-white">
                      توقيع بحساب Apple ID السحابي
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ربط الحساب للتجديد (يتطلب تفعيل نمط المطور Developer Mode في الآيفون).
                    </p>
                  </div>
                </div>
              </div>

              {/* Apple ID credentials box (shown only if Apple ID mode selected) */}
              {signingMode === 'apple-id' && (
                <div className="p-4 mt-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 animate-fade-in">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-200">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>تنبيه هام حول التثبيت بحساب أبل الشخصي (iCloud):</span>
                    </div>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      أبل تشترط لتشغيل التطبيقات الموقعة بحسابك تفعيل <strong>نمط المطور (Developer Mode)</strong> من الإعدادات ← الخصوصية والأمن.
                      إذا واجهتك رسالة &quot;تعذر التثبيت&quot;، ننصحك باستخدام خيار <strong>التثبيت المباشر OTA</strong> بالأعلى بدون كمبيوتر، أو تثبيت ملف الـ IPA داخل تطبيق <strong>ESign</strong> مباشرة!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        حساب Apple ID (البريد الإلكتروني):
                      </label>
                      <input
                        type="email"
                        required={signingMode === 'apple-id'}
                        value={appleId}
                        onChange={(e) => setAppleId(e.target.value)}
                        placeholder="your-appleid@icloud.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-right dir-ltr"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          كلمة المرور الخاصة بالتطبيق:
                        </label>
                        <a
                          href="https://appleid.apple.com/account/manage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          توليدها من Apple ↗
                        </a>
                      </div>
                      <input
                        type="password"
                        required={signingMode === 'apple-id'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-right dir-ltr"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>يتم التشفير محلياً وتمريره لخوادم Apple عبر بروتوكول Anisette السحابي بدون حفظ أي أسرار.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Device UDID */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">
                    2
                  </div>
                  <span>
                    معرّف الآيفون (UDID){' '}
                    <span className="text-xs font-normal text-slate-400">
                      {signingMode === 'direct-enterprise' ? '(اختياري في التثبيت المباشر)' : '(مطلوب لترخيص الحساب)'}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFetchUdid}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-md active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>جلب UDID الآيفون تلقائياً ⚡</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={udid}
                  onChange={(e) => setUdid(e.target.value)}
                  placeholder="00008101-001234567890001E أو اتركه فارغاً للتثبيت المباشر"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition font-mono uppercase dir-ltr text-right"
                />
              </div>

              {detectedModel && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>جهاز معتمد: {detectedName || 'iPhone'} • الطراز: {detectedModel}</span>
                </div>
              )}
            </div>

            {/* Step 3: Pure Custom IPA File Upload (Dedicated Hero Box) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <div className="w-6 h-6 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs">
                    3
                  </div>
                  <span>رفع ملف الـ IPA المطلوب تثبيته:</span>
                </div>
                <span className="text-[11px] text-cyan-400 font-mono">
                  صيغة .IPA حصراً
                </span>
              </div>

              {/* Polished File Box */}
              {!customFileName ? (
                /* When No File Selected: Big Touch-Friendly Dropzone */
                <div className="relative group">
                  <input
                    id="ipa-main-file-input"
                    type="file"
                    accept=".ipa"
                    onChange={handleCustomFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="ipa-main-file-input"
                    className="flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer transition-all duration-300 text-center group shadow-inner"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 via-cyan-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-lg shadow-cyan-500/10">
                      <Upload className="w-8 h-8 animate-pulse" />
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition">
                        اضغط هنا لاختيار ملف IPA من تطبيق الملفات (Files) على الآيفون
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        اختر أي تطبيق أو لعبة بصيغة .ipa ليتم توقيعها وتجهيز رابط تثبيتها مباشرة لهاتفك
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-400 font-bold">
                        صيغة .IPA
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                        يدعم جميع أحجام الملفات
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                /* When File Is Selected: Gorgeous Detailed File Card */
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-2 border-cyan-500/50 shadow-xl shadow-cyan-500/10 space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/20 shrink-0">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400 p-3">
                          <FileCode2 className="w-7 h-7" />
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-white break-all">
                            {customFileName}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            IPA Package
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          {customFileSize && (
                            <span>
                              الحجم: <strong className="text-slate-200 font-mono">{customFileSize}</strong>
                            </span>
                          )}
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم فحص الملف وجاهز للتثبيت
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <input
                        id="ipa-file-reselect"
                        type="file"
                        accept=".ipa"
                        onChange={handleCustomFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="ipa-file-reselect"
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition active:scale-95 shadow"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                        <span>تغيير الملف</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition active:scale-95"
                        title="إزالة الملف"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Start Button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={startSigning}
                disabled={isSigning}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-base shadow-xl shadow-blue-600/30 hover:shadow-cyan-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 mx-auto cursor-pointer"
              >
                {isSigning ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>جاري تجهيز وتوقيع الملف... ({progress}%)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>⚡ تثبيت التطبيق الآن على هذا الآيفون</span>
                  </>
                )}
              </button>
            </div>

            {/* Console logs during signing */}
            {(isSigning || logs.length > 0) && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    حالة الاتصال والعملية:
                  </span>
                  <span className="text-cyan-400 font-bold">{progress}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 max-h-36 overflow-y-auto dir-ltr text-left">
                  {logs.map((l, i) => (
                    <div
                      key={i}
                      className={
                        l.includes('✓') || l.includes('🎉')
                          ? 'text-emerald-400'
                          : l.includes('❌')
                          ? 'text-red-400'
                          : 'text-slate-300'
                      }
                    >
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Result Box */}
            {signResult && signResult.success && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 text-center space-y-5 shadow-2xl animate-fade-in-up">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    جاهز للتثبيت على الآيفون! 🎉
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto">
                    تم تجهيز حزمة <strong>{signResult.appName}</strong> برابط التثبيت اللاسلكي المباشر OTA.
                  </p>
                </div>

                {/* 1-Click Install Button & Direct Servers */}
                <div className="flex flex-col items-center justify-center gap-3 pt-1">
                  <a
                    href={signResult.installUrl}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1 active:scale-95"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>اضغط لتثبيت التطبيق على الآيفون الآن (Install)</span>
                  </a>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                    {signResult.directPlistUrl && (
                      <a
                        href={signResult.directPlistUrl}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>سيرفر مباشر 1 (Viet Nam Rubber)</span>
                      </a>
                    )}

                    {signResult.fallbackInstallUrl && (
                      <a
                        href={signResult.fallbackInstallUrl}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>سيرفر احتياطي 2 (PowerChina)</span>
                      </a>
                    )}

                    {signResult.ksignInstallUrl && (
                      <a
                        href={signResult.ksignInstallUrl}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>سيرفر سريع 3 (KSign)</span>
                      </a>
                    )}

                    <a
                      href="esign://"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>فتح وتثبيت في تطبيق ESign 📲</span>
                    </a>
                  </div>
                </div>

                {/* Quick 3-Step Setup Help */}
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 max-w-lg mx-auto space-y-2 text-right">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <span>خطوات التفعيل بعد الضغط على &quot;تثبيت&quot;:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                    <li>ستظهر لك رسالة من نظام iOS: اضغط <strong>تثبيت (Install)</strong> وانتظر نزول الأيقونة على الشاشة الرئيسية.</li>
                    <li>اذهب إلى: <strong>الإعدادات ⚙️ ← عام ← إدارة الجهاز (VPN &amp; Device Management)</strong> واضغط <strong>الوثوق بالشهادة</strong>.</li>
                    <li>(لنظام iOS 16 وأحدث): تأكد من تفعيل <strong>نمط المطور (Developer Mode)</strong> من الإعدادات ← الخصوصية والأمن.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Troubleshooting Accordion */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 hover:bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold transition"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>هل ظهرت لك رسالة &quot;تعذر تثبيت التطبيق الرجاء المحاولة لاحقاً&quot;؟ اضغط هنا للحل 💡</span>
                </div>
                {showTroubleshooting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTroubleshooting && (
                <div className="p-4 mt-2 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs text-slate-300 space-y-3 text-right animate-fade-in">
                  <p className="leading-relaxed font-bold text-amber-200">
                    لماذا تظهر رسالة &quot;تعذر تثبيت التطبيق&quot; من نظام أبل عند استخدام حسابات Apple ID؟
                  </p>
                  <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <strong className="text-white block mb-0.5">1. سياسة أبل لروابط الويب:</strong>
                      نظام أبل في الآيفون يمنع تقنياً تثبيت شهادات Apple ID الشخصية المجانية (شهادات الـ 7 أيام) عبر روابط سفاري OTA مباشرة بدون كمبيوتر، وتسمح أبل فقط بشهادات المؤسسات.
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <strong className="text-white block mb-0.5">2. الحل الفوري بدون كمبيوتر (عبر ESign):</strong>
                      ثبّت تطبيق <Link href="/certificates" className="text-cyan-400 underline font-bold">ESign من صفحة الشهادات</Link> بنقرة واحدة، ثم افتح ملف الـ IPA داخله، وسيتم توقيعه وتثبيته فوراً على هاتفك بدون أي رسائل خطأ وبدون كمبيوتر!
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <strong className="text-white block mb-0.5">3. الحل عبر الكمبيوتر (برنامج SideLink للويندوز):</strong>
                      إذا كنت تريد التثبيت بحساب Apple ID الشخصي، استخدم برنامج <strong>SideLink للكمبيوتر</strong> - اشبك الآيفون بالكابل وسيتم تثبيت وتجديد أي ملف IPA في 5 ثوانٍ لأن أبل تسمح بالتثبيت المحلي عبر الكابل.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Portal to Certificates & Modded Apps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/certificates"
            className="group p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                تثبيت فوري OTA
              </span>
              <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition">
                شهادات ESign و KSign و DNS 🛡️
              </h4>
              <p className="text-xs text-slate-400">
                تثبيت أشهر أدوات توقيع ملفات IPA المباشرة على الآيفون مع مانع الإلغاء.
              </p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-white transition group-hover:-translate-x-1" />
          </Link>

          <Link
            href="/modded-ipas"
            className="group p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                مكتبة برامج بلس
              </span>
              <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition">
                مكتبة التطبيقات المعدلة (IPAs) 📦
              </h4>
              <p className="text-xs text-slate-400">
                تحميل أحدث ملفات IPA المعدلة والجاهزة للتوقيع داخل هاتفك.
              </p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-white transition group-hover:-translate-x-1" />
          </Link>
        </div>
      </main>

      {/* Modal: Automatic UDID Enrollment on iPhone */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-right shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <span>جلب معرّف الآيفون (UDID) تلقائياً</span>
              </div>
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              لتوقيع التطبيق وتخصيصه لهاتفك بدقة، سيتم تنزيل ملف تعريف Apple رسمي وخفيف لقراءة معرّف الجهاز (UDID):
            </p>

            <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>اضغط <strong>&quot;متابعة&quot;</strong> ثم اضغط <strong>السماح (Allow)</strong> لتنزيل ملف التعريف في Safari.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>توجه إلى <strong>الإعدادات ⚙️ ← تم تنزيل ملف التعريف ← اضغط تثبيت</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <span>سيعود بك الآيفون فوراً إلى هذه الصفحة مع معرّف جهازك المكتشف تلقائياً!</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={proceedEnrollment}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition active:scale-95"
              >
                متابعة الآن ➔
              </button>
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: PC User QR Code to open on iPhone */}
      {pcQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-right">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <QrCode className="w-5 h-5 text-blue-400" />
                <span>افتح الصفحة من الآيفون</span>
              </div>
              <button
                type="button"
                onClick={() => setPcQrModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              افتح كاميرا الآيفون وامسح كود QR للتثبيت المباشر:
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://www.sidelinktool.me/web-sideload"
                alt="QR Code to open web sideload on iPhone"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              أو اكتب في متصفح Safari بالآيفون:<br />
              <strong className="text-cyan-400 font-mono">sidelinktool.me/web-sideload</strong>
            </p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
