'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import {
  ShieldCheck,
  Download,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Layers,
  ArrowRight,
  ExternalLink,
  WifiOff,
  Flame,
  Globe,
  HelpCircle,
  QrCode,
  Compass
} from 'lucide-react';

interface DirectOtaApp {
  id: string;
  name: string;
  version: string;
  cert: string;
  description: string;
  badge: string;
  badgeColor: string;
  manifestUrl: string;
}

const DIRECT_OTA_APPS: DirectOtaApp[] = [
  {
    id: 'sidelink-container',
    name: 'SideLink Container VIP',
    version: 'v2.1.0',
    cert: 'Viet Nam Rubber (نشطة)',
    description: 'الحاوية الرسمية لتشغيل تطبيقات البلس والألعاب المعدلة مباشرة بدون كمبيوتر مع واجهة SideLink الاحترافية.',
    badge: 'الأكثر استقراراً',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    manifestUrl: 'itms-services://?action=download-manifest&url=https://www.sidelinktool.me/api/web-sideload/manifest?id=sidelink',
  },
  {
    id: 'esign-rubber',
    name: 'ESign iOS (Viet Nam Rubber)',
    version: 'v5.0.2',
    cert: 'Viet Nam Rubber Enterprise',
    description: 'أشهر أداة لتوقيع ملفات IPA وتثبيتها من داخل الآيفون مباشرة مع دعم استيراد الشهادات والـ DNS.',
    badge: 'مباشر فوري',
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    manifestUrl: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/dgaefbobaeop.plist',
  },
  {
    id: 'esign-powerchina',
    name: 'ESign iOS (PowerChina)',
    version: 'v5.0.2',
    cert: 'PowerChina Enterprise',
    description: 'نسخة احتياطية سريعة وموقعة بشهادة مختلفة في حال رغبت بنسخة ثانية على نفس الجهاز.',
    badge: 'سيرفر احتياطي',
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    manifestUrl: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/eoekkbmccjbc.plist',
  },
  {
    id: 'ksign-rubber',
    name: 'KSign iOS (Lightweight)',
    version: 'v3.2.0',
    cert: 'Viet Nam Rubber Enterprise',
    description: 'أداة توقيع خفيفة وسريعة جداً في تثبيت تطبيقات الـ IPA والألعاب بحجم صغير واستهلاك أقل للذاكرة.',
    badge: 'خفيف وسريع',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    manifestUrl: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/idjbbheelkpp.plist',
  },
];

