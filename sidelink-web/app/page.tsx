import React from 'react';
import Navbar from '../components/Navbar';
import TypewriterTitle from '../components/TypewriterTitle';
import ModdedIpaSection from '../components/ModdedIpaSection';
import SigningToolsSection from '../components/SigningToolsSection';
import ScrollReveal from '../components/ScrollReveal';
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
      {/* Background Glow with Pulse Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[480px] bg-blue-600/15 blur-[140px] rounded-full animate-pulse-glow" />
        <div className="absolute top-[35%] -right-40 w-[550px] h-[380px] bg-indigo-600/10 blur-[130px] rounded-full animate-float-slow" />
        <div className="absolute top-[65%] -left-40 w-[550px] h-[380px] bg-cyan-600/10 blur-[130px] rounded-full animate-float" />
      </div>

      {/* Interactive Sticky Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide shadow-sm animate-float">
          <Sparkles className="w-3.5 h-3.5" />
          <span>الأداة الرسمية لتثبيت وتوقيع تطبيقات الآيفون (IPA) على ويندوز</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight animate-fade-in-up">
          <span className="text-shimmer">تثبيت تطبيقات iOS وتجديدها تلقائياً</span> <br />
          <TypewriterTitle text="SideLink for Windows" className="mt-2" />
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
          أداة ويندوز سريعة ومستقرة تمكّنك من تثبيت أي ملف IPA وتوقيعه رقمياً بشهادتك وحسابك الشخصي، مع نظام ذكي لتفادي تعارض أسماء الحزم والتجديد التلقائي لشهادات الـ 7 أيام بدون حاجة للجيلبريك.
        </p>

        {/* CTA Buttons */}
        <div id="download" className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 scroll-mt-28">
          <a
            href="/downloads/SideLink-v1.0.0-win-x64.zip"
            download="SideLink-v1.0.0-win-x64.zip"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 border border-blue-400/30 group"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            <div className="text-right">
              <div>تحميل برنامج SideLink للويندوز</div>
              <div className="text-xs font-normal text-blue-200">النسخة الرسمية v1.0.0 (ملف مضغوط ZIP • 25 MB)</div>
            </div>
          </a>

          <a
            href="#prerequisites"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 hover:text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-1 border border-slate-800 hover:border-slate-700"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>المتطلبات الأساسية (iTunes &amp; iCloud)</span>
          </a>
        </div>

        {/* Quick Specs Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 transition-all">
            <Cpu className="w-3.5 h-3.5 text-blue-400" /> Windows 10 &amp; 11 (64-bit)
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 transition-all">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> يدعم جميع إصدارات iOS حتى iOS 18+
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 transition-all">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> توقيع رقمي محلي وآمن 100%
          </span>
        </div>
      </section>

      {/* Prerequisites Section (CRITICAL) */}
      <section id="prerequisites" className="py-16 px-4 max-w-5xl mx-auto scroll-mt-20">
        <ScrollReveal>
          <div className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>خطوة ضرورية قبل تشغيل الأداة</span>
            </div>
            <h2 className="text-3xl font-black text-white"><span className="text-shimmer">المتطلبات الأساسية للتشغيل</span> (Prerequisites)</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              لكي تتمكن أداة SideLink من الاتصال بجهاز الآيفون عبر كابل الـ USB وتوقيع وتثبيت التطبيقات، يجب تثبيت البرامج التالية من روابط أبل المباشرة.
            </p>
          </div>
        </ScrollReveal>

        {/* Microsoft Store Warning Box */}
        <ScrollReveal delayMs={100}>
          <div className="mb-10 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 text-right hover:border-amber-500/50 transition-colors">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-base">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
              <span>تنبيه هام جداً بخصوص متجر مايكروسوفت (Microsoft Store):</span>
            </div>
            <p className="text-sm leading-relaxed text-amber-200/90 pr-7">
              <strong>لا تقم بتثبيت iTunes أو iCloud من متجر Microsoft Store!</strong> نسخ المتجر تفتقر إلى مكتبات تعريف الأجهزة المباشرة (Apple Mobile Device Support) وخادم usbmuxd المطلوبين لربط وتثبيت ملفات الـ IPA. قم بتحميل النسخ الأصلية المباشرة من أزرار التحميل أدناه حصراً:
            </p>
          </div>
        </ScrollReveal>

        {/* Prerequisites Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: iTunes */}
          <ScrollReveal delayMs={150}>
            <div className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10 group text-right h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 mr-0 ml-auto">
                  <Usb className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">المطلب الأول</div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">Apple iTunes (64-bit)</h3>
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-blue-600/20 active:scale-95"
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
          </ScrollReveal>

          {/* Card 2: iCloud */}
          <ScrollReveal delayMs={250}>
            <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/10 group text-right h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 mr-0 ml-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">المطلب الثاني</div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">Apple iCloud (64-bit)</h3>
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-indigo-600/20 active:scale-95"
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
          </ScrollReveal>

          {/* Card 3: .NET 8 */}
          <ScrollReveal delayMs={350}>
            <div className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-cyan-500/10 group text-right h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 mr-0 ml-auto">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">المطلب الثالث</div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">.NET 8.0 Desktop Runtime</h3>
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-cyan-600/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>تحميل .NET 8.0 (من مايكروسوفت)</span>
                </a>
                <div className="text-center text-[11px] text-slate-500 py-1">
                  اختر Windows x64 Desktop Runtime
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Modded IPAs Library Section */}
      <ModdedIpaSection />

      {/* On-Device Signing (ESign / KSign) & Enterprise Certificates Section */}
      <SigningToolsSection />

      {/* Step-by-Step Guide */}
      <section id="guide" className="py-16 px-4 max-w-5xl mx-auto border-t border-slate-800/80 scroll-mt-20">
        <ScrollReveal>
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-black text-white"><span className="text-shimmer">دليل التثبيت والبدء السريع</span></h2>
            <p className="text-slate-400 text-sm sm:text-base">
              4 خطوات بسيطة لتشغيل الأداة وتثبيت أي تطبيق IPA على هاتفك الآيفون
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
          {/* Step 1 */}
          <ScrollReveal delayMs={100}>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 relative space-y-3 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-blue-500/10 group h-full">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">تثبيت المتطلبات</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                قم بتثبيت iTunes و iCloud من روابط أبل المباشرة أعلاه، ثم أعد تشغيل الكمبيوتر لضمان تشغيل خدمات أبل بالخلفية.
              </p>
            </div>
          </ScrollReveal>

          {/* Step 2 */}
          <ScrollReveal delayMs={200}>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 relative space-y-3 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-indigo-500/10 group h-full">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">تحميل وفك الضغط</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                قم بتحميل ملف الأداة المضغوط <code className="text-indigo-300">SideLink-v1.0.0-win-x64.zip</code> وفك الضغط عنه في مجلد على سطح المكتب.
              </p>
            </div>
          </ScrollReveal>

          {/* Step 3 */}
          <ScrollReveal delayMs={300}>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 relative space-y-3 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-cyan-500/10 group h-full">
              <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-cyan-600/30 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">توصيل الآيفون</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                صِل هاتفك بالكمبيوتر عبر كابل USB، افتح قفل الشاشة واضغط على <strong>الوثوق بهذا الكمبيوتر (Trust)</strong> إذا طُلب منك.
              </p>
            </div>
          </ScrollReveal>

          {/* Step 4 */}
          <ScrollReveal delayMs={400}>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 relative space-y-3 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-emerald-500/10 group h-full">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                4
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">التثبيت والتوقيع</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                شغّل <code className="text-emerald-300">SideLink.App.exe</code>، اختر ملف IPA ثم اضغط <strong>Sign &amp; Install</strong> ليتم توقيعه وتثبيته مباشرة!
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="py-16 px-4 max-w-6xl mx-auto border-t border-slate-800/80 scroll-mt-20">
        <ScrollReveal>
          <h2 className="text-3xl font-black text-center text-white mb-12"><span className="text-shimmer">أهم مميزات SideLink</span></h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-6 text-right">
          {[
            {
              icon: Smartphone,
              title: 'توصيل فوري عبر Usbmux',
              desc: 'التعرف الفوري على جهاز الآيفون وتحديد طراز الجهاز وإصدار iOS وحالة القفل والاقتران بدقة متناهية عبر منفذ USB.',
              color: 'text-blue-400',
              hoverBorder: 'hover:border-blue-500/40',
            },
            {
              icon: Layers,
              title: 'توقيع رقمي أصلي (Mach-O)',
              desc: 'محرك توقيع رقمي محلي متقدم يقوم بحقن الـ Entitlements وتوقيع كافة الملفات التنفيذية والمكتبات بدون أي تعليق أو بطء.',
              color: 'text-indigo-400',
              hoverBorder: 'hover:border-indigo-500/40',
            },
            {
              icon: RefreshCw,
              title: 'تجديد تلقائي كل 7 أيام',
              desc: 'متابعة دقيقة لصلاحية الشهادات المجانية والتجديد التلقائي للتطبيقات المثبتة قبل انتهاء صلاحيتها لتظل تعمل دائماً دون توقف.',
              color: 'text-cyan-400',
              hoverBorder: 'hover:border-cyan-500/40',
            },
            {
              icon: ShieldCheck,
              title: 'تشفير كامل Windows DPAPI',
              desc: 'حسابات وكلمات سر Apple ID لا تُخزن أبداً بنصوص مكشوفة، بل تُشفر بمفتاح محلي خاص بجهازك فقط عبر Windows DPAPI.',
              color: 'text-emerald-400',
              hoverBorder: 'hover:border-emerald-500/40',
            },
            {
              icon: Cpu,
              title: 'تعديل معرف الحزمة (Bundle ID)',
              desc: 'إمكانية تثبيت نسختين من أي تطبيق وتفادي تعارض الـ Bundle IDs الرسمية مع متجر App Store بضغطة زر واحدة.',
              color: 'text-purple-400',
              hoverBorder: 'hover:border-purple-500/40',
            },
            {
              icon: HardDrive,
              title: 'خفيف ولا يحتاج تثبيت معقد',
              desc: 'البرنامج يعمل بنظام Portable خفيف، فقط قم بفك الضغط وتشغيل الملف التنفيذي مباشرة دون إضافات ثقيلة على نظامك.',
              color: 'text-rose-400',
              hoverBorder: 'hover:border-rose-500/40',
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={index} delayMs={index * 80}>
                <div className={`p-6 bg-slate-900/60 border border-slate-800 rounded-2xl ${item.hoverBorder} transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-900/80 group h-full`}>
                  <Icon className={`w-8 h-8 ${item.color} mb-4 group-hover:scale-110 transition-transform duration-300`} />
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* Bottom Download CTA Box */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="rounded-3xl bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/30 p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl transition-all duration-500 hover:border-blue-400/50">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mx-auto flex items-center justify-center text-blue-400 shadow-inner animate-float">
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
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 active:scale-95 group"
              >
                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                <span>تحميل SideLink v1.0.0 (ملف ZIP)</span>
              </a>
              <a
                href="#prerequisites"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all duration-300 hover:-translate-y-1"
              >
                <span>مراجعة المتطلبات الأساسية</span>
              </a>
            </div>

            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
              <div className="hover:-translate-y-0.5 transition-transform">
                <span className="text-slate-500 block mb-1">الإصدار:</span>
                <strong className="text-slate-200 font-semibold">v1.0.0 Stable</strong>
              </div>
              <div className="hover:-translate-y-0.5 transition-transform">
                <span className="text-slate-500 block mb-1">الحجم:</span>
                <strong className="text-slate-200 font-semibold">~25 MB</strong>
              </div>
              <div className="hover:-translate-y-0.5 transition-transform">
                <span className="text-slate-500 block mb-1">النظام المدعوم:</span>
                <strong className="text-slate-200 font-semibold">Windows 10 / 11 (64-bit)</strong>
              </div>
              <div className="hover:-translate-y-0.5 transition-transform">
                <span className="text-slate-500 block mb-1">الترخيص:</span>
                <strong className="text-slate-200 font-semibold">مجاني بالكامل</strong>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600 space-y-2">
        <p>SideLink &copy; 2026. Designed for reliable personal iOS application sideloading and management.</p>
        <p className="text-[11px] text-slate-600">Apple, iPhone, iTunes, and iCloud are trademarks of Apple Inc., registered in the U.S. and other countries.</p>
      </footer>
    </div>
  );
}
