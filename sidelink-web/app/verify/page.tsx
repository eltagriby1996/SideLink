'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  ShieldAlert, 
  Sparkles, 
  Key, 
  RefreshCw,
  Check,
  Cpu,
  Fingerprint
} from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const nonce = searchParams.get('nonce');

  const [status, setStatus] = useState<'pending' | 'verifying' | 'verified' | 'expired' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 mins
  const [verifyStep, setVerifyStep] = useState<number>(0);
  const [verifyProgress, setVerifyProgress] = useState<number>(0);

  // Countdown timer
  useEffect(() => {
    if (status === 'verified' || status === 'expired') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Check initial session status
  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('معرّف الجلسة مفقود. يرجى فتح صفحة التحقق مباشرة من برنامج SideLink.');
      return;
    }

    if (sessionId === 'demo-session-preview') {
      return;
    }

    async function checkInitialStatus() {
      try {
        const res = await fetch(`/api/verification/sessions/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'verified') {
            setStatus('verified');
          } else if (data.status === 'expired') {
            setStatus('expired');
          }
        }
      } catch (e) {
        // Fall through to pending
      }
    }

    checkInitialStatus();
  }, [sessionId]);

  const handleVerify = async () => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('معرّف الجلسة مفقود. يرجى إعادة تشغيل برنامج SideLink.');
      return;
    }

    setStatus('verifying');
    setErrorMessage('');
    
    // Step 1: Handshake
    setVerifyStep(1);
    setVerifyProgress(30);

    await new Promise((r) => setTimeout(r, 550));
    // Step 2: Validate Nonce
    setVerifyStep(2);
    setVerifyProgress(65);

    // If demo preview, simulate smooth complete with full animation
    if (sessionId === 'demo-session-preview' || !nonce) {
      await new Promise((r) => setTimeout(r, 650));
      // Step 3: Issue Token
      setVerifyStep(3);
      setVerifyProgress(100);
      await new Promise((r) => setTimeout(r, 450));
      setStatus('verified');
      return;
    }

    try {
      const resPromise = fetch(`/api/verification/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce }),
      });

      await new Promise((r) => setTimeout(r, 600));
      setVerifyStep(3);
      setVerifyProgress(90);

      const res = await resPromise;
      const data = await res.json();

      if (res.ok && data.success) {
        setVerifyProgress(100);
        await new Promise((r) => setTimeout(r, 400));
        setStatus('verified');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'تم رفض التحقق من الخادم.');
      }
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ في الاتصال بالإنترنت أثناء التحقق.');
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden" dir="rtl">
      {/* Ambient Lighting Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-blue-600/20 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] -right-40 w-[500px] h-[400px] bg-indigo-600/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[400px] bg-cyan-600/15 blur-[140px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="SideLink Logo" 
              className="w-9 h-9 rounded-xl shadow-lg shadow-blue-600/30 object-cover ring-1 ring-blue-500/30" 
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">SideLink</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Gate Lock
              </span>
            </div>
          </div>

          <a 
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            <span>الرئيسية</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="max-w-md w-full mx-auto space-y-6">
          
          {/* Main Verification Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/60 backdrop-blur-2xl relative overflow-hidden transition-all duration-500">
            {/* Top Glowing Gradient Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

            {/* Header with App Logo */}
            <div className="text-center space-y-3 mb-6">
              <div className="inline-flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.png" 
                  alt="SideLink Logo" 
                  className="w-20 h-20 rounded-2xl shadow-xl shadow-blue-500/30 border border-blue-500/40 object-cover relative z-10" 
                />
              </div>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  تأكيد جلسة تشغيل SideLink
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  بوابة التحقق السريع لتأمين جلسة العمل وفتح تطبيق الكمبيوتر
                </p>
              </div>
            </div>

            {/* ======================================================== */}
            {/* STATUS VIEW: VERIFIED (SUCCESS WITH ANIMATED CELEBRATION) */}
            {/* ======================================================== */}
            {status === 'verified' && (
              <div className="text-center py-4 space-y-5 transition-all duration-700 ease-out transform scale-100 opacity-100">
                {/* Animated Ripple Success Badge */}
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping duration-1000" />
                  <div className="relative w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400/80 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                    <CheckCircle2 className="w-11 h-11 text-emerald-400" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تم الترخيص بنجاح • Session Authorized</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">تم فك قفل البرنامج بنجاح!</h2>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
                  <p>
                    تم إرسال إشارة التأكيد إلى تطبيق <strong>SideLink</strong> على حاسوبك، وسيتم فتح واجهة التحكم فوراً.
                  </p>
                  <div className="text-[11px] text-emerald-300 pt-2 border-t border-slate-700/60 flex items-center justify-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>يمكنك الآن إغلاق هذه الصفحة بأمان والعودة لشاشة البرنامج.</span>
                  </div>
                </div>

                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
                >
                  <span>العودة لصفحة التحميل والمعلومات</span>
                </a>
              </div>
            )}

            {/* ======================================================== */}
            {/* STATUS VIEW: VERIFYING (STEPPED PROGRESS ANIMATION) */}
            {/* ======================================================== */}
            {status === 'verifying' && (
              <div className="py-2 space-y-5 transition-all duration-300 ease-out">
                {/* Glowing Radar Icon */}
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000" />
                  <div className="relative w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Fingerprint className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </div>

                {/* Progress Bar with Live % */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-blue-300">جاري التحقق الأمني من الجلسة...</span>
                    <span className="font-mono text-cyan-400">{verifyProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full transition-all duration-500 ease-out rounded-full shadow-sm shadow-blue-500/50" 
                      style={{ width: `${verifyProgress}%` }}
                    />
                  </div>
                </div>

                {/* Stepped Checklist */}
                <div className="bg-slate-950/70 rounded-2xl border border-slate-800/80 p-4 space-y-3 text-xs">
                  {/* Step 1 */}
                  <div className={`flex items-center justify-between transition-colors duration-300 ${verifyStep >= 1 ? 'text-slate-200' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-400" />
                      <span>تأمين بروتوكول التشفير مع السيرفر (Handshake)</span>
                    </span>
                    {verifyStep > 1 ? (
                      <Check className="w-4 h-4 text-emerald-400 font-bold" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className={`flex items-center justify-between transition-colors duration-300 ${verifyStep >= 2 ? 'text-slate-200' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span>فحص ومطابقة مفتاح الـ Nonce السري للجلسة</span>
                    </span>
                    {verifyStep > 2 ? (
                      <Check className="w-4 h-4 text-emerald-400 font-bold" />
                    ) : verifyStep === 2 ? (
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </div>

                  {/* Step 3 */}
                  <div className={`flex items-center justify-between transition-colors duration-300 ${verifyStep >= 3 ? 'text-slate-200' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>توليد وتوقيع تصريح التشغيل (HMAC-SHA256 Token)</span>
                    </span>
                    {verifyProgress === 100 ? (
                      <Check className="w-4 h-4 text-emerald-400 font-bold" />
                    ) : verifyStep === 3 ? (
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STATUS VIEW: PENDING (INITIAL READY STATE) */}
            {/* ======================================================== */}
            {status === 'pending' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Session Timer & Status Chip */}
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>صلاحية الجلسة:</span>
                  </span>
                  <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/60 tracking-wider">
                    {formatTime(secondsRemaining)} متبقية
                  </span>
                </div>

                {/* Session Explanation */}
                <div className="text-xs text-slate-300 leading-relaxed text-center px-1">
                  اضغط على الزر أدناه لتأكيد الجلسة وفك قفل واجهة البرنامج للبدء في توقيع وتثبيت التطبيقات.
                  {sessionId && (
                    <div className="text-[11px] text-slate-500 font-mono mt-2 p-1.5 bg-slate-950/40 rounded border border-slate-800/60 truncate">
                      Session ID: {sessionId.slice(0, 20)}...
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!sessionId}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                >
                  <ShieldCheck className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
                  <span>تأكيد التحقق وفتح البرنامج الآن</span>
                  <ArrowLeft className="w-4 h-4 text-blue-200 group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Security Feature Micro-Badges */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>تشفير محلي آمن ومحمي بالكامل بنظام Windows DPAPI.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>لا يتم إرسال أو حفظ أي كلمات مرور أو بيانات Apple ID نهائياً.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STATUS VIEW: EXPIRED */}
            {/* ======================================================== */}
            {status === 'expired' && (
              <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
                <div className="mx-auto w-16 h-16 bg-amber-500/15 border border-amber-500/40 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Clock className="w-10 h-10 text-amber-400" />
                </div>
                <h2 className="text-xl font-black text-white">انتهت صلاحية جلسة التحقق</h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  انتهت مهلة الـ 10 دقائق المحددة لهذه الجلسة. يرجى العودة إلى برنامج SideLink والضغط على زر <strong>&ldquo;بدء جلسة تحقق جديدة&rdquo;</strong> لفتح جلسة حديثة.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSecondsRemaining(600);
                    setStatus('pending');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة في المتصفح</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STATUS VIEW: ERROR */}
            {/* ======================================================== */}
            {status === 'error' && (
              <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
                <div className="mx-auto w-16 h-16 bg-red-500/15 border border-red-500/40 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
                  <ShieldAlert className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-white">تعذر إكمال التحقق</h2>
                <p className="text-xs sm:text-sm text-red-300 leading-relaxed bg-red-950/40 border border-red-900/60 p-3 rounded-xl">
                  {errorMessage || 'حدث خطأ غير متوقع أثناء معالجة جلسة التحقق.'}
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('pending');
                      setErrorMessage('');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                  >
                    إعادة المحاولة
                  </button>
                  <a
                    href="/"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    العودة للرئيسية
                  </a>
                </div>
              </div>
            )}

          </div>

          {/* Micro Footer Notice */}
          <div className="text-center text-xs text-slate-500 space-y-2">
            <p>SideLink &copy; 2026. Designed for secure personal iOS sideloading.</p>
            <div className="flex justify-center items-center gap-3 text-[11px] text-slate-600">
              <a href="/" className="hover:text-slate-400 transition">تحميل البرنامج</a>
              <span>&bull;</span>
              <a href="/#prerequisites" className="hover:text-slate-400 transition">المتطلبات</a>
              <span>&bull;</span>
              <a href="/#features" className="hover:text-slate-400 transition">المميزات</a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
          <span>جاري تحميل بوابة التحقق...</span>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
