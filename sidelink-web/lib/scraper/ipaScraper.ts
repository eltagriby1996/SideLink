export interface ScrapedIpaApp {
  id: string;
  name: string;
  category: 'social' | 'music' | 'games' | 'utilities';
  version: string;
  size: string;
  icon: string;
  badge: string;
  description: string;
  features: string[];
  downloadUrl: string;
  bundleId?: string;
  updatedAt?: string;
}

// In-memory cache
let cachedApps: ScrapedIpaApp[] | null = null;
let lastScrapedTime: number = 0;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function detectCategory(name: string, desc: string): 'social' | 'music' | 'games' | 'utilities' {
  const text = (name + ' ' + desc).toLowerCase();
  
  if (
    text.includes('spotify') ||
    text.includes('music') ||
    text.includes('sound') ||
    text.includes('deezer') ||
    text.includes('audio')
  ) {
    return 'music';
  }

  if (
    text.includes('emu') ||
    text.includes('game') ||
    text.includes('retroarch') ||
    text.includes('ppsspp') ||
    text.includes('delta') ||
    text.includes('nds') ||
    text.includes('nes') ||
    text.includes('mame') ||
    text.includes('dos') ||
    text.includes('bird') ||
    text.includes('play') ||
    text.includes('arcade')
  ) {
    return 'games';
  }

  if (
    text.includes('tiktok') ||
    text.includes('whatsapp') ||
    text.includes('instagram') ||
    text.includes('twitter') ||
    text.includes('facebook') ||
    text.includes('youtube') ||
    text.includes('discord') ||
    text.includes('enmity') ||
    text.includes('reddit') ||
    text.includes('twitch') ||
    text.includes('social') ||
    text.includes('chat') ||
    text.includes('wolf') ||
    text.includes('lrd') ||
    text.includes('plus')
  ) {
    return 'social';
  }

  return 'utilities';
}

function generateFeatures(name: string, category: string): string[] {
  const lower = name.toLowerCase();
  if (lower.includes('spotify')) {
    return ['بدون أي إعلانات', 'تخطي غير محدود', 'صوت فائق الجودة'];
  }
  if (lower.includes('tiktok')) {
    return ['حفظ بدون علامة مائية', 'تخطي الإعلانات', 'تغيير المنطقة'];
  }
  if (lower.includes('instagram')) {
    return ['حفظ الصور والفيديوهات', 'إخفاء قراءة الرسائل', 'تكبير الصور'];
  }
  if (lower.includes('youtube')) {
    return ['منع الإعلانات تماماً', 'تشغيل في الخلفية', 'تنزيل الفيديوهات والصوتيات'];
  }
  if (lower.includes('whatsapp')) {
    return ['إخفاء آخر ظهور والصح الأزرق', 'منع حذف الرسائل', 'تثبيت كنسخة ثانية'];
  }
  if (lower.includes('facebook')) {
    return ['حفظ الفيديوهات بسهولة', 'منع الإعلانات الممولة', 'إخفاء مؤشر القراءة'];
  }
  if (category === 'games') {
    return ['دعم يد التحكم الخارجية', 'حفظ التقدم فورياً', 'ألعاب كلاسيكية كاملة'];
  }
  if (category === 'music') {
    return ['جودة صوتية عالية', 'تشغيل في الخلفية', 'بدون اشتراك مدفوع'];
  }
  if (category === 'social') {
    return ['مميزات VIP حصرية', 'تخطي القيود الرسمية', 'حماية الحساب'];
  }
  return ['متوافق مع SideLink', 'تثبيت مباشر وتوقيع فوري', 'آمن ومجرب 100%'];
}

function generateBadge(name: string, category: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('spotify') || lower.includes('youtube')) return 'الأكثر طلباً 🔥';
  if (lower.includes('tiktok') || lower.includes('whatsapp')) return 'نسخة VIP';
  if (lower.includes('instagram') || lower.includes('facebook')) return 'مميزات بلس';
  if (category === 'games') return 'ألعاب ومحاكيات 🎮';
  if (category === 'music') return 'موسيقى بدون إعلانات';
  if (category === 'social') return 'سوشيال ميديا بلس';
  return 'أداة نظام';
}

export async function scrapeAllIpaSources(forceRefresh = false): Promise<ScrapedIpaApp[]> {
  const now = Date.now();
  if (!forceRefresh && cachedApps && (now - lastScrapedTime < CACHE_TTL_MS)) {
    return cachedApps;
  }

  const results: ScrapedIpaApp[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  // 1. Fetch SideStore Community Repository
  try {
    const res = await fetch('https://community-apps.sidestore.io/sidecommunity.json', {
      headers: { 'User-Agent': 'SideLink-Bot/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        if (!a.downloadURL || !a.downloadURL.endsWith('.ipa') || seenUrls.has(a.downloadURL)) continue;
        const id = a.bundleIdentifier || a.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(a.downloadURL);
        seenIds.add(id);

        const category = detectCategory(a.name, a.localizedDescription || '');
        results.push({
          id,
          name: a.name,
          category,
          version: a.version || '1.0',
          size: a.size ? `${Math.round(a.size / (1024 * 1024))} MB` : '40 MB',
          icon: a.iconURL || 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
          badge: generateBadge(a.name, category),
          description: a.localizedDescription || `تطبيق ${a.name} بنسخة كاملة مخصصة للتثبيت السريع عبر SideLink.`,
          features: generateFeatures(a.name, category),
          downloadUrl: a.downloadURL,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to scrape SideStore repo:', err);
  }

  // 2. Fetch TrollStore Community IPAs (swaggyP36000)
  try {
    const res = await fetch('https://raw.githubusercontent.com/swaggyP36000/TrollStore-IPAs/main/apps.json', {
      headers: { 'User-Agent': 'SideLink-Bot/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        const v = a.versions && a.versions.length > 0 ? a.versions[0] : null;
        const dl = v?.downloadURL || a.downloadURL;
        if (!dl || !dl.endsWith('.ipa') || seenUrls.has(dl)) continue;

        const id = a.bundleIdentifier || a.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(dl);
        seenIds.add(id);

        const category = detectCategory(a.name, v?.localizedDescription || '');
        const sizeMb = v?.size ? Math.round(v.size / (1024 * 1024)) : 50;

        results.push({
          id,
          name: a.name,
          category,
          version: v?.version || a.version || '1.0',
          size: `${sizeMb} MB`,
          icon: a.iconURL || 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
          badge: generateBadge(a.name, category),
          description: v?.localizedDescription || `نسخة ${a.name} المعدلة مع مميزات بلس متقدمة وجاهزة للتوقيع المباشر عبر SideLink.`,
          features: generateFeatures(a.name, category),
          downloadUrl: dl,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to scrape TrollStore repo:', err);
  }

  // 3. Guarantee VIP Featured Apps at top of list
  const priorityKeywords = ['spotify', 'youtube', 'tiktok', 'instagram', 'whatsapp', 'delta', 'ppsspp'];
  results.sort((a, b) => {
    const aPri = priorityKeywords.some((k) => a.name.toLowerCase().includes(k));
    const bPri = priorityKeywords.some((k) => b.name.toLowerCase().includes(k));
    if (aPri && !bPri) return -1;
    if (!aPri && bPri) return 1;
    return a.name.localeCompare(b.name);
  });

  cachedApps = results;
  lastScrapedTime = now;
  return results;
}
