# Shopping Shorts Command Center

A dark-mode dashboard covering all 7 modules from your brief, running on realistic sample data (no real platform connections yet).

## Layout
- Top bar: app name, pipeline status badges (Sourced / Verified / Scripted / Assets / Approved).
- Tab navigation: **Sourcing**, **Variant Studio**, **Asset Pipeline**, **Final Review**.
- Shared selected-product state flows across tabs.

## Tabs
1. **Sourcing** — platform filter chips (Naver, YouTube, Coupang, Instagram, Xiaohongshu/Douyin), "Auto Scan Trends" that lists candidates, manual add form. Product cards with trend score, price, source.
   - **Match-Fail panel**: "Verify Link" per item and bulk; calls a mock `/api/verify-link` server route. Failed items are grayed out with a "Match-Fail" badge and cannot proceed.
2. **Variant Studio** — 4-stage timeline guide (0-3s Hook, 3-7s Problem, 7-12s Solution & Benefit, 12-15s CTA + profile link). "Generate 3 Variants" produces A (Hook), B (Empathy), C (Deal/Price) as template-based scripts; a mix & match combiner lets you pick each stage from any variant into a final script.
3. **Asset Pipeline** — Meta AI / Google Flow / Vidu prompt sets per clip with locked @reviewer and @product tags (copy buttons). Clip 1-4 tracker: status, source URL field with a dev-tools src extraction guide. Mac M4 Factory Bridge: MoviePy/FFmpeg parameters (resolution, fps, transitions), subtitle style, and a live 9:16 frame preview with top disclosure banner, bottom price tag and SHOP NOW button.
4. **Final Review** — checklist plus "Open Final Preview" modal: 9:16 player mock (45s), editable title, hashtags, pinned comment template with affiliate link, and "Final Approval & Queue for Upload" which moves the item into an upload queue list.

## Design
Deep charcoal background, electric coral accent with mint for success states, Space Grotesk + DM Sans fonts, compact cards and status badges, responsive down to mobile.

## Technical notes
- Single route at `/`, tabs as components; state via a small React context, persisted to localStorage.
- Mock server route `src/routes/api/verify-link.ts` (deterministic pass/fail).
- Script variants generated from templates (AI generation can be added later via Lovable AI).
- Tests for the Match-Fail rule (failed items blocked from pipeline).
