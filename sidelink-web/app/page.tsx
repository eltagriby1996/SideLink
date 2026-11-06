import React from 'react';
import TypewriterTitle from '../components/TypewriterTitle';
import ModdedIpaSection from '../components/ModdedIpaSection';
import SigningToolsSection from '../components/SigningToolsSection';
import {
  Smartphone,
  RefreshCw,
  ShieldCheck,
  Download,
  AlertTriangle,
  ExternalLink,
  Cpu,
  Sparkles,
  Usb,
  Layers,
  KeyRound,
  ShieldAlert,
  HardDrive
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-blue-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[35%] -right-40 w-[500px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-[65%] -left-40 w-[500px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full" />
      </div>

      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="SideLink Logo"
              className="w-9 h-9 rounded-xl shadow-lg shadow-blue-600/30 object-cover ring-1 ring-blue-500/30"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">
                SideLink
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                v1.0.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300 font-medium">
            <a href="#download" className="hover:text-white transition">
              تحميل الأداة
            </a>
            <a href="#modded-ipas" className="hover:text-white transition text-blue-400 font-bold">
              تطبيقات IPA معدلة
            </a>
            <a href="#esign-ksign" className="hover:text-white transition text-emerald-400 font-bold">
              ESign والشهادات (P12)
            </a>
            <a href="#prerequisites" className="hover:text-white transition">
              المتطلبات الأساسية
            </a>
            <a href="#guide" className="hover:text-white transition">
              دليل الاستخدام
            </a>
            <a href="#features" className="hover:text-white transition">
              المميزات
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/downloads/SideLink-v1.0.0-win-x64.zip"
              download="SideLink-v1.0.0-win-x64.zip"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-xs sm:text-sm shadow-lg shadow-blue-600/25 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ZIP</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>الأداة الرسمية لتثبيت وتوقيع تطبيقات الآيفون (IPA) على ويندوز</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          تثبيت تطبيقات iOS وتجديدها تلقائياً <br />
          <TypewriterTitle text="SideLink for Windows" className="mt-2" />
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
          أداة ويندوز سريعة ومستقرة تمكّنك من تثبيت أي ملف IPA وتوقيعه رقمياً بشهادتك وحسابك الشخصي، مع نظام ذكي لتفادي تعارض أسماء الحزم والتجديد التلقائي لشهادات الـ 7 أيام بدون حاجة للجيلبريك.
        </p>

        {/* CTA Buttons */}
        <div id="download" className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/downloads/SideLink-v1.0.0-win-x64.zip"
            download="SideLink-v1.0.0-win-x64.zip"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition active:scale-95 border border-blue-400/30 group"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <div className="text-right">
              <div>تحميل برنامج SideLink للويندوز</div>
              <div className="text-xs font-normal text-blue-200">النسخة الرسمية v1.0.0 (ملف مضغوط ZIP • 25 MB)</div>
            </div>
          </a>

          <a
            href="#prerequisites"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 hover:text-white font-semibold text-sm transition border border-slate-800 hover:border-slate-700"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>المتطلبات الأساسية (iTunes &amp; iCloud)</span>
          </a>
        </div>

        {/* Quick Specs Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-blue-400" /> Windows 10 &amp; 11 (64-bit)
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> يدعم جميع إصدارات iOS حتى iOS 18+
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> توقيع رقمي محلي وآمن 100%
          </span>
        </div>
      </section>

      {/* Prerequisites Section (CRITICAL) */}
      <section id="prerequisites" className="py-16 px-4 max-w-5xl mx-auto scroll-mt-20">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>خطوة ضرورية قبل تشغيل الأداة</span>
          </div>
          <h2 className="text-3xl font-black text-white">المتطلبات الأساسية للتشغيل (Prerequisites)</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            لكي تتمكن أداة SideLink من الاتصال بجهاز الآيفون عبر كابل الـ USB وتوقيع وتثبيت التطبيقات، يجب تثبيت البرامج التالية من روابط أبل المباشرة.
          </p>
        </div>

        {/* Microsoft Store Warning Box */}
        <div className="mb-10 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 text-right">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-base">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
            <span>تنبيه هام جداً بخصوص متجر مايكروسوفت (Microsoft Store):</span>
          </div>
          <p className="text-sm leading-relaxed text-amber-200/90 pr-7">
            <strong>لا تقم بتثبيت iTunes أو iCloud من متجر Microsoft Store!</strong> نسخ المتجر تفتقر إلى مكتبات تعريف الأجهزة المباشرة (Apple Mobile Device Support) وخادم usbmuxd المطلوبين لربط وتثبيت ملفات الـ IPA. قم بتحميل النسخ الأصلية المباشرة من أزرار التحميل أدناه حصراً:
          </p>
        </div>

        {/* Prerequisites Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: iTunes */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 group text-right">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mr-0 ml-auto">
                <Usb className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">المطلب الأول</div>
                <h3 className="text-lg font-bold text-white">Apple iTunes (64-bit)</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                يحتوي على تعريفات Apple الرسمية وخادم <strong>usbmuxd</strong> ومكتبات <strong>Apple Mobile Device Support</strong> اللازمة للتعرف على الآيفون بالـ USB.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <a
                href="https://www.apple.com/itunes/download/win64"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-600/20 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل iTunes (رابط أبل الرسمي المباشر)</span>
              </a>
              <a
                href="https://support.apple.com/en-us/106372"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition"
              >
                <span>صفحة تعليمات Apple الرسمية</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Card 2: iCloud */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 group text-right">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform mr-0 ml-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">المطلب الثاني</div>
                <h3 className="text-lg font-bold text-white">Apple iCloud (64-bit)</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                ضروري لتوفير بيانات المصادقة السحابية <strong>Anisette Data</strong> لتسجيل الدخول بحساب أبل وتوليد شهادات التوقيع الرقمي بنجاح.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <a
                href="https://updates.cdn-apple.com/2020/windows/001-39935-20200911-1A70AA56-F448-11EA-8CC0-99D41950005E/iCloudSetup.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل iCloud (رابط أبل الرسمي المباشر)</span>
              </a>
              <a
                href="https://support.apple.com/en-us/102670"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition"
              >
                <span>صفحة تعليمات Apple الرسمية</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Card 3: .NET 8 */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 group text-right">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform mr-0 ml-auto">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">المطلب الثالث</div>
                <h3 className="text-lg font-bold text-white">.NET 8.0 Desktop Runtime</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                حزمة تشغيل برامج دوت نت الرسمية من مايكروسوفت لتشغيل واجهة ونواة البرنامج بسرعة وكفاءة عالية على ويندوز 10 و 11.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <a
                href="https://dotnet.microsoft.com/en-us/download/dotnet/8.0"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>تحميل .NET 8.0 (من مايكروسوفت)</span>
              </a>
              <div className="text-center text-[11px] text-slate-500 py-1">
                اختر Windows x64 Desktop Runtime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modded IPAs Library Section */}
      <ModdedIpaSection />

      {/* On-Device Signing (ESign / KSign) & Enterprise Certificates Section */}
      <SigningToolsSection />

      {/* Step-by-Step Guide */}
      <section id="guide" className="py-16 px-4 max-w-5xl mx-auto border-t border-slate-800/80 scroll-mt-20">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-black text-white">دليل التثبيت والبدء السريع</h2>
          <p className="text-slate-400 text-sm sm:text-base">
            4 خطوات بسيطة لتشغيل الأداة وتثبيت أي تطبيق IPA على هاتفك الآيفون
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
              1
            </div>
            <h3 className="font-bold text-white text-base">تثبيت المتطلبات</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              قم بتثبيت iTunes و iCloud من روابط أبل المباشرة أعلاه، ثم أعد تشغيل الكمبيوتر لضمان تشغيل خدمات أبل بالخلفية.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/30">
              2
            </div>
            <h3 className="font-bold text-white text-base">تحميل وفك الضغط</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              قم بتحميل ملف الأداة المضغوط <code className="text-indigo-300">SideLink-v1.0.0-win-x64.zip</code> وفك الضغط عنه في مجلد على سطح المكتب.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-cyan-600/30">
              3
            </div>
            <h3 className="font-bold text-white text-base">توصيل الآيفون</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              صِل هاتفك بالكمبيوتر عبر كابل USB، افتح قفل الشاشة واضغط على <strong>الوثوق بهذا الكمبيوتر (Trust)</strong> إذا طُلب منك.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/30">
              4
            </div>
            <h3 className="font-bold text-white text-base">التثبيت والتوقيع</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              شغّل <code className="text-emerald-300">SideLink.App.exe</code>، اختر ملف IPA ثم اضغط <strong>Sign &amp; Install</strong> ليتم توقيعه وتثبيته مباشرة!
            </p>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="py-16 px-4 max-w-6xl mx-auto border-t border-slate-800/80">
        <h2 className="text-3xl font-black text-center text-white mb-12">أهم مميزات SideLink</h2>
        <div className="grid md:grid-cols-3 gap-6 text-right">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <Smartphone className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">توصيل فوري عبر Usbmux</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              التعرف الفوري على جهاز الآيفون وتحديد طراز الجهاز وإصدار iOS وحالة القفل والاقتران بدقة متناهية عبر منفذ USB.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <Layers className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">توقيع رقمي أصلي (Mach-O)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              محرك توقيع رقمي محلي متقدم يقوم بحقن الـ Entitlements وتوقيع كافة الملفات التنفيذية والمكتبات بدون أي تعليق أو بطء.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <RefreshCw className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">تجديد تلقائي كل 7 أيام</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              متابعة دقيقة لصلاحية الشهادات المجانية والتجديد التلقائي للتطبيقات المثبتة قبل انتهاء صلاحيتها لتظل تعمل دائماً دون توقف.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">تشفير كامل Windows DPAPI</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              حسابات وكلمات سر Apple ID لا تُخزن أبداً بنصوص مكشوفة، بل تُشفر بمفتاح محلي خاص بجهازك فقط عبر Windows DPAPI.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <Cpu className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">تعديل معرف الحزمة (Bundle ID)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              إمكانية تثبيت نسختين من أي تطبيق وتفادي تعارض الـ Bundle IDs الرسمية مع متجر App Store بضغطة زر واحدة.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <HardDrive className="w-8 h-8 text-rose-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">خفيف ولا يحتاج تثبيت معقد</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              البرنامج يعمل بنظام Portable خفيف، فقط قم بفك الضغط وتشغيل الملف التنفيذي مباشرة دون إضافات ثقيلة على نظامك.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Download CTA Box */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/30 p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mx-auto flex items-center justify-center text-blue-400 shadow-inner">
            <Download className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white">
            جاهز لتجربة SideLink على جهازك؟
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            حمّل النسخة الكاملة الآن واستمتع بتثبيت وإدارة تطبيقاتك على الآيفون بكل حرية وسهولة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="/downloads/SideLink-v1.0.0-win-x64.zip"
              download="SideLink-v1.0.0-win-x64.zip"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>تحميل SideLink v1.0.0 (ملف ZIP)</span>
            </a>
            <a
              href="#prerequisites"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition"
            >
              <span>مراجعة المتطلبات الأساسية</span>
            </a>
          </div>

          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
            <div>
              <span className="text-slate-500 block mb-1">الإصدار:</span>
              <strong className="text-slate-200 font-semibold">v1.0.0 Stable</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">الحجم:</span>
              <strong className="text-slate-200 font-semibold">~25 MB</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">النظام المدعوم:</span>
              <strong className="text-slate-200 font-semibold">Windows 10 / 11 (64-bit)</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">الترخيص:</span>
              <strong className="text-slate-200 font-semibold">مجاني بالكامل</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600 space-y-2">
        <p>SideLink &copy; 2026. Designed for reliable personal iOS application sideloading and management.</p>
        <p className="text-[11px] text-slate-600">Apple, iPhone, iTunes, and iCloud are trademarks of Apple Inc., registered in the U.S. and other countries.</p>
      </footer>
    </div>
  );
}
