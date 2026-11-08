export type Platform = "Naver" | "YouTube" | "Coupang" | "Instagram" | "Xiaohongshu/Douyin";
export const PLATFORMS: Platform[] = ["Naver", "YouTube", "Coupang", "Instagram", "Xiaohongshu/Douyin"];

export type LinkStatus = "unchecked" | "verified" | "watchlist" | "match-fail";

export interface Product {
  id: string;
  name: string;
  platform: Platform;
  price: number;
  trendScore: number;
  affiliateUrl: string;
  linkStatus: LinkStatus;
  source?: SourceChannel;
  refVideoUrl?: string;
  usp?: string;
}

/** Match-Fail Rule: a link is valid only if it is a Coupang Partners (link.coupang.com) or known affiliate URL. */
export function verifyAffiliateLink(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return (
      u.hostname === "link.coupang.com" ||
      u.hostname === "coupa.ng" ||
      (u.hostname.endsWith("naver.me") && u.pathname.length > 1)
    );
  } catch {
    return false;
  }
}

/** Only verified products may move past sourcing. */
export function canProceed(p: Product): boolean {
  return p.linkStatus === "verified";
}

const SEED: Omit<Product, "id" | "linkStatus">[] = [
  { name: "Portable Neck Fan Pro", platform: "Coupang", price: 24900, trendScore: 94, affiliateUrl: "https://link.coupang.com/a/neckfan", refVideoUrl: "https://www.douyin.com/video/7300000001" },
  { name: "Magnetic Phone Stand", platform: "YouTube", price: 12900, trendScore: 88, affiliateUrl: "https://link.coupang.com/a/magstand" },
  { name: "Silicone Food Storage Set", platform: "Naver", price: 18500, trendScore: 81, affiliateUrl: "https://naver.me/xF2kQ" },
  { name: "Mini Thermal Printer", platform: "Xiaohongshu/Douyin", price: 32000, trendScore: 91, affiliateUrl: "", refVideoUrl: "https://www.xiaohongshu.com/explore/demo1" },
  { name: "LED Cloud Night Light", platform: "Instagram", price: 15900, trendScore: 76, affiliateUrl: "" },
  { name: "Electric Spin Scrubber", platform: "Coupang", price: 29900, trendScore: 85, affiliateUrl: "https://coupa.ng/bXy12" },
];

export function seedProducts(): Product[] {
  return SEED.map((s, i) => ({ ...s, id: `p${i + 1}`, linkStatus: "unchecked" }));
}

/** Auto Scan trends simulator: discovers new items and recalibrates scores. */
export function autoScanTrends(existing: Product[]): { updated: Product[]; addedCount: number } {
  const trendingPool: Omit<Product, "id" | "linkStatus">[] = [
    { name: "Ultra Ultrasonic Cleaner", platform: "Coupang", price: 21900, trendScore: 97, affiliateUrl: "https://link.coupang.com/a/cleaner", refVideoUrl: "https://www.douyin.com/video/7400000002", source: "trend" },
    { name: "Auto Water Bottle Pump", platform: "Naver", price: 14500, trendScore: 93, affiliateUrl: "https://naver.me/pump123", refVideoUrl: "https://www.xiaohongshu.com/explore/pump1", source: "trend" },
    { name: "Collapsible Electric Kettle", platform: "Xiaohongshu/Douyin", price: 27000, trendScore: 89, affiliateUrl: "", refVideoUrl: "https://www.xiaohongshu.com/explore/kettle", source: "trend" },
  ];

  let addedCount = 0;
  const existingNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const newItems: Product[] = [];

  for (const item of trendingPool) {
    if (!existingNames.has(item.name.toLowerCase())) {
      newItems.push({
        ...item,
        id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        linkStatus: crossCheck(item.affiliateUrl),
      });
      addedCount++;
    }
  }

  const updated = [
    ...newItems,
    ...existing.map((p) => ({
      ...p,
      trendScore: Math.min(100, Math.max(50, p.trendScore + Math.floor(Math.random() * 5) - 2)),
    })),
  ];

  return { updated, addedCount };
}

