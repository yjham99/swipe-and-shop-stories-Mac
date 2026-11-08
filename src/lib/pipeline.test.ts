import { describe, it, expect } from "vitest";
import { verifyAffiliateLink, canProceed, seedProducts } from "./pipeline";

describe("Match-Fail rule", () => {
  it("accepts Coupang Partners links", () => {
    expect(verifyAffiliateLink("https://link.coupang.com/a/abc")).toBe(true);
  });
  it("flags non-affiliate or empty links", () => {
    expect(verifyAffiliateLink("https://item.taobao.com/123")).toBe(false);
    expect(verifyAffiliateLink("")).toBe(false);
  });
  it("blocks match-fail products from the pipeline", () => {
    const p = { ...seedProducts()[0]!, linkStatus: "match-fail" as const };
    expect(canProceed(p)).toBe(false);
    expect(canProceed({ ...p, linkStatus: "verified" })).toBe(true);
  });
});

import { parseTelegramMessage, crossCheck, reviewSort, CUTS, isValidShortsLength } from "./pipeline";

describe("Telegram intake & cross-check", () => {
  it("splits China demo video and Coupang link from a forwarded message", () => {
    const m = parseTelegramMessage("접이식 물병\nhttps://www.xiaohongshu.com/explore/abc\nhttps://link.coupang.com/a/xyz");
    expect(m.name).toBe("접이식 물병");
    expect(m.refVideoUrl).toBe("https://www.xiaohongshu.com/explore/abc");
    expect(m.affiliateUrl).toBe("https://link.coupang.com/a/xyz");
  });
  it("puts items without Coupang/Naver listing on the watchlist instead of discarding", () => {
    expect(crossCheck("")).toBe("watchlist");
    expect(crossCheck("https://naver.me/abc")).toBe("verified");
  });
  it("ranks items with a China demo video first", () => {
    const r = reviewSort([{ trendScore: 99 }, { trendScore: 10, refVideoUrl: "https://douyin.com/v/1" }]);
    expect(r[0]!.trendScore).toBe(10);
  });
});

describe("45-55s shorts format", () => {
  it("default cut plan totals 55 seconds", () => {
    expect(CUTS.reduce((a, c) => a + c.end - c.start, 0)).toBe(55);
  });
  it("rejects lengths outside 45-55s", () => {
    expect(isValidShortsLength(44)).toBe(false);
    expect(isValidShortsLength(45)).toBe(true);
    expect(isValidShortsLength(56)).toBe(false);
  });
});
