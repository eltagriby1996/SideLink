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

// In-memory cache for fast instant response
let cachedApps: ScrapedIpaApp[] | null = null;
let lastScrapedTime: number = 0;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

function cleanAppName(rawName: string): string {
  let name = rawName.trim();
  // Clean up common file-like extensions or underscores
  name = name.replace(/_sl$/i, '');
  name = name.replace(/_CyPwn$/i, '');
  name = name.replace(/_Cracked$/i, '');
  name = name.replace(/_v?\d+(\.\d+)*$/i, '');
  name = name.replace(/[-_]/g, ' ').trim();

  const lower = name.toLowerCase();
  if (lower === 'watusi') return 'WhatsApp Watusi 3 (واتساب بلس)';
  if (lower.includes('watusi') && lower.includes('duplicate')) return 'WhatsApp Watusi (نسخة ثانية مكررة)';
  if (lower.includes('watusi') && lower.includes('business')) return 'WhatsApp Business Watusi';
  if (lower === 'regram') return 'Instagram Regram Plus (إنستغرام بلس)';
  if (lower.includes('regram') && lower.includes('duplicate')) return 'Instagram Regram (نسخة ثانية مكررة)';
  if (lower === 'uyouenhanced') return 'YouTube uYouEnhanced (يوتيوب بلس)';
  if (lower.includes('eeveespotify') || lower.includes('spotifydeluxe')) return 'Spotify++ Deluxe (سبوتيفاي بلس)';
  if (lower.includes('bhtiktoklrd') || lower.includes('tiktokdark')) return 'TikTok LRD Plus (تيك توك بلس)';
  if (lower.includes('facebookwolf')) return 'Facebook Wolf Plus (فيسبوك بلس)';
  if (lower.includes('dltwitter') || lower.includes('bhtwitter')) return 'X / Twitter Plus (تويتر بلس)';
  if (lower.includes('picsart')) return 'PicsArt Gold (بيكس آرت مفتوح)';
  if (lower.includes('inshot')) return 'InShot Pro (إن شوت برو)';
  if (lower.includes('infuse')) return 'Infuse Pro 4K (مشغل إنفيوز برو)';
  if (lower.includes('moviebox')) return 'MovieBox Pro (أفلام ومسلسلات)';
  if (lower.includes('stremio')) return 'Stremio Media Player';
  if (lower.includes('delta')) return 'Delta All-In-One Emulator (محاكي ألعاب)';
  if (lower.includes('ppsspp')) return 'PPSSPP PlayStation (محاكي PSP)';
  if (lower.includes('retroarch')) return 'RetroArch All-In-One (محاكي شامل)';
  if (lower.includes('sidestore')) return 'SideStore Community (تجديد ذاتي)';

  return name;
}

function detectCategory(name: string, desc: string): 'social' | 'music' | 'games' | 'utilities' {
  const text = (name + ' ' + desc).toLowerCase();

  if (
    text.includes('spotify') ||
    text.includes('music') ||
    text.includes('sound') ||
    text.includes('audio') ||
    text.includes('ytmusic') ||
    text.includes('spotube')
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
    text.includes('arcade') ||
    text.includes('warrior') ||
    text.includes('vcmi')
  ) {
    return 'games';
  }

  if (
    text.includes('youtube') ||
    text.includes('whatsapp') ||
    text.includes('watusi') ||
    text.includes('instagram') ||
    text.includes('regram') ||
    text.includes('tiktok') ||
    text.includes('twitter') ||
    text.includes('facebook') ||
    text.includes('snapchat') ||
    text.includes('discord') ||
    text.includes('enmity') ||
    text.includes('telegram') ||
    text.includes('reddit') ||
    text.includes('twitch') ||
    text.includes('social') ||
    text.includes('chat') ||
    text.includes('stremio') ||
    text.includes('moviebox') ||
    text.includes('infuse') ||
    text.includes('picsart') ||
    text.includes('inshot')
  ) {
    return 'social';
  }

  return 'utilities';
}

