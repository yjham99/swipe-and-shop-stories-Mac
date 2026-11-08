import { describe, expect, it } from "vitest";
import {
  autoScanTrends,
  buildShortsPackage,
  formatSrtTimestamp,
  generateSrtContent,
  generateUploadMetadata,
  isChinaVideoUrl,
  isValidShortsLength,
  parseTelegramMessage,
  reviewSort,
  seedProducts,
  totalDuration,
  verifyAffiliateLink,
  CUTS,
} from "./pipeline";
import { generateMockStoryboard } from "./mock-storyboard";

describe("pipeline core", () => {
  it("validates coupang and naver affiliate links only", () => {
    expect(verifyAffiliateLink("https://link.coupang.com/a/abc")).toBe(true);
    expect(verifyAffiliateLink("https://coupa.ng/bXy12")).toBe(true);
    expect(verifyAffiliateLink("https://naver.me/xF2kQ")).toBe(true);
    expect(verifyAffiliateLink("https://coupang.com/vp/products/123")).toBe(false);
    expect(verifyAffiliateLink("http://link.coupang.com/a/abc")).toBe(false);
    expect(verifyAffiliateLink("not-a-url")).toBe(false);
  });

  it("identifies china video demo urls", () => {
    expect(isChinaVideoUrl("https://www.douyin.com/video/7300000001")).toBe(true);
    expect(isChinaVideoUrl("https://v.douyin.com/abc/")).toBe(true);
    expect(isChinaVideoUrl("https://www.xiaohongshu.com/explore/demo1")).toBe(true);
    expect(isChinaVideoUrl("https://xhslink.com/a/xyz")).toBe(true);
    expect(isChinaVideoUrl("https://youtube.com/shorts/123")).toBe(false);
  });

  it("parses telegram messages into name, china ref, and affiliate link", () => {
    const raw = `접이식 실리콘 물병
https://www.xiaohongshu.com/explore/demo1
https://link.coupang.com/a/waterbottle`;
    const res = parseTelegramMessage(raw);
    expect(res.name).toBe("접이식 실리콘 물병");
    expect(res.refVideoUrl).toBe("https://www.xiaohongshu.com/explore/demo1");
    expect(res.affiliateUrl).toBe("https://link.coupang.com/a/waterbottle");
  });

  it("prioritizes items with china demo video then trend score", () => {
    const sorted = reviewSort([
      { id: "1", trendScore: 90 },
      { id: "2", trendScore: 50, refVideoUrl: "https://douyin.com/video/1" },
      { id: "3", trendScore: 99 },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["2", "3", "1"]);
  });

  it("enforces 45-55 second rule", () => {
    expect(isValidShortsLength(44)).toBe(false);
    expect(isValidShortsLength(45)).toBe(true);
    expect(isValidShortsLength(50)).toBe(true);
    expect(isValidShortsLength(55)).toBe(true);
    expect(isValidShortsLength(56)).toBe(false);
    expect(totalDuration([3, 12, 20, 15, 5])).toBe(55);
  });

  it("auto-scans trends and discovers new products", () => {
    const initial = seedProducts();
    const result = autoScanTrends(initial);
    expect(result.addedCount).toBeGreaterThan(0);
    expect(result.updated.length).toBeGreaterThan(initial.length);
  });

  it("formats srt timestamp correctly", () => {
    expect(formatSrtTimestamp(0)).toBe("00:00:00,000");
    expect(formatSrtTimestamp(3.5)).toBe("00:00:03,500");
    expect(formatSrtTimestamp(65)).toBe("00:01:05,000");
  });

  it("generates srt content", () => {
    const clips = {
      hook: { dur: 3 },
      problem: { dur: 12 },
      solution: { dur: 20 },
      proof: { dur: 15 },
      cta: { dur: 5 },
    };
    const srt = generateSrtContent(CUTS, clips, (k) => `Line for ${k}`);
    expect(srt).toContain("00:00:00,000 --> 00:00:03,000");
    expect(srt).toContain("Line for hook");
    expect(srt).toContain("00:00:50,000 --> 00:00:55,000");
    expect(srt).toContain("Line for cta");
  });

  it("generates upload metadata and builds export package", () => {
    const product = seedProducts()[0]!;
    const meta = generateUploadMetadata(product, "테스트 훅", "법적고지문구");
    expect(meta.title).toContain(product.name);
    expect(meta.pinnedComment).toContain(product.affiliateUrl);
    expect(meta.pinnedComment).toContain("법적고지문구");

    const clips = {
      hook: { tool: "Meta AI", src: "https://example.com/h.mp4", dur: 3 },
      problem: { tool: "Meta AI", src: "https://example.com/p.mp4", dur: 12 },
      solution: { tool: "Meta AI", src: "https://example.com/s.mp4", dur: 20 },
      proof: { tool: "Meta AI", src: "https://example.com/pr.mp4", dur: 15 },
      cta: { tool: "Meta AI", src: "https://example.com/c.mp4", dur: 5 },
    };

    const pkg = buildShortsPackage({
      product,
      hookLine: "테스트 훅",
      legalNotice: "법적고지문구",
      clips,
      finalCut: (k) => ({ script: `Script ${k}`, imagePrompt: `Prompt ${k}` }),
    });

    expect(pkg.version).toBe("1.0");
    expect(pkg.timeline.totalDuration).toBe(55);
    expect(pkg.timeline.cuts.length).toBe(5);
    expect(pkg.timeline.cuts[0]?.script).toBe("Script hook");
  });

  it("generates mock storyboard fallback without api key", () => {
    const mock = generateMockStoryboard({
      name: "Magnetic Phone Stand",
      price: 12900,
      platform: "YouTube",
      usp: "강력 마그네틱",
      target: "대학생",
      tone: "도파민/자극형",
    });

    expect(mock.variants.length).toBe(3);
    expect(mock.variants[0]?.id).toBe("A");
    expect(mock.variants[1]?.id).toBe("B");
    expect(mock.variants[2]?.id).toBe("C");
    expect(mock.variants[0]?.cuts.hook.script).toContain("Magnetic Phone Stand");
  });
});
