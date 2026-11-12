'use client';

import React, { useState, useEffect } from 'react';
import ScrollReveal from './ScrollReveal';
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
  ArrowUpRight,
  RefreshCw,
  Loader2,
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
    id: 'spotify-deluxe',
    name: 'Spotify++ Deluxe',
    category: 'music',
    version: 'v8.7.90',
    size: '60 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    badge: 'الأكثر تحميلاً 🔥',
    description: 'نسخة سبوتيفاي المعدلة مع فتح مميزات بريميوم: تخطي لا نهائي، جودة صوت قصوى (Very High)، ومنع الإعلانات الصوتية والمرئية بالكامل.',
    features: ['بدون أي إعلانات', 'تخطي أغاني غير محدود', 'صوت فائق الجودة 320kbps', 'تفعيل ميزة الاستماع عند الطلب'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/12-09-2022/SpotifyDeluxe-8.7.90.ipa',
  },
  {
    id: 'tiktok-lrd',
    name: 'TikTok LRD Plus',
    category: 'social',
    version: 'v30.3.0',
    size: '228 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
    badge: 'تخطي الحظر الجغرافي',
    description: 'تيك توك بلس مع أداة LRD: إزالة الإعلانات، حفظ الفيديوهات بدون العلامة المائية، تغيير المنطقة الجغرافية (Region Spoofing)، وعرض تقدم الفيديو.',
    features: ['حفظ الفيديو بدون علامة مائية', 'تغيير دولة المحتوى بضغطة زر', 'إخفاء الإعلانات والبثوث المزعجة', 'تشغيل الصوتيات بالخلفية'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/BHTikTokLRD-30.3.0.ipa',
  },
  {
    id: 'instagram-elite',
    name: 'Instagram Elite Plus',
    category: 'social',
    version: 'v289.1',
    size: '138 MB',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
    badge: 'نسخة VIP',
    description: 'إنستغرام بلس مع إمكانيات غير محدودة: تنزيل الفيديوهات والستوريات بجودة عالية، إخفاء مؤشرات قراءة الرسائل ومشاهدة القصص.',
    features: ['تنزيل الفيديوهات والريلز بضغطة زر', 'إخفاء مشاهدة الستوري', 'إخفاء مؤشر قراءة الرسائل (Seen)', 'تكبير صورة البروفايل'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/06-28-2023/InstagramElite-289.1.ipa',
  },
  {
    id: 'delta-emulator',
    name: 'Delta All-In-One Emulator',
    category: 'games',
    version: 'v1.6.2',
    size: '41 MB',
    icon: 'https://deltaemulator.com/assets/images/delta-icon.png',
    badge: 'محاكي ألعاب ريترو 🎮',
    description: 'أقوى محاكي ألعاب كلاسيكية على نظام iOS: يدعم ألعاب Game Boy Advance, Nintendo DS, Nintendo 64, SNES, مع دعم ذراع التحكم الخارجية.',
    features: ['يدعم أجهزة نينتندو الكلاسيكية', 'دعم أيادي التحكم (PS5 / Xbox)', 'حفظ واستعادة تقدم الألعاب فورياً', 'مزامنة سحابية لحفظ الألعاب'],
    downloadUrl: 'https://github.com/rileytestut/Delta/releases/download/v1.6/Delta_1_6.ipa',
  },
  {
    id: 'ppsspp-emu',
    name: 'PPSSPP PlayStation Portable',
    category: 'games',
    version: 'v1.13.2',
    size: '14 MB',
    icon: 'https://www.ppsspp.org/images/logo.svg',
    badge: 'محاكي ألعاب PSP 🎮',
    description: 'محاكي بلايستيشن بورتابل PSP الشهير بدقة 4K ومعدل 60 إطار بالثانية مع دعم كامل لذراع التحكم والألعاب المحفوظة.',
    features: ['تشغيل ألعاب PSP بدقة 4K و 60fps', 'دعم ذراع التحكم اللاسلكية', 'حفظ وإعادة اللقطات في أي لحظة', 'تحسين الألوان والرسوميات'],
    downloadUrl: 'https://github.com/QuarkSources/ppsspp-builder/releases/download/v1.13.2/PPSSPP_v1.13.2.ipa',
  },
  {
    id: 'sidestore-app',
    name: 'SideStore Community',
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
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

  // Fetch real IPAs on mount
  useEffect(() => {
    async function loadScrapedIpas() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/app/ipas');
        if (res.ok) {
          const data = await res.json();
          if (data.apps && data.apps.length > 0) {
            setApps(data.apps);
          }
        }
      } catch (err) {
        console.error('Failed to load scraped apps:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadScrapedIpas();
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/app/ipas?refresh=true');
      if (res.ok) {
        const data = await res.json();
        if (data.apps && data.apps.length > 0) {
          setApps(data.apps);
        }
      }
    } catch (err) {
      console.error('Failed to refresh apps from sources:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

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
    <section id="modded-ipas" className="py-20 px-4 max-w-6xl mx-auto scroll-mt-20 border-t border-slate-800/80">
      {/* Header */}
      <ScrollReveal direction="up" distance={20}>
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-sm animate-pulse-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مكتبة التطبيقات المعدلة الحقيقية (Scraped Community IPAs)</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            <span className="heading-gradient-blue">أكثر من {apps.length}+ تطبيق بلس</span> بروابط مباشرة
          </h2>

          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            يتم سحب وتحديث هذه التطبيقات تلقائياً من كبرى مستودعات مجتمع الـ iOS (SideStore & TrollStore Repos). جميع الروابط مباشرة ومجربة وجاهزة للتثبيت فوراً عبر <span className="text-blue-400 font-semibold">SideLink</span>.
          </p>

          {/* Sync status & Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              ✓ تم جلب {apps.length} تطبيق نشط
            </span>
            <button
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
              title="سحب وتحديث أحدث الإصدارات من المستودعات الآن"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isRefreshing ? 'جاري السحب...' : 'سحب وتحديث الآن'}</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="pt-6 max-w-2xl mx-auto space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(18);
                }}
                placeholder="ابحث بين مئات التطبيقات، مثل: Spotify، TikTok، WhatsApp، Delta، Infuse..."
                className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 text-sm transition shadow-inner"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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
          <ScrollReveal key={app.id + '-' + idx} delayMs={(idx % 3) * 60} direction="up" distance={20}>
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
                          // Fallback icon on error
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
            عرض المزيد من التطبيقات ({filteredApps.length - visibleCount} تطبيق متبقي) ↓
          </button>
        </div>
      )}

      {filteredApps.length === 0 && (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <p className="text-slate-400 text-sm">لم يتم العثور على تطبيقات مطابقة لبحثك.</p>
        </div>
      )}

      {/* Community Request Banner */}
      <ScrollReveal direction="up" distance={20} delayMs={100}>
        <div className="mt-12 p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1">
          <div>
            <h4 className="text-white font-bold text-base mb-1">هل تبحث عن تطبيق معدل أو لعبة معينة؟</h4>
            <p className="text-xs text-slate-400">
              يتم تحديث المكتبة تلقائياً بأحدث نسخ الـ IPA المعدلة. يمكنك إرسال روابط ومستودعات جديدة لإضافتها إلى السكرابر.
            </p>
          </div>
          <a
            href="https://github.com/eltagriby1996/SideLink/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          >
            طلب إضافة تطبيق
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