function generateFeatures(name: string, category: string): string[] {
  const lower = name.toLowerCase();
  if (lower.includes('youtube')) {
    return ['بدون أي إعلانات إطلاقاً', 'تشغيل المقاطع في الخلفية', 'تنزيل الفيديوهات والصوتيات بدقة 4K', 'ميزة نافذة صورة داخل صورة (PiP)'];
  }
  if (lower.includes('whatsapp') || lower.includes('watusi')) {
    return ['إخفاء آخر ظهور والصح الأزرق', 'منع حذف الرسائل والحالات', 'قفل المحادثات برمز سري وبصمة FaceID', 'إرسال وسائط بحجم غير محدود'];
  }
  if (lower.includes('spotify')) {
    return ['بدون أي إعلانات صوتية أو بصرية', 'تخطي أغاني غير محدود', 'صوت فائق الجودة 320kbps', 'الاستماع عند الطلب لأي ألبوم'];
  }
  if (lower.includes('tiktok')) {
    return ['حفظ الفيديوهات بدون علامة مائية', 'تغيير المنطقة الجغرافية بنقرة زر', 'منع الإعلانات والبثوث المزعجة', 'تشغيل الصوتيات بالخلفية'];
  }
  if (lower.includes('instagram') || lower.includes('regram')) {
    return ['تنزيل الصور والريلز والستوريات', 'إخفاء مؤشر قراءة الرسائل (Seen)', 'مشاهدة القصص دون علم الطرف الآخر', 'تكبير الصور الشخصية بجودة كاملة'];
  }
  if (lower.includes('facebook')) {
    return ['حفظ الفيديوهات إلى ألبوم الكاميرا', 'إزالة الإعلانات والمنشورات الممولة', 'إخفاء مؤشرات القراءة'];
  }
  if (lower.includes('twitter') || lower.includes('bhx')) {
    return ['تنزيل الفيديوهات بأعلى دقة', 'إلغاء الإعلانات والمقاطع المقترحة', 'تأكيد الإعجاب والتغريد'];
  }
  if (lower.includes('picsart')) {
    return ['فتح كافة فلاتر وتأثيرات Gold', 'حفظ الصور بدقة فائقة بدون علامة', 'أدوات الذكاء الاصطناعي مفتوحة'];
  }
  if (lower.includes('inshot')) {
    return ['تصدير بدون علامة مائية', 'كافة الانتقالات والمؤثرات مجانية', 'تصدير فيديو بدقة 4K و 60 إطار'];
  }
  if (lower.includes('infuse')) {
    return ['تشغيل كافة صيغ الفيديو والصوت', 'دعم Dolby Vision و Atmos', 'مزامنة مع Google Drive و OneDrive'];
  }
  if (lower.includes('delta')) {
    return ['محاكاة GBA, GBC, SNES, N64, NDS', 'دعم كامل لأيادي التحكم الخارجية', 'حفظ واستعادة تقدم الألعاب فورياً'];
  }
  if (lower.includes('ppsspp')) {
    return ['تشغيل ألعاب PSP بدقة 4K و 60fps', 'دعم ذراع التحكم اللاسلكية', 'حفظ وإعادة اللقطات في أي لحظة'];
  }
  if (category === 'games') {
    return ['دعم يد التحكم الخارجية', 'حفظ التقدم فورياً بدون قيود', 'ألعاب كلاسيكية كاملة بدون إعلانات'];
  }
  if (category === 'music') {
    return ['جودة صوتية عالية', 'تشغيل في الخلفية والشاشة مقفلة', 'بدون أي اشتراكات مدفوعة'];
  }
  if (category === 'social') {
    return ['مميزات VIP وتعديلات حصرية', 'تخطي قيود التطبيقات الرسمية', 'حماية الخصوصية والأمان'];
  }
  return ['متوافق 100% مع أداة SideLink', 'تثبيت وتوقيع فوري بشهادة شخصية', 'فحص أمني وخلو تام من البرمجيات الضارة'];
}