function DirectInstallContent() {
  const searchParams = useSearchParams();
  const enrolled = searchParams?.get('enrolled') === '1';
  const udid = searchParams?.get('udid');
  const deviceModel = searchParams?.get('model') || 'iPhone';

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 w-full" dir="rtl">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[460px] bg-emerald-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] -right-40 w-[520px] h-[360px] bg-blue-600/10 blur-[130px] rounded-full" />
      </div>

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide shadow-sm animate-pulse">
          <Flame className="w-3.5 h-3.5 text-emerald-400" />
          <span>تثبيت مباشر من سفاري بدون كمبيوتر (Over-The-Air OTA)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          ثبّت التطبيقات المعدلة على الآيفون <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            مباشرة بدون لابتوب وبدون توقف
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          نوفر لك الحل المباشر: ثبّت <strong>بروفايل مانع الحظر (Anti-Revoke DNS)</strong> لحجب خوادم فحص أبل، ثم نزّل الحاوية أو تطبيقات التوقيع بضغطة زر واحدة من متصفح Safari.
        </p>

        {/* Device Enrolled Banner */}
        {enrolled && udid && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm text-right flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">تم ربط جهازك بنجاح ({deviceModel}): </span>
                <span className="font-mono text-emerald-200 select-all">{udid}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold shrink-0">
              جاهز للتثبيت
            </span>
          </div>
        )}
      </div>

      {/* 3 STEPS GRID */}
      <div className="space-y-10">

        {/* STEP 1: ANTI-REVOKE DNS PROFILE */}
        <ScrollReveal direction="up" distance={20}>
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/40 border border-emerald-500/40 shadow-2xl shadow-emerald-950/30 hover:border-emerald-500/60 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6 mb-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">1</span>
                  <span>الخطوة الأولى (ضرورية لحماية التطبيقات من التوقف)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  تثبيت درع مانع الحظر (SideLink Anti-Revoke DNS Profile)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  يقوم هذا البروفايل بحجب خوادم أبل المسؤولة عن إلغاء الشهادات (<code className="text-emerald-400 font-mono">ocsp.apple.com</code> و <code className="text-emerald-400 font-mono">valid.apple.com</code>) لتستمر تطبيقاتك بالعمل مدى الحياة حتى بعد إيقاف الشهادة عالمياً.
                </p>
              </div>

              {/* Direct Profile Download Button */}
              <a
                href="/api/dns/download"
                className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 active:scale-95 transition-all duration-200 hover:-translate-y-0.5 shrink-0 border border-emerald-400/40 group cursor-pointer"
              >
                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                <span>تثبيت بروفايل مانع الحظر (DNS)</span>
              </a>
            </div>

            {/* Step-by-Step Mini Guide */}
            <div className="grid sm:grid-cols-3 gap-4 text-right">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">أ</span>
                  <span>التحميل عبر متصفح Safari</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  اضغط الزر الأخضر من متصفح <strong>Safari</strong> فقط، وعند ظهور نافذة الإذن اختر <strong>&quot;السماح (Allow)&quot;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px]">ب</span>
                  <span>الإعدادات Settings</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  افتح تطبيق <strong>الإعدادات</strong> على الآيفون، ستجد بالأعلى مباشرة خياراً اسمه <strong>&quot;تم تنزيل ملف التعريف&quot;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">ج</span>
                  <span>التثبيت الفوري</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  اضغط <strong>تثبيت (Install)</strong> واكتب رمز قفل الهاتف. هكذا تم حظر سيرفرات الإلغاء وحماية جهازك!
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* STEP 2: ONE-CLICK OTA INSTALL APPS */}
        <ScrollReveal direction="up" distance={20} delayMs={100}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
                  <span>الخطوة الثانية: اختر التطبيق المطلوب وثبّته بنقرة واحدة</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  حزم التثبيت المباشر (OTA One-Click Installers)
                </h2>
              </div>
              <span className="text-xs text-slate-400">تفتح نافذة التثبيت الرسمية على الآيفون مباشرة</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {DIRECT_OTA_APPS.map((app) => (
                <div
                  key={app.id}
                  className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/10 group text-right"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                          {app.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-emerald-400 font-semibold">{app.version}</span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-xs text-slate-400 font-mono">{app.cert}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${app.badgeColor}`}>
                        {app.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {app.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-2">
                    <a
                      href={app.manifestUrl}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 active:scale-95 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>تثبيت مباشر على الآيفون</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopy(app.id, app.manifestUrl)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition"
                      title="نسخ رابط التثبيت"
                    >
                      {copiedId === app.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* STEP 3: TRUST ENTERPRISE CERTIFICATE */}
        <ScrollReveal direction="up" distance={20} delayMs={150}>
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-right space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-purple-500 text-slate-950 font-black text-xs flex items-center justify-center">3</span>
              <span>الخطوة الثالثة والأخيرة: توثيق الشهادة (Trust Developer)</span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white">
              كيف تفتح التطبيق بعد اكتمال تثبيته على الشاشة الرئيسية؟
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              عند فتح التطبيق لأول مرة ستظهر رسالة &quot;مطور مؤسسة غير موثوق به&quot;. هذه خطوة أمان طبيعية في نظام iOS، وتوثيقها يستغرق 5 ثوانٍ فقط:
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-200">
              <span className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300">1. الإعدادات (Settings)</span>
              <ArrowRight className="w-4 h-4 text-slate-500 rotate-180" />
              <span className="px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300">2. عام (General)</span>
              <ArrowRight className="w-4 h-4 text-slate-500 rotate-180" />
              <span className="px-3 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300">3. VPN وإدارة الجهاز</span>
              <ArrowRight className="w-4 h-4 text-slate-500 rotate-180" />
              <span className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300">4. اضغط على اسم الشهادة ثم &quot;الوثوق (Trust)&quot;</span>
            </div>
          </div>
        </ScrollReveal>

        {/* EMERGENCY RESCUE: UNABLE TO VERIFY BYPASS HACK */}
        <ScrollReveal direction="up" distance={20} delayMs={200}>
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 border border-amber-500/30 text-right space-y-4 hover:border-amber-500/50 transition-colors">
            <div className="flex items-center gap-2.5 font-bold text-amber-300 text-base sm:text-lg">
              <WifiOff className="w-6 h-6 text-amber-400 shrink-0" />
              <span>حل سحري لمشكلة &quot;تعذر التحقق من التطبيق&quot; (Unable to Verify App):</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              إذا ظهرت لك هذه الرسالة في أي وقت وكان بروفايل الـ DNS مثبتاً على هاتفك، استخدم هذه الحيلة الذكية لفتح التطبيق وتجاوز فحص أبل بدون الحاجة لإعادة التثبيت أو فقدان بياناتك:
            </p>

            <div className="grid sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                <span className="font-bold text-amber-300 block">1. وضع الطيران</span>
                <p className="text-slate-400 text-[11px]">فعّل &quot;نمط الطيران&quot; وتأكد من إغلاق الـ Wi-Fi والبيانات تماماً.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                <span className="font-bold text-amber-300 block">2. مسح تاريخ Safari</span>
                <p className="text-slate-400 text-[11px]">ادخل: الإعدادات &gt; Safari &gt; اضغط &quot;مسح سجل التاريخ وبيانات الموقع&quot;.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                <span className="font-bold text-amber-300 block">3. افتح التطبيق</span>
                <p className="text-slate-400 text-[11px]">افتح التطبيق أثناء استمرار نمط الطيران، سيفتح معك فوراً وبنجاح!</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-1">
                <span className="font-bold text-emerald-300 block">4. أعد تشغيل النت</span>
                <p className="text-slate-400 text-[11px]">أوقف نمط الطيران واستمتع بالتطبيق مع بقاء مانع الحظر نشطاً.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* MODDED IPAs LINK BANNER */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>تريد تحميل ملفات تطبيقات معدلة (WhatsApp Plus, YouTube, Games)؟</span>
            </h4>
            <p className="text-xs text-slate-400">
              استكشف مكتبتنا الضخمة لتحميل ملفات الـ IPA المعدلة وتثبيتها مباشرة داخل الحاوية أو ESign.
            </p>
          </div>

          <a
            href="/modded-ipas"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shrink-0"
          >
            <span>تصفح التطبيقات المعدلة</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </a>
        </div>

      </div>
    </main>
  );
}

export default function DirectInstallPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <Navbar />
      <Suspense fallback={<div className="text-center py-24 text-slate-500 text-xs">جارٍ التحميل...</div>}>
        <DirectInstallContent />
      </Suspense>
      <Footer />
    </div>
  );
}

