'use client';

import React, { useState } from 'react';
import { Smartphone, RefreshCw, Wifi, ShieldCheck, Download, QrCode, CheckCircle2, ChevronRight, Server, Key } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function MobileCompanionPage() {
  const [udidInput, setUdidInput] = useState('');
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const checkDevice = async () => {
    if (!udidInput.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setDeviceData(null);
    try {
      const res = await fetch(`/api/mobile/sync?udid=${encodeURIComponent(udidInput.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDeviceData(data.device);
      } else {
        setErrorMsg(data.error || 'لم يتم العثور على جهاز مسجل بهذا المعرّف.');
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
            <Wifi className="w-3.5 h-3.5" />
            <span>نظام التجديد عن بعد (On-Device Wireless Refresh)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6 leading-tight">
            جدّد تطبيقاتك وألعابك <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              من داخل الآيفون مباشرة بدون كمبيوتر
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            تقنية ثورية تعتمد على حزمة شبكة محلية داخل الهاتف وخادم Anisette سحابي فائق السرعة، لتجديد شهادات تطبيقاتك كل 7 أيام تلقائياً وأنت في أي مكان بدون كابل USB أو إعادة تثبيت!
          </p>
        </div>

        {/* 3 Main Pillars Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">تجديد فوري في ثانية واحدة</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              لا داعي لإعادة نقل وتثبيت الـ 3 جيجا للعبة eFootball أو غيرها؛ يتم تحديث ملف التعريف الرقمي للعبة في ثانية واحدة والحفاظ على جميع بياناتك.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">خادم Anisette سحابي مدمج</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              نوفر خادماً سحابياً مجانياً وفائق السرعة لمصادقة أبل، لتتمكن من التوقيع والتجديد من أي شبكة Wi-Fi أو بيانات خلوية بدون Mac أو سيرفر خاص.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">اقتران تلقائي 100%</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              تقوم أداة SideLink للويندوز باستخراج ملف الاقتران (Pairing File) من نظام جهازك ودمجه تلقائياً داخل التطبيق لتجاوز أكثر خطوة معقدة للمستخدمين.
            </p>
          </div>
        </div>

        {/* Step-by-Step Setup Guide */}
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-blue-400" />
            <span>كيف يعمل نظام التجديد عن بعد (4 خطوات سهلة):</span>
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">1</div>
              <div>
                <h4 className="font-bold text-white text-base mb-1">تثبيت تطبيق الرفيق من SideLink Desktop</h4>
                <p className="text-slate-400 text-xs sm:text-sm">
                  افتح أداة SideLink على الويندوز أثناء توصيل الآيفون بالكابل لمرة واحدة، واضغط على تبويب <strong>"SideLink Mobile"</strong> ثم اضغط <strong>"تثبيت وإعداد الرفيق على الهاتف"</strong>. ستقوم الأداة بدمج ملف الاقتران وتثبيت التطبيق فوراً.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">2</div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-base mb-1">تفعيل بروفايل WireGuard Loopback</h4>
                <p className="text-slate-400 text-xs sm:text-sm mb-3">
                  يقوم بروفايل WireGuard الداخلي بتوجيه اتصالات التثبيت داخلياً داخل الآيفون لتجاوز الحاجة لكمبيوتر:
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/mobile/wireguard"
                    download="SideLink-Loopback.conf"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>تحميل ملف SideLink-Loopback.conf</span>
                  </a>
                  <span className="text-xs text-slate-500 self-center">(أو قم باستيراده عبر رمز الـ QR من داخل أداة الكمبيوتر)</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">3</div>
              <div>
                <h4 className="font-bold text-white text-base mb-1">ضبط خادم Anisette المباشر</h4>
                <p className="text-slate-400 text-xs sm:text-sm mb-2">
                  التطبيق مضبوط تلقائياً على خادمنا السحابي السريع. يمكنك التحقق من الرابط في إعدادات التطبيق على الآيفون:
                </p>
                <code className="text-xs bg-slate-900 text-blue-400 px-2.5 py-1 rounded border border-slate-800 font-mono select-all">
                  https://sidelink-web.vercel.app/api/mobile/anisette
                </code>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-green-600 text-white font-bold flex items-center justify-center shrink-0">4</div>
              <div>
                <h4 className="font-bold text-white text-base mb-1">استمتع بالتجديد التلقائي مدى الحياة</h4>
                <p className="text-slate-400 text-xs sm:text-sm">
                  بمجرد تشغيل الـ VPN الداخلي والضغط على زر <strong>Refresh All</strong> داخل التطبيق على الآيفون، ستتجدد ألعابك وتطبيقاتك في ثوانٍ معدودة بدون لمس الكمبيوتر!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Device Status & Pairing Check Section */}
        <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800/80">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>فحص حالة اقتران وتجديد جهازك على السحابة:</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">
            أدخل معرّف جهازك (UDID) للتحقق مما إذا كان ملف الاقتران محفوظاً على السحابة وعدد الأيام المتبقية لتطبيقاتك:
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-xl mb-6">
            <input
              type="text"
              placeholder="مثال: 00008020-000E6D583C30003A"
              value={udidInput}
              onChange={(e) => setUdidInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={checkDevice}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-colors"
            >
              {loading ? 'جارٍ الفحص...' : 'فحص الجهاز'}
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
              {errorMsg}
            </div>
          )}

          {deviceData && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>الجهاز مقترن ومتصل بالسحابة بنجاح!</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">اسم الجهاز:</span>
                  <span className="text-white font-semibold">{deviceData.deviceName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">تاريخ آخر مزامنة:</span>
                  <span className="text-slate-300 font-mono">{new Date(deviceData.lastSyncAt).toLocaleString('ar-EG')}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
                <a
                  href={`/api/mobile/pairing?udid=${deviceData.udid}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف الاقتران (.mobiledevicepairing)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