function generateBadge(name: string, category: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('youtube') || lower.includes('spotify')) return 'الأكثر تحميلاً 🔥';
  if (lower.includes('whatsapp') || lower.includes('watusi')) return 'نسخة بلس VIP';
  if (lower.includes('tiktok') || lower.includes('instagram') || lower.includes('regram')) return 'محدث لآخر إصدار';
  if (lower.includes('picsart') || lower.includes('inshot') || lower.includes('infuse')) return 'نسخة برو Pro';
  if (category === 'games') return 'ألعاب ومحاكيات 🎮';
  if (category === 'music') return 'موسيقى نقية';
  if (category === 'social') return 'سوشيال ميديا بلس';
  return 'أداة مساعدة';
}

export async function scrapeAllIpaSources(forceRefresh = false): Promise<ScrapedIpaApp[]> {
  const now = Date.now();
  if (!forceRefresh && cachedApps && (now - lastScrapedTime < CACHE_TTL_MS)) {
    return cachedApps;
  }

  const results: ScrapedIpaApp[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  // 1. Fouad Raheb Source (Official WhatsApp Watusi & Instagram Regram)
  try {
    const res = await fetch('https://source.fouadraheb.com', {
      headers: { 'User-Agent': 'SideLink-Catalog/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        if (!a.downloadURL || !a.downloadURL.endsWith('.ipa') || seenUrls.has(a.downloadURL)) continue;
        const id = 'fouad-' + (a.bundleIdentifier || a.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(a.downloadURL);
        seenIds.add(id);

        const cleanName = cleanAppName(a.name);
        results.push({
          id,
          name: cleanName,
          category: 'social',
          version: a.version || '1.0',
          size: a.size ? `${Math.round(a.size / (1024 * 1024))} MB` : '110 MB',
          icon: a.iconURL || (cleanName.includes('WhatsApp') ? 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' : 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png'),
          badge: 'نسخة بلس رسمية 🔥',
          description: a.localizedDescription || `النسخة الرسمية المعتمدة من تطبيق ${cleanName} مع أحدث أدوات البلس الحصرية لتفعيل الخصوصية الكاملة.`,
          features: generateFeatures(cleanName, 'social'),
          downloadUrl: a.downloadURL,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch Fouad Raheb source:', err);
  }

  // 2. uYouEnhanced (Official YouTube Plus Source)
  try {
    const res = await fetch('https://raw.githubusercontent.com/arichornlover/arichornlover.github.io/main/apps.json', {
      headers: { 'User-Agent': 'SideLink-Catalog/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        if (!a.downloadURL || !a.downloadURL.endsWith('.ipa') || seenUrls.has(a.downloadURL)) continue;
        const id = 'uyou-' + (a.bundleIdentifier || a.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(a.downloadURL);
        seenIds.add(id);

        const cleanName = cleanAppName(a.name);
        results.push({
          id,
          name: cleanName,
          category: 'social',
          version: a.version || '21.20.4',
          size: a.size ? `${Math.round(a.size / (1024 * 1024))} MB` : '128 MB',
          icon: a.iconURL || 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
          badge: 'الأكثر طلباً 🔥',
          description: 'أفضل وأقوى نسخة يوتيوب معدلة للآيفون: بدون أي إعلانات، تشغيل في الخلفية، نافذة صورة داخل صورة، وتنزيل الفيديوهات حتى دقة 4K.',
          features: generateFeatures('youtube', 'social'),
          downloadUrl: a.downloadURL,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch uYouEnhanced source:', err);
  }

  // 3. CyPwn Repository (Over 210 apps: EeveeSpotify, PicsArt, Waze, Stremio, etc.)
  try {
    const res = await fetch('https://ipa.cypwn.xyz/cypwn.json', {
      headers: { 'User-Agent': 'SideLink-Catalog/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        if (!a.downloadURL || !a.downloadURL.endsWith('.ipa') || seenUrls.has(a.downloadURL)) continue;
        const id = 'cypwn-' + (a.bundleIdentifier || a.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(a.downloadURL);
        seenIds.add(id);

        const cleanName = cleanAppName(a.name);
        const category = detectCategory(cleanName, a.localizedDescription || '');
        const sizeMb = a.size ? Math.round(a.size / (1024 * 1024)) : 50;

        results.push({
          id,
          name: cleanName,
          category,
          version: a.version || '1.0',
          size: `${sizeMb} MB`,
          icon: a.iconURL || 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
          badge: generateBadge(cleanName, category),
          description: a.localizedDescription || `تطبيق ${cleanName} بنسخة كاملة مميزة مفتوحة المزايا ومجربة للعمل عبر SideLink.`,
          features: generateFeatures(cleanName, category),
          downloadUrl: a.downloadURL,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch CyPwn source:', err);
  }

  // 4. TrollStore Community Repos (swaggyP36000: TikTok LRD, Facebook Wolf, DLTwitter, Infuse, InShot, etc.)
  try {
    const res = await fetch('https://raw.githubusercontent.com/swaggyP36000/TrollStore-IPAs/main/apps.json', {
      headers: { 'User-Agent': 'SideLink-Catalog/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        const v = a.versions && a.versions.length > 0 ? a.versions[0] : null;
        const dl = v?.downloadURL || a.downloadURL;
        if (!dl || !dl.endsWith('.ipa') || seenUrls.has(dl)) continue;

        const id = 'swaggy-' + (a.bundleIdentifier || a.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(dl);
        seenIds.add(id);

        const cleanName = cleanAppName(a.name);
        const category = detectCategory(cleanName, v?.localizedDescription || '');
        const sizeMb = v?.size ? Math.round(v.size / (1024 * 1024)) : 55;

        results.push({
          id,
          name: cleanName,
          category,
          version: v?.version || a.version || '1.0',
          size: `${sizeMb} MB`,
          icon: a.iconURL || 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
          badge: generateBadge(cleanName, category),
          description: v?.localizedDescription || `نسخة ${cleanName} المعدلة مع مميزات متقدمة جاهزة للتوقيع والتثبيت الفوري.`,
          features: generateFeatures(cleanName, category),
          downloadUrl: dl,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch TrollStore source:', err);
  }

  // 5. SideStore Community Repos (PPSSPP, RetroArch, iNDS, iTorrent, etc.)
  try {
    const res = await fetch('https://community-apps.sidestore.io/sidecommunity.json', {
      headers: { 'User-Agent': 'SideLink-Catalog/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.apps || []) {
        if (!a.downloadURL || !a.downloadURL.endsWith('.ipa') || seenUrls.has(a.downloadURL)) continue;
        const id = 'sidestore-' + (a.bundleIdentifier || a.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (seenIds.has(id)) continue;

        seenUrls.add(a.downloadURL);
        seenIds.add(id);

        const cleanName = cleanAppName(a.name);
        const category = detectCategory(cleanName, a.localizedDescription || '');

        results.push({
          id,
          name: cleanName,
          category,
          version: a.version || '1.0',
          size: a.size ? `${Math.round(a.size / (1024 * 1024))} MB` : '40 MB',
          icon: a.iconURL || 'https://raw.githubusercontent.com/eltagriby1996/SideLink/main/assets/app.ico',
          badge: generateBadge(cleanName, category),
          description: a.localizedDescription || `تطبيق ${cleanName} الأصلي المجهز للتثبيت الفوري عبر SideLink.`,
          features: generateFeatures(cleanName, category),
          downloadUrl: a.downloadURL,
          bundleId: a.bundleIdentifier,
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch SideStore source:', err);
  }

  // Sort: Put VIP essentials strictly first
  const vipHierarchy = [
    'youtube',
    'watusi',
    'whatsapp',
    'spotify',
    'tiktok',
    'instagram',
    'regram',
    'facebook',
    'twitter',
    'picsart',
    'inshot',
    'infuse',
    'delta',
    'ppsspp',
    'retroarch',
    'sidestore',
    'moviebox',
    'stremio',
  ];

  results.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();

    const aRank = vipHierarchy.findIndex((k) => aLower.includes(k));
    const bRank = vipHierarchy.findIndex((k) => bLower.includes(k));

    if (aRank !== -1 && bRank !== -1) return aRank - bRank;
    if (aRank !== -1 && bRank === -1) return -1;
    if (aRank === -1 && bRank !== -1) return 1;

    return a.name.localeCompare(b.name);
  });

  cachedApps = results;
  lastScrapedTime = now;
  return results;
}