export const STAGES = [
  { key: "hook", time: "0-3s", label: "Hook" },
  { key: "problem", time: "3-7s", label: "Problem" },
  { key: "solution", time: "7-12s", label: "Solution & Benefit" },
  { key: "cta", time: "12-15s", label: "CTA" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];
export type Script = Record<StageKey, string>;
export type VariantId = "A" | "B" | "C";

export function generateVariants(p: Product): Record<VariantId, Script> {
  const price = p.price.toLocaleString("ko-KR") + "원";
  return {
    A: {
      hook: `STOP scrolling — this ${p.name} is going viral for a reason.`,
      problem: "Everything else you tried breaks, looks cheap, or just doesn't work.",
      solution: `${p.name}: one-touch, built to last, and it actually delivers.`,
      cta: "Link is in my profile — grab it before it sells out again.",
    },
    B: {
      hook: "I was SO tired of this happening every single day…",
      problem: "If you've felt this frustration too, you're not alone.",
      solution: `Then I found ${p.name} and honestly, my routine changed.`,
      cta: "I left the exact one I use in my profile link. 💛",
    },
    C: {
      hook: `${price}?! For THIS? Wait.`,
      problem: "Similar products cost twice as much and do half the job.",
      solution: `${p.name} — top-rated, fast shipping, today's deal price.`,
      cta: "Deal price ends soon — tap the link in my profile now.",
    },
  };
}

export function buildPrompts(p: Product) {
  return [1, 2, 3, 4].map((n) => {
    const stage = STAGES[n - 1]!;
    return {
      clip: n,
      meta: `@reviewer holds @product (${p.name}) — ${stage.label.toLowerCase()} scene, vertical 9:16, natural daylight, handheld UGC style, ${stage.time}`,
      flow: `Google Flow: close-up of @product being used by @reviewer, ${stage.label} beat, smooth dolly-in, 4s, photoreal`,
      vidu: `Vidu: @reviewer reacts to @product, expressive face, ${stage.label} moment, 9:16, 4s, cinematic lighting`,
    };
  });
}

/* ---------- Telegram / China reference intake ---------- */

export type SourceChannel = "trend" | "telegram" | "manual";

/** Xiaohongshu / Douyin product-demo video links (incl. short links). */
export function isChinaVideoUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return /(^|\.)(xiaohongshu\.com|xhslink\.com|douyin\.com|iesdouyin\.com)$/.test(h);
  } catch {
    return false;
  }
}

/** Parse a forwarded Telegram message: first line = product name, URLs split into reference video vs domestic link. */
export function parseTelegramMessage(text: string): { name: string; refVideoUrl: string; affiliateUrl: string } {
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  const name = text.replace(/https?:\/\/\S+/g, "").split("\n").map((l) => l.trim()).find(Boolean) ?? "Telegram item";
  return {
    name: name.slice(0, 80),
    refVideoUrl: urls.find(isChinaVideoUrl) ?? "",
    affiliateUrl: urls.find(verifyAffiliateLink) ?? "",
  };
}

/** Coupang/Naver cross-check: listed → verified, not listed yet → watchlist (produce later, never discarded). */
export function crossCheck(affiliateUrl: string): "verified" | "watchlist" {
  return verifyAffiliateLink(affiliateUrl) ? "verified" : "watchlist";
}

/** Review priority: items with a China demo video come first, then by trend score. */
export function reviewSort<T extends { refVideoUrl?: string; trendScore: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(!!b.refVideoUrl) - Number(!!a.refVideoUrl) || b.trendScore - a.trendScore);
}

/* ---------- 45-55s shorts format ---------- */

export const CUTS = [
  { key: "hook", start: 0, end: 3, label: "Hook", rule: "스크롤을 멈추게 하는 첫마디 + 강한 비주얼" },
  { key: "problem", start: 3, end: 15, label: "Problem", rule: "일상 속 불편함 공감·질문" },
  { key: "solution", start: 15, end: 35, label: "Solution", rule: "제품 시연, 비포/애프터" },
  { key: "proof", start: 35, end: 50, label: "Benefit / Proof", rule: "실사용 만족, 가성비, 디테일" },
  { key: "cta", start: 50, end: 55, label: "CTA", rule: "프로필 링크 안내 + 긴박감" },
] as const;
export type CutKey = (typeof CUTS)[number]["key"];
export const SHORTS_MIN_SEC = 45;
export const SHORTS_MAX_SEC = 55;

