'use client';

import React, { useState } from 'react';
import ScrollReveal from './ScrollReveal';
import {
  ShieldCheck,
  Download,
  Key,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Smartphone,
  Lock,
  Globe,
  FileCheck,
  AlertCircle,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

interface CertificateItem {
  id: string;
  name: string;
  organization: string;
  status: 'active' | 'revoked' | 'anti-revoke';
  expiryDate: string;
  password: string;
  p12Url: string;
  provisionUrl: string;
  zipUrl: string;
}

const SAMPLE_CERTIFICATES: CertificateItem[] = [
  {
    id: 'cert-sunshine',
    name: 'Sunshine Insurance Group',
    organization: 'Sunshine Insurance Group Co., Ltd.',
    status: 'active',
    expiryDate: '2026/12/30',
    password: 'applep12.com',
    p12Url: '#',
    provisionUrl: '#',
    zipUrl: '#',
  },
  {
    id: 'cert-chinatelecom',
    name: 'China Telecom Enterprise',
    organization: 'China Telecom Group Information Co., Ltd.',
    status: 'anti-revoke',
    expiryDate: '2027/02/15',
    password: '1',
    p12Url: '#',
    provisionUrl: '#',
    zipUrl: '#',
  },
  {
    id: 'cert-bankcomm',
    name: 'Bank of Communications Co.',
    organization: 'Bank of Communications Enterprise Cert',
    status: 'active',
    expiryDate: '2026/11/28',
    password: 'applep12.com',
    p12Url: '#',
    provisionUrl: '#',
    zipUrl: '#',
  },
  {
    id: 'cert-hdfc',
    name: 'HDFC Bank Enterprise',
    organization: 'HDFC Securities Limited iOS Dev',
    status: 'anti-revoke',
    expiryDate: '2027/01/10',
    password: '123',
    p12Url: '#',
    provisionUrl: '#',
    zipUrl: '#',
  },
];

export default function SigningToolsSection() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'apps' | 'certs'>('all');

  const copyPassword = (pwd: string, id: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <section id="esign-ksign" className="py-20 px-4 max-w-6xl mx-auto scroll-mt-20 border-t border-slate-800/80">
      {/* Header */}
      <ScrollReveal direction="up" distance={20}>
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm animate-pulse-glow">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>تطبيقات التوقيع المباشر وحزم الشهادات المؤسسية</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            <span className="heading-gradient-emerald">ESign و KSign</span> وشهادات المؤسسات (P12)
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            حمل أشهر أدوات التوقيع الذاتي مباشرة على هاتفك الآيفون، مع شهادات المطورين وملفات التعريف لتوقيع التطبيقات بشكل دائم وتفادي قيود الـ 7 أيام.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              عرض الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('apps')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                activeTab === 'apps'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              تطبيقات ESign &amp; KSign
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('certs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                activeTab === 'certs'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              شهادات المؤسسات (P12)
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 1. On-Device Signing Apps (ESign & KSign) */}
      {(activeTab === 'all' || activeTab === 'apps') && (
        <div className="space-y-6 mb-16">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>أدوات التوقيع الذاتي على الهاتف (On-Device Signing)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">تثبيت بدون كمبيوتر</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ESign Card */}
            <ScrollReveal direction="up" distance={30} delayMs={100}>
              <div className="h-full rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2.5 hover:shadow-2xl hover:shadow-emerald-600/15 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-600/20 transition-all duration-500" />

                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-3 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:-translate-y-0.5 transition-transform">
                        <span className="text-2xl font-black">E</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white group-hover:text-emerald-300 transition">
                          ESign iOS
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-emerald-400 font-bold">v5.0.2</span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-xs text-slate-400">يدعم iOS 15 - 18.2</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                      الأكثر استقراراً
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-5">
                    أشهر وأقوى تطبيق توقيع على أجهزة iOS: يدعم تثبيت أي تطبيق IPA محلياً، فك الضغط والتعديل على اسم الحزمة، دمج مكتبات التعديل (Dylibs)، واستيراد ملفات P12 الخارجية بسهولة.
                  </p>

                  {/* Features List */}
                  <div className="grid grid-cols-2 gap-2 mb-6 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>توقيع ملفات IPA غير محدود</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>حقن أدوات الـ Tweaks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>تعديل الـ Bundle Identifier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>دعم ملفات DNS لمنع الإغلاق</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap sm:flex-nowrap items-center gap-3">
                  <a
                    href="#download-esign"
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل ملف ESign IPA</span>
                  </a>
                  <a
                    href="#install-dns"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all duration-200 hover:-translate-y-0.5"
                    title="تثبيت ملف DNS لمنع حظر شهادات ESign"
                  >
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>ملف مانع الحظر (DNS)</span>
                  </a>
                </div>
              </div>
            </ScrollReveal>

            {/* KSign Card */}
            <ScrollReveal direction="up" distance={30} delayMs={200}>
              <div className="h-full rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2.5 hover:shadow-2xl hover:shadow-cyan-600/15 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-600/20 transition-all duration-500" />

                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 p-3 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:-translate-y-0.5 transition-transform">
                        <span className="text-2xl font-black">K</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white group-hover:text-cyan-300 transition">
                          KSign iOS
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-cyan-400 font-bold">v3.2.0</span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-xs text-slate-400">واجهة خفيفة وسريعة</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                      بديل ممتاز
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-5">
                    تطبيق توقيع حديث يتميز بواجهة عربية وأجنبية مبسطة وخفة فائقة في استهلاك الموارد، مخصص لاستيراد وتفعيل شهادات المؤسسات وشهادات P12 بضغطة زر وتثبيت الـ IPAs بدون تعقيد.
                  </p>

                  {/* Features List */}
                  <div className="grid grid-cols-2 gap-2 mb-6 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>تثبيت فوري بضغطة زر</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>إدارة متقدمة لشهادات P12</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>تشفير مفاتيح التوقيع</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>دعم السحب والإفلات للملفات</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap sm:flex-nowrap items-center gap-3">
                  <a
                    href="#download-ksign"
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 active:scale-95 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل ملف KSign IPA</span>
                  </a>
                  <a
                    href="#guide"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>دليل الاستخدام</span>
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      )}

      {/* 2. Enterprise Certificates Directory */}
      {(activeTab === 'all' || activeTab === 'certs') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-400" />
                <span>شهادات المطورين والمؤسسات (P12 &amp; Mobileprovision)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                شهادات مؤسسية جاهزة للاستيراد في برنامج SideLink على الكمبيوتر أو تطبيقات ESign و KSign على الآيفون.
              </p>
            </div>
          </div>

          {/* Certificates Cards Grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {SAMPLE_CERTIFICATES.map((cert, idx) => (
              <ScrollReveal key={cert.id} delayMs={(idx % 2) * 120} direction="up" distance={25}>
                <div
                  className="h-full p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 flex flex-col justify-between space-y-4 text-right transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-amber-500/5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-bold text-white text-base">{cert.name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{cert.organization}</p>
                      </div>

                      {cert.status === 'active' ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>نشطة وصالحة</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>مع ملف مانع الحظر</span>
                        </span>
                      )}
                    </div>

                    {/* Password & Expiry Info Box */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/70 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">كلمة السر (Password):</span>
                        <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40">
                          {cert.password}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyPassword(cert.password, cert.id)}
                          className="p-1 hover:text-white text-slate-400 transition hover:scale-110 active:scale-95"
                          title="نسخ كلمة السر"
                        >
                          {copiedKey === cert.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="text-slate-400">
                        <span className="text-slate-500 ml-1">الصلاحية:</span>
                        <span>{cert.expiryDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Download Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={cert.p12Url}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>ملف P12</span>
                    </a>

                    <a
                      href={cert.provisionUrl}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ملف Mobileprovision</span>
                    </a>

                    <a
                      href={cert.zipUrl}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>حزمة ZIP</span>
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Anti-Revoke DNS Notice */}
          <ScrollReveal direction="up" distance={20} delayMs={150}>
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 border border-amber-500/20 text-right space-y-2 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>نصيحة هامة لتفادي إيقاف أو حظر الشهادات المؤسسية (Anti-Revoke DNS):</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pr-6">
                للحفاظ على الشهادات المؤسسية لتعمل لأشهر دون توقف، قم بتثبيت بروفايل DNS مخصص على جهاز الآيفون الخاص بك لحجب خوادم التحقق من أبل (<code className="text-amber-200 font-mono">ocsp.apple.com</code> و <code className="text-amber-200 font-mono">ppq.apple.com</code>).
              </p>
            </div>
          </ScrollReveal>
        </div>
      )}
    </section>
  );
}

