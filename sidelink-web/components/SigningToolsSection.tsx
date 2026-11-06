'use client';

import React, { useState } from 'react';
import ScrollReveal from './ScrollReveal';
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  Smartphone,
  Globe,
  Search,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

interface KhoindvnAppVersion {
  id: string;
  type: 'esign' | 'ksign';
  name: string;
  cert: string;
  url: string;
}

const KHOINDVN_ALL_VERSIONS: KhoindvnAppVersion[] = [
  // ESign Versions (18 Builds)
  {
    id: 'esign-1',
    type: 'esign',
    name: 'ESign',
    cert: 'Viet Nam Rubber',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/dgaefbobaeop.plist'
  },
  {
    id: 'esign-2',
    type: 'esign',
    name: 'ESign Viet Nam Rubber V1',
    cert: 'Viet Nam Rubber',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/jajfejcpifon.plist'
  },
  {
    id: 'esign-3',
    type: 'esign',
    name: 'ESign Viet Nam Rubber V2',
    cert: 'Viet Nam Rubber',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/ifaidfcbmgna.plist'
  },
  {
    id: 'esign-4',
    type: 'esign',
    name: 'ESign RAKUTEN',
    cert: 'RAKUTEN',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/gcocahddcinl.plist'
  },
  {
    id: 'esign-5',
    type: 'esign',
    name: 'ESign Vietnam Electricity',
    cert: 'Vietnam Electricity',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/fnenfnfigggm.plist'
  },
  {
    id: 'esign-6',
    type: 'esign',
    name: 'ESign Beihang University',
    cert: 'Beihang University',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/kagnpjhmkmjp.plist'
  },
  {
    id: 'esign-7',
    type: 'esign',
    name: 'ESign VINWASH',
    cert: 'VINWASH',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/kjjcnffojofo.plist'
  },
  {
    id: 'esign-8',
    type: 'esign',
    name: 'ESign HSBC Bank',
    cert: 'HSBC Bank',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/idcpodehdgbm.plist'
  },
  {
    id: 'esign-9',
    type: 'esign',
    name: 'ESign Jiangsu Simcere',
    cert: 'Jiangsu Simcere',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/namafilokpoh.plist'
  },
  {
    id: 'esign-10',
    type: 'esign',
    name: 'ESign Jiangsu Simcere V1',
    cert: 'Jiangsu Simcere',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/jgkbnpmnlaed.plist'
  },
  {
    id: 'esign-11',
    type: 'esign',
    name: 'ESign Moving Increasingly',
    cert: 'Moving Increasingly',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/dgjfclelmbbj.plist'
  },
  {
    id: 'esign-12',
    type: 'esign',
    name: 'ESign Moving Increasingly V1',
    cert: 'Moving Increasingly',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/kpcbaajmkbon.plist'
  },
  {
    id: 'esign-13',
    type: 'esign',
    name: 'ESign China Telecom',
    cert: 'China Telecom',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/pghpdpcgblmp.plist'
  },
  {
    id: 'esign-14',
    type: 'esign',
    name: 'ESign China Telecom V1',
    cert: 'China Telecom',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/bhpiamjijnip.plist'
  },
  {
    id: 'esign-15',
    type: 'esign',
    name: 'ESign Qingdao Rural',
    cert: 'Qingdao Rural',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/dkdgcdnjieff.plist'
  },
  {
    id: 'esign-16',
    type: 'esign',
    name: 'ESign National Oilwell',
    cert: 'National Oilwell',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/kfccjimokhko.plist'
  },
  {
    id: 'esign-17',
    type: 'esign',
    name: 'ESign PowerChina',
    cert: 'PowerChina',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/eoekkbmccjbc.plist'
  },
  {
    id: 'esign-18',
    type: 'esign',
    name: 'ESign PowerChina V1',
    cert: 'PowerChina',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/hegmnlhdholo.plist'
  },

  // KSign Versions (18 Builds)
  {
    id: 'ksign-1',
    type: 'ksign',
    name: 'KSign',
    cert: 'Viet Nam Rubber',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/idjbbheelkpp.plist'
  },
  {
    id: 'ksign-2',
    type: 'ksign',
    name: 'KSign Viet Nam Rubber V1',
    cert: 'Viet Nam Rubber',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/gachcmkbfgpi.plist'
  },
  {
    id: 'ksign-3',
    type: 'ksign',
    name: 'KSign Viet Nam Rubber V2',
    cert: 'Viet Nam Rubber',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/kjbmlohbihbi.plist'
  },
  {
    id: 'ksign-4',
    type: 'ksign',
    name: 'KSign RAKUTEN',
    cert: 'RAKUTEN',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/dphpgblmlojd.plist'
  },
  {
    id: 'ksign-5',
    type: 'ksign',
    name: 'KSign Vietnam Electricity',
    cert: 'Vietnam Electricity',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/geadoiiloimh.plist'
  },
  {
    id: 'ksign-6',
    type: 'ksign',
    name: 'KSign Beihang University',
    cert: 'Beihang University',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/gdkhlfchmfof.plist'
  },
  {
    id: 'ksign-7',
    type: 'ksign',
    name: 'KSign VINWASH',
    cert: 'VINWASH',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/gmkhipcnkilk.plist'
  },
  {
    id: 'ksign-8',
    type: 'ksign',
    name: 'KSign HSBC Bank',
    cert: 'HSBC Bank',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/pbemcddlcpho.plist'
  },
  {
    id: 'ksign-9',
    type: 'ksign',
    name: 'KSign Jiangsu Simcere',
    cert: 'Jiangsu Simcere',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/mlieeiadepah.plist'
  },
  {
    id: 'ksign-10',
    type: 'ksign',
    name: 'KSign Jiangsu Simcere V1',
    cert: 'Jiangsu Simcere',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/lodjpjcljdpi.plist'
  },
  {
    id: 'ksign-11',
    type: 'ksign',
    name: 'KSign Moving Increasingly',
    cert: 'Moving Increasingly',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/imppbfhicihh.plist'
  },
  {
    id: 'ksign-12',
    type: 'ksign',
    name: 'KSign Moving Increasingly V1',
    cert: 'Moving Increasingly',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/cmedecbjfimo.plist'
  },
  {
    id: 'ksign-13',
    type: 'ksign',
    name: 'KSign China Telecom',
    cert: 'China Telecom',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/phcfgoaomgja.plist'
  },
  {
    id: 'ksign-14',
    type: 'ksign',
    name: 'KSign China Telecom V1',
    cert: 'China Telecom',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/bfadljjfdmhn.plist'
  },
  {
    id: 'ksign-15',
    type: 'ksign',
    name: 'KSign Qingdao Rural',
    cert: 'Qingdao Rural',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/lhikcbnplmcl.plist'
  },
  {
    id: 'ksign-16',
    type: 'ksign',
    name: 'KSign National Oilwell',
    cert: 'National Oilwell',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/mbbmffjhlfcm.plist'
  },
  {
    id: 'ksign-17',
    type: 'ksign',
    name: 'KSign PowerChina',
    cert: 'PowerChina',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/fbnokebbnpco.plist'
  },
  {
    id: 'ksign-18',
    type: 'ksign',
    name: 'KSign PowerChina V1',
    cert: 'PowerChina',
    url: 'itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/bbememhbfidk.plist'
  }
];

