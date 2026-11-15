'use client';

import React, { useState, useEffect } from 'react';
import ScrollReveal from './ScrollReveal';
import AdBanner from './AdBanner';
import AdScriptInjector from './AdScriptInjector';
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
  Crown,
  Clock,
  Zap,
  ShieldCheck,
  X,
  Key,
  ExternalLink,
  AlertCircle,
  Flame,
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

interface AdsConfig {
  enabled: boolean;
  topBannerHtml: string;
  bottomBannerHtml: string;
  popunderScript: string;
  socialBarScript: string;
  smartlinkUrl: string;
  openSmartlinkOnVerify: boolean;
  adCountdownSeconds: number;
}

const INITIAL_TOP_APPS: ModdedApp[] = [
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
    features: ['تشغيل كافة صيغ الفيديو MKV/MP4/AVI', 'دعم كامل لدقة 4K HDR و Dolby Vision', 'مزامنة تلقائية للترجمة العربية', 'تشغيل الفيديوهات من الشبكة السحابية'],
    downloadUrl: 'https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-09-2023/Infuse-7.5.8.ipa',
  },
];

export default function ModdedIpaSection() {
  const [apps, setApps] = useState<ModdedApp[]>(INITIAL_TOP_APPS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(18);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // VIP & Tiers State
  const [isVip, setIsVip] = useState<boolean>(false);
  const [vipKey, setVipKey] = useState<string>('');
  const [vipExpiry, setVipExpiry] = useState<string | null>(null);
  const [showVipModal, setShowVipModal] = useState<boolean>(false);
  const [vipInput, setVipInput] = useState<string>('');
  const [vipError, setVipError] = useState<string>('');
  const [vipSuccess, setVipSuccess] = useState<string>('');
  const [vipLoading, setVipLoading] = useState<boolean>(false);

  // Ads & Free Download State
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [activeDownloadApp, setActiveDownloadApp] = useState<ModdedApp | null>(null);
  const [countdown, setCountdown] = useState<number>(15);
  const [isLinkReady, setIsLinkReady] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const categories = [
    { id: 'all', name: 'جميع التطبيقات', icon: Layers },
    { id: 'social', name: 'سوشيال بلس', icon: Share2 },
    { id: 'music', name: 'صوتيات وفيديو', icon: Music },
    { id: 'games', name: 'ألعاب ومحاكيات', icon: Gamepad2 },
    { id: 'utilities', name: 'أدوات ونظام', icon: Wrench },
  ];

  // Load VIP state and Ads configuration on mount
  useEffect(() => {
    // 1. Check local VIP key
    try {
      const savedKey = localStorage.getItem('sidelink_web_vip_key');
      if (savedKey) {
        setVipKey(savedKey);
        fetch('/api/app/vip/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: savedKey }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.isVip) {
              setIsVip(true);
              setVipExpiry(data.expiresAt || null);
            } else {
              localStorage.removeItem('sidelink_web_vip_key');
              localStorage.removeItem('sidelink_web_vip_expiry');
              setIsVip(false);
            }
          })
          .catch(() => {
            // Keep active offline if user had valid key
            setIsVip(true);
          });
      }
    } catch {}

    // 2. Fetch Ads Configuration for Free Tier
    fetch('/api/app/ads')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.ads) {
          setAdsConfig(data.ads);
        }
      })
      .catch(() => {});

    // 3. Load full apps catalog in background
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

  // Auto-dismiss toast message
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 15-second countdown timer for Free Tier downloads
  useEffect(() => {
    if (!activeDownloadApp) return;

    setCountdown(15);
    setIsLinkReady(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLinkReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDownloadApp]);

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

  const executeDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Trigger download initiation: VIP downloads immediately; Free triggers 15-sec countdown
  const handleInitiateDownload = (app: ModdedApp) => {
    if (isVip) {
      executeDownload(app.downloadUrl);
      setToastMessage(`✓ عضوية VIP نشطة: تم بدء تحميل ${app.name} فوراً وبدون إعلانات! 👑`);
    } else {
      setActiveDownloadApp(app);
    }
  };

  // Called when the 15-second timer completes for Free user
  const handleFinishFreeDownload = () => {
    if (!activeDownloadApp) return;

    // Trigger IPA download
    executeDownload(activeDownloadApp.downloadUrl);

    // If ads enabled, trigger smartlink in background if configured
    if (adsConfig?.enabled && adsConfig?.openSmartlinkOnVerify && adsConfig?.smartlinkUrl) {
      try {
        window.open(adsConfig.smartlinkUrl, '_blank', 'noopener,noreferrer');
      } catch {}
    }

    setToastMessage(`✓ جاري تحميل ${activeDownloadApp.name} الآن بنجاح!`);
    setTimeout(() => {
      setActiveDownloadApp(null);
    }, 1200);
  };

  const handleCopyLink = (app: ModdedApp) => {
    navigator.clipboard.writeText(app.downloadUrl);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // VIP activation through modal
  const handleActivateVip = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToTest = vipInput.trim();
    if (!keyToTest) {
      setVipError('يرجى إدخال كود الـ VIP أولاً.');
      return;
    }

    setVipLoading(true);
    setVipError('');
    setVipSuccess('');

    try {
      const res = await fetch('/api/app/vip/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToTest }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.isVip) {
        localStorage.setItem('sidelink_web_vip_key', keyToTest);
        if (data.expiresAt) {
          localStorage.setItem('sidelink_web_vip_expiry', data.expiresAt);
        }
        setIsVip(true);
        setVipKey(keyToTest);
        setVipExpiry(data.expiresAt || null);
        setVipSuccess('🎉 تم تفعيل عضوية VIP بنجاح! يمكنك الآن التحميل الفوري وبدون أي إعلانات.');
        setTimeout(() => {
          setShowVipModal(false);
          setVipSuccess('');
          setVipInput('');
        }, 1500);
      } else {
        setVipError(data.error || 'الكود المدخل غير صالح أو انتهت صلاحيته.');
      }
    } catch {
      setVipError('حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setVipLoading(false);
    }
  };

  const handleLogoutVip = () => {
    try {
      localStorage.removeItem('sidelink_web_vip_key');
      localStorage.removeItem('sidelink_web_vip_expiry');
    } catch {}
    setIsVip(false);
    setVipKey('');
    setVipExpiry(null);
    setToastMessage('تم إلغاء تفعيل عضوية VIP والعودة للباقة المجانية.');
  };

  return (
    <section id="modded-ipas" className="py-12 px-4 max-w-6xl mx-auto scroll-mt-20">
      {/* Global Ad Scripts (Inject ONLY for Free Tier Users) */}
      {!isVip && adsConfig?.enabled && (
        <AdScriptInjector scripts={[adsConfig.popunderScript, adsConfig.socialBarScript]} />
      )}

      {/* Header */}
      <ScrollReveal direction="up" distance={20}>
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>متجر وتطبيقات الآيفون المعدلة والألعاب الحصرية</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            <span className="heading-gradient-blue">تطبيقات بلس ومعدلة</span> بروابط تحميل مباشرة
          </h1>

          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            حمل أشهر تطبيقات السوشيال ميديا بلس، تطبيقات المشاهدة والاستماع بدون إعلانات، وألعاب المحاكيات جاهزة للتثبيت فوراً عبر برنامج <span className="text-blue-400 font-semibold">SideLink</span>.
          </p>

          {/* TWO-TIER STATUS BAR: Free vs VIP */}
          <div className="pt-2 max-w-4xl mx-auto">
            {!isVip ? (
              /* Free Tier Banner */
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900 to-blue-950/40 border border-slate-800 text-right shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-right">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>الباقة المجانية (Free Tier)</span>
                    </span>
                    <span className="text-xs text-amber-400 font-semibold">
                      انتظار 15 ثانية • إعلانات رعاية بسيطة
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm">
                    يمكنك تصفح وتحميل جميع التطبيقات مجاناً، أو الترقية لـ VIP لتخطي مؤقت الـ 15 ثانية وإلغاء كافة الإعلانات.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVipModal(true)}
                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Crown className="w-4 h-4 fill-current" />
                  <span>تفعيل عضوية VIP (تخطي الانتظار والإعلانات)</span>
                </button>
              </div>
            ) : (
              /* VIP Active Banner */
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-yellow-950/30 to-slate-900 border border-amber-500/40 text-right shadow-2xl shadow-amber-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-right">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>عضوية VIP مفعلة (VIP Member) 👑</span>
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold">
                      ⚡ تحميل فوري (0 ثانية) • خالي من الإعلانات تماماً
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm">
                    أنت تستمتع بالباقة المميزة: سرعة قصوى بدون أي مؤقت انتظار وبدون أي إعلانات نهائياً.{' '}
                    <span className="text-amber-300 font-mono text-xs">
                      {vipExpiry ? `(ساري حتى: ${new Date(vipExpiry).toLocaleDateString('ar-EG')})` : '(اشتراك دائم مدى الحياة ♾️)'}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutVip}
                  className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700 shrink-0 cursor-pointer"
                >
                  إلغاء التفعيل / تغيير الكود
                </button>
              </div>
            )}
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

            {/* Category Pills */}
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
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
                <button
                  type="button"
                  onClick={() => handleInitiateDownload(app)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                    isVip
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-amber-500/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  }`}
                >
                  {isVip ? (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>تحميل VIP فوري (0 ث)</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>تحميل IPA (مجاني)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink(app)}
                  title="نسخ رابط التحميل المباشر"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200 hover:-translate-y-0.5 text-xs border border-slate-700/60 cursor-pointer"
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
            className="px-8 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-400 hover:text-blue-300 font-bold text-sm shadow-lg shadow-blue-900/10 transition active:scale-95 cursor-pointer"
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

      {/* ============================================================== */}
      {/* FREE TIER: 15-SECOND COUNTDOWN & SPONSORED ADS MODAL           */}
      {/* ============================================================== */}
      {activeDownloadApp && !isVip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full text-right shadow-2xl space-y-5 relative overflow-hidden">
            {/* Top glowing accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

            {/* Header with App info & close */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 p-2 border border-slate-800 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeDownloadApp.icon}
                    alt={activeDownloadApp.name}
                    className="w-8 h-8 object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base line-clamp-1">
                    {activeDownloadApp.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono">{activeDownloadApp.version}</span>
                    <span>•</span>
                    <span className="font-mono text-cyan-400">{activeDownloadApp.size}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDownloadApp(null)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tier Info Pill */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
              <span>الباقة المجانية: جاري تجهيز وفحص رابط التحميل المباشر للتطبيق...</span>
            </div>

            {/* 15-Second Animated Circular Countdown or Ready State */}
            {!isLinkReady ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      className="stroke-slate-800"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      className="stroke-blue-500 transition-all duration-1000 ease-linear"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * (15 - countdown)) / 15}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white font-mono">{countdown}</span>
                    <span className="text-[10px] text-slate-400">ثانية</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center">
                  يرجى الانتظار {countdown} ثوانٍ حتى يصبح رابط الـ IPA جاهزاً للتنزيل...
                </p>
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl bg-slate-800/90 text-slate-500 font-bold text-xs sm:text-sm cursor-not-allowed border border-slate-700/50"
                >
                  جاري تجهيز الرابط المباشر ({countdown} ثانية)...
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-3 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
                  <Check className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white text-center">رابط التحميل جاهز الآن!</h4>
                <p className="text-xs text-slate-400 text-center">
                  اكتمل الفحص والتجهيز. اضغط على الزر أدناه لبدء تنزيل ملف الـ IPA فوراً.
                </p>
                <button
                  type="button"
                  onClick={handleFinishFreeDownload}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 active:scale-98 transition flex items-center justify-center gap-2.5 animate-pulse cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>🚀 بدء تحميل ملف IPA الآن ({activeDownloadApp.size})</span>
                </button>
              </div>
            )}

            {/* Sponsored Advertisement Banner for Free Users */}
            {adsConfig?.topBannerHtml ? (
              <div className="pt-1">
                <AdBanner
                  htmlCode={adsConfig.topBannerHtml}
                  label="إعلان ممول • يدعم استمرار الخدمة المجانية"
                  minHeight={90}
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  إعلان ممول • Sponsored Ad
                </span>
                <p className="text-xs text-slate-400">
                  حمل وثبت أحدث تطبيقات الآيفون مجاناً برعاية <span className="text-blue-400 font-bold">SideLink</span>
                </p>
              </div>
            )}

            {/* VIP Upgrade Fast-Track inside Download Modal */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>تريد التحميل فوراً بدون انتظار وبدون إعلانات؟</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveDownloadApp(null);
                  setShowVipModal(true);
                }}
                className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-4 cursor-pointer"
              >
                تفعيل VIP الآن 👑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIP ACTIVATION MODAL                                           */}
      {/* ============================================================== */}
      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full text-right shadow-2xl space-y-5 relative overflow-hidden">
            {/* Top gold accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">تفعيل عضوية VIP للمتجر</h3>
                  <p className="text-xs text-amber-400">تحميل فوري 0 ثانية • بدون أي إعلانات</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowVipModal(false);
                  setVipError('');
                  setVipSuccess('');
                }}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleActivateVip} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                أدخل كود الـ VIP المعتمد الخاص بك لتفعيل التحميل المباشر لجميع تطبيقات بلس والألعاب المعدلة بدون أي مؤقت انتظار (0 ثانية) وبدون أي إعلانات.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">كود التحقق / VIP Key:</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={vipInput}
                    onChange={(e) => setVipInput(e.target.value.toUpperCase())}
                    placeholder="SL-VIP-XXXX-XXXX"
                    dir="ltr"
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition tracking-wider"
                  />
                </div>
              </div>

              {vipError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{vipError}</span>
                </div>
              )}

              {vipSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{vipSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={vipLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {vipLoading ? (
                  <span>جاري التحقق من الكود...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>تفعيل عضوية VIP الآن</span>
                  </>
                )}
              </button>
            </form>

            {/* Telegram Channel Info */}
            <div className="pt-3 border-t border-slate-800 text-center space-y-2">
              <p className="text-[11px] text-slate-400">
                ليس لديك كود VIP حتى الآن؟ يمكنك الحصول على الأكواد والاشتراكات عبر قناة الدعم الرسمية:
              </p>
              <a
                href="https://t.me/sidelink_channel"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold transition hover:underline"
              >
                <span>انضم لقناة تليجرام @sidelink_channel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-y-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 border border-blue-500/50 text-white text-xs sm:text-sm font-bold shadow-2xl shadow-blue-950 flex items-center gap-2.5 animate-bounce" dir="rtl">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
}
