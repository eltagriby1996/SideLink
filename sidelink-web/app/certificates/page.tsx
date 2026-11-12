import React from 'react';
import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import SigningToolsSection from '../../components/SigningToolsSection';
import { ShieldCheck, Globe, Smartphone, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'الشهادات و ESign و KSign و DNS — SideLink OTA Tools',
  description: 'تثبيت تطبيقات ESign و KSign بروابط أبل المباشرة OTA مع بروفايلات DNS لمنع توقف الشهادات على الآيفون والآيباد.',
};

export default function CertificatesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-blue-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] -right-40 w-[500px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full" />
      </div>

      <Navbar />

      <main className="pt-12 pb-24">
        {/* Hero Banner for Certificates */}
        <section className="px-4 max-w-5xl mx-auto text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تثبيت مباشر بدون كمبيوتر (Over-The-Air OTA)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            شهادات المؤسسات وتطبيقات <span className="text-blue-500">ESign</span> و <span className="text-indigo-400">KSign</span> مع مانع الإلغاء <span className="text-emerald-400">DNS</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            ثبّت أشهر تطبيقات التوقيع المباشرة على الآيفون والآيباد بدون جلبريك، مع ملفات حظر خوادم أبل (Anti-Revoke DNS) لضمان استمرار الشهادات لأطول فترة ممكنة.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> تثبيت فوري بنقرة واحدة
            </span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> بروفايلات DNS مانعة للإلغاء
            </span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> يدعم جميع أجهزة iOS و iPadOS
            </span>
          </div>
        </section>

        {/* Full Comprehensive SigningToolsSection */}
        <SigningToolsSection />
      </main>

      <Footer />
    </div>
  );
}

