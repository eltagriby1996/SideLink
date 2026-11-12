import React from 'react';
import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ModdedIpaSection from '../../components/ModdedIpaSection';
import { Sparkles, Layers, ShieldCheck, Download, Smartphone, Clock, PlusCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'تطبيقات معدلة وألعاب بلس — SideLink Modded IPAs',
  description: 'مكتبة تطبيقات الآيفون المعدلة (IPA) بروابط مباشرة وتحديثات مستمرة: تطبيقات بلس، ألعاب مهكرة، ومحاكيات للآيفون والآيباد.',
};

export default function ModdedIpasPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] -left-40 w-[500px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full" />
      </div>

      <Navbar />

      <main className="pt-12 pb-24">
        {/* Hero Section for Modded Apps */}
        <section className="px-4 max-w-5xl mx-auto text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مكتبة ملفات IPA المعدلة والجاهزة للتوقيع</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            تطبيقات الآيفون <span className="text-amber-400">المعدلة (Plus)</span> والألعاب <span className="text-blue-500">الحصرية</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            حمل أشهر تطبيقات السوشيال ميديا بلس، تطبيقات المشاهدة والاستماع بدون إعلانات، وألعاب المحاكيات بصيغة IPA نقية ونظيفة جاهزة للتثبيت فوراً عبر SideLink.
          </p>
        </section>

        {/* Existing Interactive ModdedIpaSection */}
        <ModdedIpaSection />

        {/* Coming Soon Notice Card */}
        <section className="px-4 max-w-5xl mx-auto mt-12">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border border-slate-800 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PlusCircle className="w-6 h-6" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white">
              جاري تجهيز وإضافة المزيد من التطبيقات والألعاب! 🚀
            </h3>

            <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
              هذه البداية فقط! نقوم دورياً باختبار وتوفير أحدث نسخ الـ IPA المعدلة مع حماية الحسابات ومميزات VIP. تابع الموقع باستمرار لمشاهدة الإضافات الجديدة فور رفعها.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> تحديثات أسبوعية
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> فحص أمني وخلو تام من البرمجيات الضارة
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
