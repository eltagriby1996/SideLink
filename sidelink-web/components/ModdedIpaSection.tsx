'use client';

import React, { useState, useEffect } from 'react';
import ScrollReveal from './ScrollReveal';
import {
  Download,
  Search,
  Sparkles,
  Music,
  Share2,
  Gamepad2,
  Wrench,
  Check,
  Layers,
  ArrowUpRight,
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

const INITIAL_TOP_APPS: ModdedApp[] = [
  {
    id: 'sidelink-container',
    name: 'SideLink Container (تجاوز حد الـ 3 تطبيقات)',
    category: 'utilities',
    version: 'v3.8.0',
    size: '4.7 MB',
    icon: 'https://raw.githubusercontent.com/LiveContainer/LiveContainer/main/LiveContainer/Assets.xcassets/AppIcon.appiconset/AppIcon-60%402x.png',
    badge: 'تجاوز حد الـ 3 تطبيقات 🔥',
    description: 'الحاوية الذكية الرسمية لتشغيل عدد لا نهائي من التطبيقات والألعاب (IPA) على الآيفون بالشهادة المجانية بدون استهلاك خانات أبل وبأداء كامل 100% بدون لاج أو محاكاة.',
    features: [
      'تثبيت وتشغيل عدد غير محدود من التطبيقات والألعاب',
      'تستهلك خانة واحدة فقط من الـ 3 تطبيقات المسموحة',
      'تعمل بكامل سرعة معالج الآيفون وكارت الشاشة (Native)',
      'دعم تشغيل ألعاب وتطبيقات بلس وحفظ البيانات بالكامل'
    ],
    downloadUrl: '/downloads/SideLinkContainer.ipa',
  },
  {
    id: 'youtube-uyou',
    name: 'YouTube uYouEnhanced (يوتيوب بلس)',
    category: 'social',
    version: 'v21.20.4',
    size: '128 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
    badge: 'الأكثر تحميلاً 🔥',
    description: 'أفضل نسخة يوتيوب معدلة للآيفون: بدون أي إعلانات، تشغيل المقاطع في الخلفية والشاشة مقفلة، نافذة صورة داخل صورة (PiP)، وتنزيل الفيديوهات والصوتيات حتى 4K.',
    features: ['بدون أي إعلانات إطلاقاً', 'تشغيل المقاطع في الخلفية', 'تنزيل الفيديوهات بدقة 4K', 'ميزة نافذة صورة داخل صورة (PiP)'],
    downloadUrl: 'https://archive.org/download/YouTubeRebornPlus_19.10.5-4.2.6/yt-uYE-21204-305.ipa',
  },
  {
    id: 'whatsapp-watusi',
    name: 'WhatsApp Watusi 3 (واتساب بلس)',
    category: 'social',
    version: 'v26.44.72',
    size: '110 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    badge: 'نسخة بلس رسمية 🔥',
    description: 'أقوى نسخة واتساب بلس مع إضافة واتوسي الرسمية: تجميد آخر ظهور، منع حذف الرسائل والحالات، قفل المحادثات برمز سري وبصمة FaceID، وإرسال وسائط بحجم غير محدود.',
    features: ['إخفاء آخر ظهور والصح الأزرق', 'منع حذف الرسائل والحالات', 'قفل المحادثات ببصمة FaceID', 'إرسال وسائط بحجم غير محدود'],
    downloadUrl: 'https://fouadraheb.com/dl/storage/ipa/1794443507727-4w53k/net.whatsapp.WhatsApp_26.44.72_watusi_1.0_sl.ipa',
  },
  {
    id: 'whatsapp-watusi-dup',
    name: 'WhatsApp Watusi (نسخة ثانية مكررة)',
    category: 'social',
    version: 'v26.44.72',
    size: '110 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    badge: 'نسخة مكررة معتمدة',
    description: 'نسخة واتساب بلس مكررة بمُعرّف حزمة مختلف، تتيح لك تشغيل رقمين واتساب مختلفين تماماً على نفس الآيفون مع كافة مميزات واتوسي 3.',
    features: ['تشغيل رقمين واتساب على هاتف واحد', 'تثبيت بجانب الواتساب الرسمي تماماً', 'إخفاء الصح الأزرق وقراءة الرسائل', 'منع حذف الحالات والرسائل'],
    downloadUrl: 'https://fouadraheb.com/dl/storage/ipa/1794443507727-zmckb/com.fouadraheb.watusi_26.44.72_watusi_1.0_sl.ipa',
  },
  {
    id: 'spotify-deluxe',
    name: 'Spotify++ Deluxe (سبوتيفاي بلس)',
    category: 'music',
    version: 'v9.0.36',
    size: '80 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    badge: 'الأكثر طلباً 🔥',
    description: 'نسخة سبوتيفاي المعدلة مع فتح مميزات بريميوم: تخطي لا نهائي، جودة صوت قصوى (Very High)، ومنع الإعلانات الصوتية والمرئية بالكامل بدون اشتراك.',
    features: ['بدون أي إعلانات صوتية أو بصرية', 'تخطي أغاني غير محدود', 'صوت فائق الجودة 320kbps', 'الاستماع عند الطلب لأي ألبوم'],
    downloadUrl: 'https://ipa.cypwn.xyz/ipas/EeveeSpotify-5.9.5-9.0.36.ipa',
  },
  {
    id: 'tiktok-lrd',
    name: 'TikTok LRD Plus (تيك توك بلس)',
    category: 'social',
    version: 'v30.3.0',
    size: '228 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
    badge: 'تخطي الحظر الجغرافي',
    description: 'تيك توك بلس مع أداة LRD: إزالة الإعلانات، حفظ الفيديوهات بدون العلامة المائية، تغيير المنطقة الجغرافية (Region Spoofing)، وعرض تقدم الفيديو.',
    features: ['حفظ الفيديوهات بدون علامة مائية', 'تغيير دولة المحتوى بنقرة زر', 'منع الإعلانات والبثوث المزعجة', 'تشغيل الصوتيات بالخلفية'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/BHTikTokLRD-30.3.0.ipa',
  },
  {
    id: 'instagram-regram',
    name: 'Instagram Regram Plus (إنستغرام بلس)',
    category: 'social',
    version: 'v454.1.0',
    size: '138 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
    badge: 'نسخة VIP معتمدة',
    description: 'النسخة الرسمية لتعديل إنستغرام: تنزيل الفيديوهات والريلز والستوريات بجودة عالية، إخفاء مؤشرات قراءة الرسائل ومشاهدة القصص، وتكبير الصور.',
    features: ['تنزيل الصور والريلز والستوريات', 'إخفاء مؤشر قراءة الرسائل (Seen)', 'مشاهدة القصص دون علم الطرف الآخر', 'تكبير الصور الشخصية بجودة كاملة'],
    downloadUrl: 'https://fouadraheb.com/dl/storage/ipa/1794250144993-bnwzh/com.burbn.instagram_454.1.0_regram_7.0.1_sl.ipa',
  },
  {
    id: 'delta-emulator',
    name: 'Delta All-In-One Emulator (محاكي ألعاب)',
    category: 'games',
    version: 'v1.6.2',
    size: '41 MB',
    icon: 'https://deltaemulator.com/assets/images/delta-icon.png',
    badge: 'محاكي ألعاب ريترو 🎮',
    description: 'أقوى محاكي ألعاب كلاسيكية على نظام iOS: يدعم ألعاب Game Boy Advance, Nintendo DS, Nintendo 64, SNES, مع دعم ذراع التحكم الخارجية.',
    features: ['محاكاة GBA, GBC, SNES, N64, NDS', 'دعم كامل لأيادي التحكم الخارجية', 'حفظ واستعادة تقدم الألعاب فورياً', 'مزامنة سحابية لحفظ الألعاب'],
    downloadUrl: 'https://github.com/rileytestut/Delta/releases/download/v1.6/Delta_1_6.ipa',
  },
  {
    id: 'ppsspp-emu',
    name: 'PPSSPP PlayStation (محاكي PSP)',
    category: 'games',
    version: 'v1.13.2',
    size: '14 MB',
    icon: 'https://www.ppsspp.org/images/logo.svg',
    badge: 'محاكي ألعاب PSP 🎮',
    description: 'محاكي بلايستيشن بورتابل PSP الشهير بدقة 4K ومعدل 60 إطار بالثانية مع دعم كامل لذراع التحكم وحفظ مراحل الألعاب.',
    features: ['تشغيل ألعاب PSP بدقة 4K و 60fps', 'دعم ذراع التحكم اللاسلكية', 'حفظ وإعادة اللقطات في أي لحظة', 'تحسين الألوان والرسوميات'],
    downloadUrl: 'https://github.com/QuarkSources/ppsspp-builder/releases/download/v1.13.2/PPSSPP_v1.13.2.ipa',
  },
  {
    id: 'picsart-gold',
    name: 'PicsArt Gold (بيكس آرت مفتوح)',
    category: 'social',
    version: 'v25.5.1',
    size: '115 MB',
    icon: 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
    badge: 'نسخة برو مفتوحة',
    description: 'محرر الصور والتصميم الأشهر مع فتح كافة فلاتر ومميزات PicsArt Gold، إزالة الخلفية بالذكاء الاصطناعي، وتصدير الصور بدقة فائقة.',
    features: ['فتح كافة فلاتر وتأثيرات Gold', 'حفظ الصور بدقة فائقة بدون علامة', 'أدوات الذكاء الاصطناعي مفتوحة', 'تعديل الصور باحترافية'],
    downloadUrl: 'https://ipa.cypwn.xyz/ipas/Picsart_25.5.1_Cracked.ipa',
  },
  {
    id: 'inshot-pro',
    name: 'InShot Pro (إن شوت برو)',
    category: 'social',
    version: 'v1.70.0',
    size: '117 MB',
    icon: 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
    badge: 'محرر فيديو Pro',
    description: 'تطبيق مونتاج وتعديل الفيديو مع تفعيل عضوية Pro مجاناً: تصدير بدون علامة مائية، فتح جميع الانتقالات والمؤثرات، وجودة 4K.',
    features: ['تصدير بدون علامة مائية', 'كافة الانتقالات والمؤثرات مجانية', 'تصدير فيديو بدقة 4K و 60 إطار', 'دعم الخطوط والموسيقى الاحترافية'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-09-2023/InShotPro-1.70.0.ipa',
  },
  {
    id: 'infuse-pro',
    name: 'Infuse Pro 4K (مشغل إنفيوز برو)',
    category: 'social',
    version: 'v7.5.8',
    size: '40 MB',
    icon: 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
    badge: 'مشغل وسائط 4K',
    description: 'أقوى مشغل أفلام ومسلسلات على الآيفون والآيباد: يدعم تشغيل كافة الصيغ بدقة 4K HDR، صوت Dolby Atmos، ومزامنة الترجمة التلقائية.',
    features: ['تشغيل كافة صيغ الفيديو والصوت', 'دعم Dolby Vision و Atmos', 'مزامنة مع Google Drive و OneDrive', 'تحميل الترجمة العربية تلقائياً'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-11-2023/InfusePro-7.5.8.ipa',
  },
  {
    id: 'sidestore-app',
    name: 'SideStore Community (تجديد ذاتي)',
    category: 'utilities',
    version: 'v0.7.0',
    size: '24 MB',
    icon: 'https://sidestore.io/images/logo.png',
    badge: 'تثبيت ذاتي بدون حاسوب',
    description: 'متجر التثبيت الذاتي الشهير: يتيح لك تثبيت وتجديد تطبيقات الـ 7 أيام مباشرة من هاتفك عبر شبكة WireGuard VPN المحلية دون الحاجة لويندوز بعد أول تثبيت.',
    features: ['تجديد عبر الواي فاي محلياً', 'لا يتطلب البقاء متصلاً بالكمبيوتر', 'إدارة كاملة لشهادات التوقيع', 'متوافق مع SideLink مباشرة'],
    downloadUrl: 'https://github.com/SideStore/SideStore/releases/download/0.7.0-alpha/SideStore.ipa',
  },
];

export default function ModdedIpaSection() {
  const [apps, setApps] = useState<ModdedApp[]>(INITIAL_TOP_APPS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(18);

  const categories = [
    { id: 'all', name: 'كافة التطبيقات', icon: Layers },
    { id: 'social', name: 'تطبيقات بلس وسوشيال', icon: Share2 },
    { id: 'music', name: 'الموسيقى والصوتيات', icon: Music },
    { id: 'games', name: 'ألعاب ومحاكيات', icon: Gamepad2 },
    { id: 'utilities', name: 'أدوات ونظام', icon: Wrench },
  ];

  // Silently load full catalog in background on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/app/ipas');
        if (res.ok) {
          const data = await res.json();
          if (data.apps && data.apps.length > 0) {
            setApps(data.apps);
          }
        }
      } catch (err) {
        console.error('Failed to load apps catalog:', err);
      }
    }

    loadCatalog();
  }, []);

  const filteredApps = apps.filter((app) => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesSearch =
      app.name.toLowerCase().includes(q) ||
      (app.description && app.description.toLowerCase().includes(q)) ||
      (app.features && app.features.some((f) => f.toLowerCase().includes(q)));
    return matchesCategory && matchesSearch;
  });

  const displayedApps = filteredApps.slice(0, visibleCount);

  const handleCopyLink = (app: ModdedApp) => {
    navigator.clipboard.writeText(app.downloadUrl);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="modded-ipas" className="py-12 px-4 max-w-6xl mx-auto scroll-mt-20">
      {/* Header */}
      <ScrollReveal direction="up" distance={20}>
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مكتبة تطبيقات الآيفون المعدلة والألعاب الحصرية</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            <span className="heading-gradient-blue">تطبيقات بلس ومعدلة</span> بروابط تحميل مباشرة
          </h1>

          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            حمل أشهر تطبيقات السوشيال ميديا بلس، تطبيقات المشاهدة والاستماع بدون إعلانات، وألعاب المحاكيات جاهزة للتثبيت فوراً عبر برنامج <span className="text-blue-400 font-semibold">SideLink</span>.
          </p>

          {/* Featured SideLink Container Banner: Bypass 3-App Limit */}
          <div className="mt-8 mb-6 p-6 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-500/40 text-right shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-2 text-center md:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                  <span>⚡ حل حصري لكسر قيود أبل</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  تشغيل عدد لا نهائي من التطبيقات بالشهادة المجانية (SideLink Container)
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  تجاوز حد الـ 3 تطبيقات المفروض من أبل! قم بتثبيت الحاوية الذكية مرة واحدة، وشغّل عشرات التطبيقات والألعاب بداخلها بنفس الشهادة المجانية وبكامل سرعة جهازك الأصلية 100%.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                <a
                  href="/downloads/SideLinkContainer.ipa"
                  download="SideLinkContainer.ipa"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل الحاوية IPA (4.7 MB)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Search & Clean Wrapped Category Filters */}
          <div className="pt-4 max-w-2xl mx-auto space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(18);
                }}
                placeholder="ابحث عن أي تطبيق، مثل: YouTube، WhatsApp، Spotify، TikTok، Delta..."
                className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 text-sm transition shadow-inner"
              />
            </div>

            {/* Clean Category Pills without any horizontal scrollbar */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setVisibleCount(18);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Apps Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedApps.map((app, idx) => (
          <ScrollReveal key={app.id + '-' + idx} delayMs={(idx % 3) * 50} direction="up" distance={20}>
            <div
              id={`ipa-${app.id}`}
              className="h-full rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-blue-500/40 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-600/15 group relative"
            >
              {/* Top Bar inside Card */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 p-2 border border-slate-800 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="w-10 h-10 object-contain rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base group-hover:text-blue-300 transition line-clamp-1">
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
                  {app.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="line-clamp-1">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2.5">
                <a
                  href={app.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل IPA</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyLink(app)}
                  title="نسخ رابط التحميل المباشر"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200 hover:-translate-y-0.5 text-xs border border-slate-700/60"
                >
                  {copiedId === app.id ? <Check className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Show more button if there are more than visibleCount */}
      {filteredApps.length > visibleCount && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 18)}
            className="px-8 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-400 hover:text-blue-300 font-bold text-sm shadow-lg shadow-blue-900/10 transition active:scale-95"
          >
            عرض المزيد من التطبيقات ({filteredApps.length - visibleCount} تطبيق إضافي) ↓
          </button>
        </div>
      )}

      {filteredApps.length === 0 && (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <p className="text-slate-400 text-sm">لم يتم العثور على تطبيقات مطابقة لبحثك.</p>
        </div>
      )}
    </section>
  );
}