export function totalDuration(durations: number[]): number {
  return durations.reduce((a, b) => a + b, 0);
}
export function isValidShortsLength(sec: number): boolean {
  return sec >= SHORTS_MIN_SEC && sec <= SHORTS_MAX_SEC;
}

export interface Cut { script: string; imagePrompt: string }
export interface Storyboard {
  productDescription: string;
  variants: { id: VariantId; angle: string; hookLine: string; cuts: Record<CutKey, Cut> }[];
}

export const LEGAL_PRESETS = [
  { id: "coupang", text: "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." },
  { id: "naver", text: "네이버 쇼핑 커넥트 활동으로 판매 수수료를 제공받을 수 있습니다." },
  { id: "ad", text: "[광고] 본 영상은 제휴 마케팅을 포함하고 있습니다." },
] as const;

/* ---------- Export & Metadata Utilities (Step 5) ---------- */

export function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);

  const hh = String(hrs).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const ms = String(millis).padStart(3, "0");

  return `${hh}:${mm}:${ss},${ms}`;
}

export function generateSrtContent(
  cuts: typeof CUTS,
  clips: Record<CutKey, { dur: number }>,
  getScript: (k: CutKey) => string
): string {
  let currentTime = 0;
  const blocks: string[] = [];

  cuts.forEach((cut, index) => {
    const dur = clips[cut.key]?.dur ?? (cut.end - cut.start);
    const startTimeStr = formatSrtTimestamp(currentTime);
    const endTimeStr = formatSrtTimestamp(currentTime + dur);
    const script = getScript(cut.key) || cut.rule;

    blocks.push(`${index + 1}\n${startTimeStr} --> ${endTimeStr}\n${script}\n`);
    currentTime += dur;
  });

  return blocks.join("\n");
}

export interface ShortsExportPackage {
  version: "1.0";
  exportedAt: string;
  product: Product;
  meta: {
    title: string;
    description: string;
    hashtags: string[];
    pinnedComment: string;
    legalNotice: string;
  };
  timeline: {
    totalDuration: number;
    cuts: Array<{
      key: CutKey;
      label: string;
      start: number;
      end: number;
      duration: number;
      tool: string;
      src: string;
      script: string;
      imagePrompt: string;
    }>;
  };
}

export function generateUploadMetadata(product: Product, hookLine: string, legalNotice: string) {
  const title = `SNS 품절대란 화제의 ${product.name}! 실제로 써보니 대박인 이유 🔥 #shorts`;
  const hashtags = ["#쇼핑숏폼", "#쇼츠추천", `#${product.platform.replace(/[^a-zA-Z0-9가-힣]/g, "")}`, "#내돈내산", "#꿀템추천"];
  const pinnedComment = `📌 영상 속 상품 정보 & 최저가 확인하기 👉 ${product.affiliateUrl || "프로필 링크 참조"}\n\n${legalNotice}`;

  return { title, hashtags, pinnedComment };
}

export function buildShortsPackage(params: {
  product: Product;
  hookLine: string;
  legalNotice: string;
  clips: Record<CutKey, { tool: string; src: string; dur: number }>;
  finalCut: (k: CutKey) => { script: string; imagePrompt?: string } | undefined;
}): ShortsExportPackage {
  const { product, hookLine, legalNotice, clips, finalCut } = params;
  const meta = generateUploadMetadata(product, hookLine, legalNotice);

  let currentStart = 0;
  const cuts = CUTS.map((c) => {
    const clip = clips[c.key] ?? { tool: "Meta AI", src: "", dur: c.end - c.start };
    const cutData = finalCut(c.key);
    const dur = clip.dur;
    const start = currentStart;
    const end = currentStart + dur;
    currentStart = end;

    return {
      key: c.key,
      label: c.label,
      start,
      end,
      duration: dur,
      tool: clip.tool,
      src: clip.src,
      script: cutData?.script ?? "",
      imagePrompt: cutData?.imagePrompt ?? "",
    };
  });

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    product,
    meta: {
      title: meta.title,
      description: `${product.name} 숏폼 영상 제작 패키지`,
      hashtags: meta.hashtags,
      pinnedComment: meta.pinnedComment,
      legalNotice,
    },
    timeline: {
      totalDuration: totalDuration(cuts.map((c) => c.duration)),
      cuts,
    },
  };
}
