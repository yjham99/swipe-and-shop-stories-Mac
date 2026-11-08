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