export default function SigningToolsSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'esign' | 'ksign'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyLink = (item: KhoindvnAppVersion) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredVersions = KHOINDVN_ALL_VERSIONS.filter((app) => {
    const matchesTab = activeFilter === 'all' || app.type === activeFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      app.name.toLowerCase().includes(query) ||
      app.cert.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  return (
    <section id="esign-ksign" className="py-20 px-4 max-w-6xl mx-auto scroll-mt-20 border-t border-slate-800/80">
      {/* Header */}
      <ScrollReveal direction="up" distance={20}>
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm animate-pulse-glow">
            <Globe className="w-3.5 h-3.5" />
            <span>Khoindvn Official Tools &amp; Anti-Revoke DNS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            أدوات التوقيع الذاتي وملف مانع الحظر <span className="heading-gradient-emerald">(ESign &amp; KSign)</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            جميع نسخ وتحديثات تطبيقات التوقيع المباشر وبروفايل الـ DNS المعتمدة لحماية التطبيقات من التوقف والتثبيت المباشر على الآيفون.
          </p>
        </div>
      </ScrollReveal>

      {/* 1. TOP HERO CARD: Khoindvn Anti-Revoke DNS Profile (Placed on TOP!) */}
      <ScrollReveal direction="up" distance={25} delayMs={50}>
        <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 text-right space-y-5 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 shadow-2xl shadow-emerald-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>الخطوة الأولى والأهم: حماية الشهادات من الإيقاف</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                بروفايل مانع الحظر وحماية التطبيقات (Khoindvn Anti-Revoke DNS)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                يقوم هذا البروفايل بحجب خوادم فحص أبل (<code className="text-emerald-300 font-mono">ocsp.apple.com</code> و <code className="text-emerald-300 font-mono">ppq.apple.com</code>) لمنع إلغاء أو حظر شهادات ESign و KSign، لتستمر تطبيقاتك بالعمل دون توقف.
              </p>
            </div>

            <a
              href="https://github.com/dns-khoindvn/oci-auto-vm/releases/download/DNS/khoindvn.mobileconfig"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition-all duration-200 hover:-translate-y-0.5 shrink-0 border border-emerald-400/30"
            >
              <Download className="w-5 h-5" />
              <span>تثبيت بروفايل DNS المباشر</span>
            </a>
          </div>

          {/* 3 Steps Setup Instructions */}
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px]">1</span>
                <span>التحميل عبر Safari</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                اضغط على زر التثبيت من متصفح Safari بالآيفون واختر &quot;Allow&quot; لتنزيل ملف التعريف.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[11px]">2</span>
                <span>الإعدادات Settings</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                افتح تطبيق الإعدادات بالهاتف ثم اضغط على خيار <strong>Profile Downloaded</strong> بالأعلى.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="text-amber-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[11px]">3</span>
                <span>التثبيت الفوري</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                اضغط على <strong>تثبيت (Install)</strong> ومبروك، تم حظر سيرفرات الإلغاء وحماية شهاداتك!
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Core Clean IPA Releases (ESign & KSign) */}
      <div className="mb-16 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span>حزم التطبيقات الأصلية (Clean IPAs للكمبيوتر والتوقيع المحلي)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">جاهزة للتوقيع عبر SideLink</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ESign Clean IPA Card */}
          <ScrollReveal direction="up" distance={30} delayMs={100}>
            <div className="h-full rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-600/15 group relative overflow-hidden">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-3 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                      <span className="text-2xl font-black">E</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white group-hover:text-emerald-300 transition">
                        ESign iOS Clean IPA
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-emerald-400 font-bold">v5.0.2</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-xs text-slate-400">حزمة رسمية ~9.8 MB</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    النسخة النظيفة
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-5">
                  نسخة ESign الرسمية الصافية الخالية من أي شهادات، مخصصة للتثبيت والتوقيع عبر برنامج <span className="text-emerald-400 font-semibold">SideLink</span> على الكمبيوتر أو دمجها بشهادتك الخاصة.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
                <a
                  href="https://github.com/khoindvn/khoindvn.github.io/releases/download/ipa/ESign.ipa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف ESign.ipa (مباشر)</span>
                </a>
              </div>
            </div>
          </ScrollReveal>

          {/* KSign Clean IPA Card */}
          <ScrollReveal direction="up" distance={30} delayMs={150}>
            <div className="h-full rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-600/15 group relative overflow-hidden">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 p-3 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                      <span className="text-2xl font-black">K</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white group-hover:text-cyan-300 transition">
                        KSign iOS Clean IPA
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-cyan-400 font-bold">v3.2.0</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-xs text-slate-400">حزمة رسمية ~16 MB</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    النسخة النظيفة
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-5">
                  نسخة KSign الرسمية الصافية الخالية من أي شهادات، جاهزة للتوقيع والتثبيت الفوري عبر SideLink على الكمبيوتر أو استخدامها مع شهاداتك الشخصية.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
                <a
                  href="https://github.com/khoindvn/khoindvn.github.io/releases/download/ipa/KSign.ipa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 active:scale-95 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف KSign.ipa (مباشر)</span>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* 3. All 36 Pre-Signed & OTA Versions Directory */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>مكتبة كافة نسخ ESign و KSign الموقعة مسبقاً ({KHOINDVN_ALL_VERSIONS.length} نسخة)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              جميع النسخ المتاحة على موقع Khoindvn مع شهادات المؤسسات، تدعم التثبيت الفوري OTA بضغطة زر على الآيفون مباشرة.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل ({KHOINDVN_ALL_VERSIONS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('esign')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'esign'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ESign (18)
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ksign')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'ksign'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25 border border-cyan-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              KSign (18)
            </button>
          </div>
        </div>

        {/* Search input for certificates */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الشهادة: China Telecom, HSBC, PowerChina, Rubber..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Versions Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVersions.map((item, idx) => {
            const isEsign = item.type === 'esign';
            return (
              <ScrollReveal key={item.id} delayMs={(idx % 3) * 60} direction="up" distance={20}>
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 flex flex-col justify-between space-y-3 transition-all duration-200 hover:-translate-y-1 text-right group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md ${
                          isEsign
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                            : 'bg-gradient-to-br from-cyan-600 to-blue-700'
                        }`}
                      >
                        {isEsign ? 'E' : 'K'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                          {item.name}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          {item.cert}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isEsign
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      }`}
                    >
                      OTA مباشر
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <a
                      href={item.url}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold text-xs shadow-sm active:scale-95 transition-all duration-200 hover:-translate-y-0.5 ${
                        isEsign
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-cyan-600 hover:bg-cyan-500'
                      }`}
                      title="تثبيت مباشر على جهاز الآيفون بنقرة واحدة"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تثبيت OTA مباشر</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(item)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition"
                      title="نسخ رابط التثبيت"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {filteredVersions.length === 0 && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-xs">لم يتم العثور على شهادة أو نسخة مطابقة للبحث.</p>
          </div>
        )}
      </div>
    </section>
  );
}
