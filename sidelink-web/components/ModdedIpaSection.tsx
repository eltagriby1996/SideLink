'use client';

import React, { useState } from 'react';
import {
  Download,
  Search,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Music,
  Share2,
  Gamepad2,
  Wrench,
  Check,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface ModdedApp {
  id: string;
  name: string;
  category: 'music' | 'social' | 'games' | 'utilities';
  version: string;
  size: string;
  icon: string;
  badge: string;
  description: string;
  features: string[];
  downloadUrl: string;
}

const SAMPLE_MODDED_APPS: ModdedApp[] = [
  {
    id: 'spotify-plus',
    name: 'Spotify++ Deluxe',
    category: 'music',
    version: 'v9.1.90',
    size: '82.4 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    badge: 'الأكثر تحميلاً',
    description: 'نسخة سبوتيفاي المعدلة مع فتح مميزات بريميوم: تخطي لا نهائي، جودة صوت قصوى (Very High)، ومنع الإعلانات الصوتية والمرئية بالكامل.',
    features: ['بدون أي إعلانات', 'تخطي أغاني غير محدود', 'صوت فائق الجودة 320kbps', 'تفعيل ميزة الاستماع عند الطلب'],
    downloadUrl: '#',
  },
  {
    id: 'youtube-uyou',
    name: 'YouTube uYouEnhanced',
    category: 'social',
    version: 'v19.45.2',
    size: '128.6 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
    badge: 'محدث لآخر إصدار',
    description: 'أفضل تعديل لتطبيق يوتيوب الرسمي: بدون إعلانات إطلاقاً، تشغيل المقاطع في الخلفية، نافذة صورة داخل صورة (PiP)، مع إمكانية تنزيل الفيديوهات والصوتيات.',
    features: ['منع إعلانات الفيديو والتطبيق', 'تشغيل في الخلفية والشاشة مقفلة', 'تنزيل الفيديوهات حتى 4K', 'ميزة Picture-in-Picture الرسمية'],
    downloadUrl: '#',
  },
  {
    id: 'watusi-whatsapp',
    name: 'WhatsApp Watusi 3',
    category: 'social',
    version: 'v24.23.78',
    size: '110.2 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    badge: 'نسخة مكررة مدعومة',
    description: 'نسخة واتساب مع إضافة واتوسي الاحترافية: تجميد آخر ظهور، منع حذف الرسائل والحالات، قفل المحادثات برمز سري، وإرسال وسائط بحجم غير محدود.',
    features: ['إخفاء صحين القراءة والاستلام', 'منع حذف الرسائل والحالات', 'تثبيت كنسخة ثانية بمُعرّف مختلف', 'قفل المحادثات ببصمة الوجه FaceID'],
    downloadUrl: '#',
  },
  {
    id: 'tiktok-lrd',
    name: 'TikTok LRD Plus',
    category: 'social',
    version: 'v36.8.0',
    size: '175.0 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
    badge: 'تخطي الحظر الجغرافي',
    description: 'تيك توك بلس مع أداة LRD: إزالة الإعلانات، حفظ الفيديوهات بدون العلامة المائية، تغيير المنطقة الجغرافية (Region Spoofing)، وعرض تقدم الفيديو.',
    features: ['حفظ الفيديو بدون علامة مائية', 'تغيير دولة المحتوى بضغطة زر', 'إخفاء الإعلانات والبثوث المزعجة', 'تشغيل الصوتيات بالخلفية'],
    downloadUrl: '#',
  },
  {
    id: 'delta-emulator',
    name: 'Delta All-In-One Emulator',
    category: 'games',
    version: 'v1.6.2',
    size: '58.5 MB',
    icon: 'https://deltaemulator.com/assets/images/delta-icon.png',
    badge: 'محاكي ألعاب ريترو',
    description: 'أقوى محاكي ألعاب كلاسيكية على نظام iOS: يدعم ألعاب Game Boy Advance, Nintendo DS, Nintendo 64, SNES, مع دعم ذراع التحكم الخارجية.',
    features: ['يدعم أجهزة نينتندو الكلاسيكية', 'دعم أيادي التحكم (PS5 / Xbox)', 'حفظ واستعادة تقدم الألعاب فورياً', 'مزامنة سحابية لحفظ الألعاب'],
    downloadUrl: '#',
  },
  {
    id: 'sidestore-app',
    name: 'SideStore Community',
    category: 'utilities',
    version: 'v0.5.8',
    size: '24.2 MB',
    icon: 'https://sidestore.io/images/logo.png',
    badge: 'تجديد ذاتي بدون كمبيوتر',
    description: 'متجر التثبيت الذاتي الشهير: يتيح لك تثبيت وتجديد تطبيقات الـ 7 أيام مباشرة من هاتفك عبر شبكة WireGuard VPN المحلية دون الحاجة لويندوز بعد أول تثبيت.',
    features: ['تجديد عبر الواي فاي محلياً', 'لا يتطلب البقاء متصلاً بالكمبيوتر', 'إدارة كاملة لشهادات التوقيع', 'متوافق مع SideLink مباشرة'],
    downloadUrl: '#',
  },
];

export default function ModdedIpaSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'كافة التطبيقات', icon: Layers },
    { id: 'social', name: 'تطبيقات بلس والمعدلة', icon: Share2 },
    { id: 'music', name: 'الموسيقى والصوتيات', icon: Music },
    { id: 'games', name: 'ألعاب ومحاكيات', icon: Gamepad2 },
    { id: 'utilities', name: 'أدوات ونظام', icon: Wrench },
  ];

  const filteredApps = SAMPLE_MODDED_APPS.filter((app) => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCopyLink = (app: ModdedApp) => {
    navigator.clipboard.writeText(window.location.origin + `#ipa-${app.id}`);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="modded-ipas" className="py-20 px-4 max-w-6xl mx-auto scroll-mt-20 border-t border-slate-800/80">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>مكتبة التطبيقات المعدلة الحصرية (Modded IPAs)</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          تطبيقات بلس ونسخ معدلة جاهزة للتثبيت
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          حمل أشهر تطبيقات iOS المعدلة والمحقونة بأحدث أدوات البلس، متوافقة ومجربة للعمل فوراً عبر برنامج <span className="text-blue-400 font-semibold">SideLink</span> بدون إعلانات وبمميزات كاملة.
        </p>

        {/* Search & Filters */}
        <div className="pt-6 max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم التطبيق، مثل: Spotify، YouTube، WhatsApp..."
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-inner"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map((c) => {
              const Icon = c.icon;
              const isActive = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            id={`ipa-${app.id}`}
            className="rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-blue-500/40 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-blue-600/10 group relative"
          >
            {/* Top Bar inside Card */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 p-2 border border-slate-800 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={app.icon} alt={app.name} className="w-10 h-10 object-contain rounded-xl" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-blue-300 transition">
                      {app.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-400">{app.version}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[11px] font-mono text-cyan-400">{app.size}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                  {app.badge}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-3">
                {app.description}
              </p>

              {/* Highlights Chips */}
              <div className="space-y-1.5 mb-6">
                {app.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2.5">
              <a
                href={app.downloadUrl}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>تحميل IPA</span>
              </a>

              <button
                type="button"
                onClick={() => handleCopyLink(app)}
                title="نسخ رابط التطبيق"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs border border-slate-700/60"
              >
                {copiedId === app.id ? <Check className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <p className="text-slate-400 text-sm">لم يتم العثور على تطبيقات مطابقة لبحثك.</p>
        </div>
      )}

      {/* Community Request Banner */}
      <div className="mt-12 p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div>
          <h4 className="text-white font-bold text-base mb-1">هل تبحث عن تطبيق معدل أو لعبة معينة؟</h4>
          <p className="text-xs text-slate-400">
            يتم تحديث المكتبة يومياً بأحدث نسخ الـ IPA المعدلة. يمكنك إرسال روابط وتطبيقات جديدة لإضافتها إلى القائمة.
          </p>
        </div>
        <a
          href="#download"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition shrink-0"
        >
          طلب إضافة تطبيق
        </a>
      </div>
    </section>
  );
}
