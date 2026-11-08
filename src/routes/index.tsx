import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CUTS,
  LEGAL_PRESETS,
  PLATFORMS,
  autoScanTrends,
  buildShortsPackage,
  canProceed,
  crossCheck,
  generateSrtContent,
  generateUploadMetadata,
  isValidShortsLength,
  parseTelegramMessage,
  reviewSort,
  seedProducts,
  totalDuration,
  type CutKey,
  type Platform,
  type Product,
  type Storyboard,
  type VariantId,
} from "@/lib/pipeline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shopping Shorts Command Center — 5단계 숏폼 제작" },
      { name: "description", content: "상품 선정부터 AI 대본, 클립 합성, 자막·법적문구까지 45~55초 쇼핑 숏폼을 단계별로 제작합니다." },
      { property: "og:title", content: "Shopping Shorts Command Center" },
      { property: "og:description", content: "텔레그램 소싱, 중국 레퍼런스 검토, AI 스토리보드, 클립 합성까지 한 곳에서." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const STEPS = ["1. 주제/상품 선정", "2. AI 기획", "3. 스토리보드 (45~55초)", "4. 클립 합성", "5. 자막·법적문구"] as const;
type ClipTool = "Meta AI" | "Vibes" | "Vidu";
interface ClipSlot { tool: ClipTool; src: string; dur: number }
interface Brief { usp: string; target: string; tone: string }
interface Finish { subtitle: string; legalId: string; legalPos: "top" | "bottom"; customLegal: string }
interface QueueItem { id: string; name: string; at: string; length: number }

const card = "rounded-xl border border-border bg-card p-5";
const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110`;
const btnGhost = `${btn} border border-border bg-secondary text-secondary-foreground hover:bg-muted`;
const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";
const h2 = "font-display text-lg font-bold";
const label = "block text-xs font-medium text-muted-foreground";

function Badge({ tone, children }: { tone: "ok" | "fail" | "idle" | "hot" | "warn"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-accent/15 text-accent border-accent/30",
    fail: "bg-destructive/15 text-destructive border-destructive/30",
    idle: "bg-muted text-muted-foreground border-border",
    hot: "bg-primary/15 text-primary border-primary/30",
    warn: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

const defaultClips = (): Record<CutKey, ClipSlot> =>
  Object.fromEntries(CUTS.map((c) => [c.key, { tool: "Meta AI", src: "", dur: c.end - c.start }])) as Record<CutKey, ClipSlot>;

function Index() {
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief>({ usp: "", target: "", tone: "도파민/자극형" });
  const [board, setBoard] = useState<Storyboard | null>(null);
  const [mix, setMix] = useState<Record<CutKey, VariantId>>({ hook: "A", problem: "B", solution: "A", proof: "C", cta: "C" });
  const [clips, setClips] = useState<Record<CutKey, ClipSlot>>(defaultClips);
  const [finish, setFinish] = useState<Finish>({ subtitle: "Bold yellow", legalId: "coupang", legalPos: "top", customLegal: "" });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("ssc-state-v2") || "null");
      if (s) { setProducts(s.products); setSelectedId(s.selectedId); setBrief(s.brief); setBoard(s.board); setMix(s.mix); setClips(s.clips); setFinish(s.finish); setQueue(s.queue); }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("ssc-state-v2", JSON.stringify({ products, selectedId, brief, board, mix, clips, finish, queue }));
  }, [loaded, products, selectedId, brief, board, mix, clips, finish, queue]);

  const selected = products.find((p) => p.id === selectedId && canProceed(p)) ?? null;
  const length = totalDuration(CUTS.map((c) => clips[c.key].dur));
  const done = [!!selected, !!board, !!board, CUTS.every((c) => clips[c.key].src), queue.length > 0];

  const editCut = (v: VariantId, k: CutKey, field: "script" | "imagePrompt", val: string) =>
    setBoard((b) => b && { ...b, variants: b.variants.map((x) => (x.id === v ? { ...x, cuts: { ...x.cuts, [k]: { ...x.cuts[k], [field]: val } } } : x)) });
  const finalCut = (k: CutKey) => board?.variants.find((v) => v.id === mix[k])?.cuts[k];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary font-display font-bold text-primary-foreground">S</div>
            <div>
              <h1 className="font-display text-base font-bold leading-tight">Shopping Shorts Command Center</h1>
              <p className="text-xs text-muted-foreground">{selected ? `제작 중: ${selected.name}` : "상품을 먼저 선택하세요"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-border px-2 py-1 text-xs text-muted-foreground sm:inline-block">
              로컬 진단: <code className="text-primary font-mono">npm run check:all</code>
            </span>
            <Badge tone={isValidShortsLength(length) ? "ok" : "fail"}>영상 길이 {length}초 / 기준 45~55초</Badge>
          </div>
        </div>
        <nav className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-4 pb-2">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)}
              className={`rounded-lg border px-2 py-2 text-left text-xs font-medium transition sm:text-sm ${step === i ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <span className={done[i] ? "text-accent" : ""}>{done[i] ? "✓ " : ""}</span>{s}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {step === 0 && <StepSourcing products={products} setProducts={setProducts} selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setBoard(null); setStep(1); }} />}
        {step === 1 && (!selected ? <NeedProduct /> :
          <StepBrief product={selected} brief={brief} setBrief={setBrief} board={board}
            onGenerated={(b) => { setBoard(b); setStep(2); }} />)}
        {step === 2 && (!board ? <NeedBoard /> :
          <StepStoryboard board={board} mix={mix} setMix={setMix} editCut={editCut} onNext={() => setStep(3)} />)}
        {step === 3 && (!board ? <NeedBoard /> :
          <StepStitch clips={clips} setClips={setClips} finalCut={finalCut} length={length} onNext={() => setStep(4)} />)}
        {step === 4 && (!selected || !board ? <NeedBoard /> :
          <StepFinish product={selected} finish={finish} setFinish={setFinish} finalCut={finalCut} hookLine={board.variants.find((v) => v.id === mix.hook)?.hookLine ?? ""}
            clipsReady={done[3]!} length={length} queue={queue} clips={clips}
            onApprove={() => setQueue((q) => [{ id: crypto.randomUUID(), name: selected.name, at: new Date().toLocaleString(), length }, ...q])} />)}
      </main>
    </div>
  );
}

function NeedProduct() {
  return <div className={`${card} text-center text-muted-foreground`}>1단계에서 쿠팡/네이버 링크가 확인된 상품을 먼저 선택하세요.</div>;
}
function NeedBoard() {
  return <div className={`${card} text-center text-muted-foreground`}>2단계에서 AI 기획(대본 생성)을 먼저 진행하세요.</div>;
}

/* ---------------- Step 1 ---------------- */
function StepSourcing({ products, setProducts, selectedId, onSelect }: {
  products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const [view, setView] = useState<"ready" | "watchlist" | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [tg, setTg] = useState("");
  const [scanNotice, setScanNotice] = useState<string>("");
  const [form, setForm] = useState({ name: "", platform: "Coupang" as Platform, price: "", url: "", ref: "" });

  const check = (ids?: string[]) =>
    setProducts((ps) => ps.map((p) => (!ids || ids.includes(p.id) ? { ...p, linkStatus: crossCheck(p.affiliateUrl) } : p)));

  const handleAutoScan = () => {
    const res = autoScanTrends(products);
    setProducts(res.updated);
    setScanNotice(`트렌드 수집 완료: 신규 인기 상품 +${res.addedCount}건 추가, 트렌드 점수 갱신 완료!`);
    setTimeout(() => setScanNotice(""), 4000);
  };

  const list = useMemo(() => {
    let filtered = products.filter((p) => {
      if (view === "ready") return p.linkStatus === "verified";
      if (view === "watchlist") return p.linkStatus === "watchlist";
      return true;
    });
    if (platformFilter !== "all") {
      filtered = filtered.filter((p) => p.platform === platformFilter);
    }
    return reviewSort(filtered);
  }, [products, view, platformFilter]);

  const count = (s: Product["linkStatus"]) => products.filter((p) => p.linkStatus === s).length;
  const pCount = (pf: string) => pf === "all" ? products.length : products.filter((p) => p.platform === pf).length;

  const addTelegram = () => {
    const blocks = tg.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    setProducts((ps) => [...ps, ...blocks.map((b) => {
      const m = parseTelegramMessage(b);
      return { id: crypto.randomUUID(), name: m.name, platform: (m.refVideoUrl ? "Xiaohongshu/Douyin" : "Coupang") as Platform, price: 0,
        trendScore: 60, affiliateUrl: m.affiliateUrl, refVideoUrl: m.refVideoUrl, source: "telegram" as const, linkStatus: crossCheck(m.affiliateUrl) };
    })]);
    setTg("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        {scanNotice && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs font-semibold text-accent animate-in fade-in">
            ⚡ {scanNotice}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {([["all", `전체 ${products.length}`], ["ready", `즉시 제작 ${count("verified")}`], ["watchlist", `보류함(링크 대기) ${count("watchlist")}`]] as const).map(([k, t]) => (
              <button key={k} onClick={() => setView(k)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${view === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className={btnGhost} onClick={handleAutoScan}>⚡ 트렌드 자동 수집 (Auto Scan)</button>
            <button className={btnPrimary} onClick={() => check()}>쿠팡/네이버 입점 전체 점검</button>
          </div>
        </div>

        {/* Platform filter tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border pb-2 text-xs">
          <span className="self-center text-muted-foreground mr-1">플랫폼:</span>
          {["all", ...PLATFORMS].map((pf) => (
            <button
              key={pf}
              onClick={() => setPlatformFilter(pf)}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                platformFilter === pf
                  ? "bg-secondary text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {pf === "all" ? "전체" : pf} ({pCount(pf)})
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">정렬: 중국(샤오홍슈·도우인) 시연 영상이 있는 상품 우선 → 트렌드 점수 순</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => {
            const wait = p.linkStatus === "watchlist";
            return (
              <div key={p.id} className={`${card} space-y-3 ${wait ? "opacity-60" : ""} ${selectedId === p.id ? "border-primary" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.platform}{p.price ? ` · ₩${p.price.toLocaleString()}` : ""}{p.source === "telegram" ? " · 텔레그램" : p.source === "trend" ? " · 트렌드 수집" : ""}</p>
                  </div>
                  <Badge tone="hot">🔥 {p.trendScore}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.refVideoUrl ? <Badge tone="ok">🎬 중국 시연영상 있음</Badge> : <Badge tone="idle">레퍼런스 영상 없음</Badge>}
                  {p.linkStatus === "verified" ? <Badge tone="ok">쿠팡/네이버 입점 ✓</Badge>
                    : wait ? <Badge tone="warn">보류 · 링크 올라오면 제작</Badge>
                    : <Badge tone="idle">미점검</Badge>}
                </div>
                {p.refVideoUrl && <a href={p.refVideoUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary underline">{p.refVideoUrl}</a>}
                {wait ? (
                  <div className="flex gap-2">
                    <input className={input} placeholder="쿠팡/네이버 링크 등록" onKeyDown={(e) => {
                      if (e.key === "Enter") { const v = e.currentTarget.value.trim(); setProducts((ps) => ps.map((x) => x.id === p.id ? { ...x, affiliateUrl: v, linkStatus: crossCheck(v) } : x)); }
                    }} />
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button className={btnGhost} onClick={() => check([p.id])}>입점 점검</button>
                    <button className={btnPrimary} disabled={!canProceed(p)} onClick={() => onSelect(p.id)}>이 상품으로 제작</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <aside className="space-y-4">
        <div className={`${card} space-y-3`}>
          <h2 className={h2}>📨 텔레그램 수집함</h2>
          <p className="text-xs text-muted-foreground">텔레그램으로 받은 메시지를 붙여넣으세요. 첫 줄 = 상품명, 링크는 자동 분류됩니다 (중국 영상 / 쿠팡·네이버). 빈 줄로 여러 건 구분.</p>
          <textarea rows={6} className={input} value={tg} onChange={(e) => setTg(e.target.value)}
            placeholder={"접이식 실리콘 물병\nhttps://www.xiaohongshu.com/explore/abc\nhttps://link.coupang.com/a/xyz"} />
          <button className={`${btnPrimary} w-full`} disabled={!tg.trim()} onClick={addTelegram}>검토 목록에 추가</button>
        </div>
        <div className={`${card} space-y-2`}>
          <h2 className={h2}>직접 추가</h2>
          <input className={input} placeholder="상품명" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input className={input} placeholder="가격 (₩)" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} />
          <input className={input} placeholder="중국 시연 영상 링크 (선택)" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} />
          <input className={input} placeholder="쿠팡/네이버 링크" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <button className={`${btnGhost} w-full`} disabled={!form.name.trim()} onClick={() => {
            setProducts((ps) => [...ps, { id: crypto.randomUUID(), name: form.name.trim(), platform: form.platform, price: Number(form.price) || 0, trendScore: 50,
              affiliateUrl: form.url.trim(), refVideoUrl: form.ref.trim(), source: "manual", linkStatus: crossCheck(form.url.trim()) }]);
            setForm({ name: "", platform: "Coupang", price: "", url: "", ref: "" });
          }}>추가</button>
        </div>
      </aside>
    </div>
  );
}

/* ---------------- Step 2 ---------------- */
function StepBrief({ product, brief, setBrief, board, onGenerated }: {
  product: Product; brief: Brief; setBrief: (b: Brief) => void; board: Storyboard | null; onGenerated: (b: Storyboard) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generate = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/generate-storyboard", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: product.name, price: product.price, platform: product.platform, ...brief }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "생성 실패");
      onGenerated(j as Storyboard);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className={`${card} space-y-4`}>
        <h2 className={h2}>상품 정보 & 핵심 판매 포인트</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div><p className={label}>상품명</p><p className="font-medium">{product.name}</p></div>
          <div><p className={label}>가격</p><p className="font-medium">₩{product.price.toLocaleString()}</p></div>
          <div><p className={label}>판매처</p><p className="font-medium">{product.platform}</p></div>
        </div>
        <label className={label}>핵심 판매 포인트 (USP)
          <textarea rows={4} className={`${input} mt-1`} value={brief.usp} onChange={(e) => setBrief({ ...brief, usp: e.target.value })}
            placeholder="예: 날개 없는 안전 구조, 12시간 배터리, 220g 초경량" /></label>
        <label className={label}>타깃 고객
          <input className={`${input} mt-1`} value={brief.target} onChange={(e) => setBrief({ ...brief, target: e.target.value })} placeholder="예: 출퇴근 직장인, 20~30대" /></label>
        <label className={label}>톤앤매너
          <select className={`${input} mt-1`} value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}>
            {["도파민/자극형", "진정성/리뷰형", "가성비/할인 강조형"].map((t) => <option key={t}>{t}</option>)}
          </select></label>
        {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        <button className={`${btnPrimary} w-full`} disabled={loading} onClick={generate}>
          {loading ? "AI가 후킹 문구·대본·이미지 프롬프트 작성 중… (30초~1분)" : board ? "다시 생성" : "AI로 3가지 버전 생성"}
        </button>
      </div>
      <aside className={`${card} space-y-2 text-sm`}>
        <h2 className={h2}>AI에 반영되는 기준</h2>
        {CUTS.map((c) => <p key={c.key}><span className="text-primary">{c.start}~{c.end}초</span> <b>{c.label}</b> — <span className="text-muted-foreground">{c.rule}</span></p>)}
        <p className="pt-2 text-xs text-muted-foreground">A 충격/후킹형 · B 일상 공감형 · C 가격/파격조건형</p>
      </aside>
    </div>
  );
}

/* ---------------- Step 3 ---------------- */
function StepStoryboard({ board, mix, setMix, editCut, onNext }: {
  board: Storyboard; mix: Record<CutKey, VariantId>; setMix: (m: Record<CutKey, VariantId>) => void;
  editCut: (v: VariantId, k: CutKey, f: "script" | "imagePrompt", val: string) => void; onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className={h2}>상품 설명</h2>
        <p className="mt-1 text-sm text-muted-foreground">{board.productDescription}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {board.variants.map((v) => (
          <div key={v.id} className={`${card} space-y-3`}>
            <div><p className="font-display font-bold">Variant {v.id}</p><p className="text-xs text-muted-foreground">{v.angle}</p></div>
            <p className="rounded-lg bg-primary/10 p-2 text-sm font-bold text-primary">“{v.hookLine}”</p>
            {CUTS.map((c) => (
              <div key={c.key} className={`space-y-1 rounded-lg border p-2 ${mix[c.key] === v.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{c.start}~{c.end}초 · {c.label}</span>
                  <button className="text-xs text-primary" onClick={() => setMix({ ...mix, [c.key]: v.id })}>{mix[c.key] === v.id ? "✓ 선택됨" : "이 컷 사용"}</button>
                </div>
                <textarea rows={3} className={`${input} text-sm`} value={v.cuts[c.key].script} onChange={(e) => editCut(v.id, c.key, "script", e.target.value)} />
                <details><summary className="cursor-pointer text-xs text-muted-foreground">이미지/영상 프롬프트</summary>
                  <textarea rows={3} className={`${input} mt-1 text-xs`} value={v.cuts[c.key].imagePrompt} onChange={(e) => editCut(v.id, c.key, "imagePrompt", e.target.value)} />
                </details>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-end"><button className={btnPrimary} onClick={onNext}>4단계: 클립 합성으로 →</button></div>
    </div>
  );
}

/* ---------------- Step 4 ---------------- */
function StepStitch({ clips, setClips, finalCut, length, onNext }: {
  clips: Record<CutKey, ClipSlot>; setClips: (c: Record<CutKey, ClipSlot>) => void;
  finalCut: (k: CutKey) => { script: string; imagePrompt: string } | undefined; length: number; onNext: () => void;
}) {
  const upd = (k: CutKey, c: Partial<ClipSlot>) => setClips({ ...clips, [k]: { ...clips[k], ...c } });
  const [cmdCopied, setCmdCopied] = useState(false);
  const cmd = `ffmpeg ${CUTS.map((c) => `-i cut_${c.key}.mp4`).join(" ")} -filter_complex "concat=n=${CUTS.length}:v=1:a=1" -s 1080x1920 merged.mp4`;
  return (
    <div className="space-y-5">
      <div className={`${card} flex flex-wrap items-center gap-2`}>
        <h2 className={`${h2} mr-auto`}>타임라인</h2>
        <div className="flex h-8 w-full overflow-hidden rounded-lg border border-border sm:w-[520px]">
          {CUTS.map((c) => (
            <div key={c.key} style={{ flex: clips[c.key].dur }} className={`grid place-items-center border-r border-border text-[10px] ${clips[c.key].src ? "bg-accent/20" : "bg-muted"}`}>
              {c.label} {clips[c.key].dur}s
            </div>
          ))}
        </div>
        <Badge tone={isValidShortsLength(length) ? "ok" : "fail"}>{length}초</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CUTS.map((c) => {
          const s = clips[c.key]; const f = finalCut(c.key);
          return (
            <div key={c.key} className={`${card} space-y-2`}>
              <div className="flex items-center justify-between"><p className="font-display font-bold">{c.label}</p>{s.src ? <Badge tone="ok">클립 선택됨</Badge> : <Badge tone="idle">대기</Badge>}</div>
              <p className="line-clamp-3 text-xs text-muted-foreground">{f?.script}</p>
              {f && <button className="text-xs text-primary" onClick={() => navigator.clipboard.writeText(f.imagePrompt)}>프롬프트 복사 (Meta AI / Vibes용)</button>}
              <div className="flex gap-2">
                <select className={input} value={s.tool} onChange={(e) => upd(c.key, { tool: e.target.value as ClipTool })}>
                  {(["Meta AI", "Vibes", "Vidu"] as const).map((t) => <option key={t}>{t}</option>)}
                </select>
                <input type="number" min={1} max={30} className={`${input} w-20`} value={s.dur} onChange={(e) => upd(c.key, { dur: Number(e.target.value) || 1 })} />
              </div>
              <input className={input} placeholder="생성된 영상 링크(mp4) 붙여넣기" value={s.src} onChange={(e) => upd(c.key, { src: e.target.value.trim() })} />
              {s.src && <video src={s.src} controls muted className="aspect-[9/16] w-full max-w-[140px] rounded-lg bg-muted" />}
            </div>
          );
        })}
      </div>
      <div className={`${card} space-y-2`}>
        <h2 className={h2}>합치기 명령 (Mac 작업 PC용)</h2>
        <code className="block overflow-x-auto rounded-lg bg-muted p-2 text-xs text-muted-foreground">{cmd}</code>
        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={() => { navigator.clipboard.writeText(cmd); setCmdCopied(true); }}>{cmdCopied ? "복사됨" : "명령 복사"}</button>
          <button className={btnPrimary} onClick={onNext}>5단계: 자막·법적문구 →</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 5 ---------------- */
function StepFinish({ product, finish, setFinish, finalCut, hookLine, clipsReady, length, queue, clips, onApprove }: {
  product: Product; finish: Finish; setFinish: (f: Finish) => void; finalCut: (k: CutKey) => { script: string; imagePrompt?: string } | undefined;
  hookLine: string; clipsReady: boolean; length: number; queue: QueueItem[];
  clips: Record<CutKey, ClipSlot>; onApprove: () => void;
}) {
  const [t, setT] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => { const id = setInterval(() => setT((x) => (x >= length ? 0 : x + 1)), 1000); return () => clearInterval(id); }, [length]);
  const legal = finish.legalId === "custom" ? finish.customLegal : LEGAL_PRESETS.find((l) => l.id === finish.legalId)?.text ?? "";
  let acc = 0; const cur = CUTS.find((c) => { acc += c.end - c.start; return t < acc; }) ?? CUTS[CUTS.length - 1]!;
  const subCls = { "Bold yellow": "text-chart-3 font-black", "White outline": "text-foreground font-bold", Minimal: "text-foreground font-medium text-sm" }[finish.subtitle];
  const checks = [
    { l: "쿠팡/네이버 링크 확인", ok: canProceed(product) },
    { l: "5개 컷 클립 모두 선택", ok: clipsReady },
    { l: "길이 45~55초", ok: isValidShortsLength(length) },
    { l: "법적 고지 문구", ok: !!legal.trim() },
  ];

  const uploadMeta = useMemo(() => generateUploadMetadata(product, hookLine, legal), [product, hookLine, legal]);

  const copyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadJsonPackage = () => {
    const pkg = buildShortsPackage({
      product,
      hookLine,
      legalNotice: legal,
      clips,
      finalCut,
    });
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shorts-package-${product.id || "product"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSrt = () => {
    const srt = generateSrtContent(CUTS, clips, (k) => finalCut(k)?.script ?? "");
    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles-${product.id || "product"}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted to-background">
          {finish.legalPos === "top" && legal && <div className="bg-background/85 px-3 py-1.5 text-center text-[10px] text-muted-foreground">{legal}</div>}
          {cur.key === "hook" && <div className="absolute inset-x-3 top-12 text-center font-display text-xl font-black text-primary">{hookLine}</div>}
          <div className={`absolute inset-x-3 bottom-24 text-center font-display ${subCls}`}>{finalCut(cur.key)?.script}</div>
          <div className="absolute inset-x-3 bottom-3 space-y-1">
            {finish.legalPos === "bottom" && legal && <p className="rounded bg-background/85 px-2 py-1 text-center text-[9px] text-muted-foreground">{legal}</p>}
            <div className="flex items-center justify-between rounded-xl bg-background/85 p-2">
              <div><p className="text-[10px] text-muted-foreground">{product.name}</p><p className="font-display font-bold">₩{product.price.toLocaleString()}</p></div>
              <span className="rounded-lg bg-gradient-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground">프로필 링크</span>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">0:{String(t).padStart(2, "0")} / 0:{length} · {cur.label}</p>
      </div>
      <div className="space-y-4">
        <div className={`${card} grid gap-3 sm:grid-cols-2`}>
          <label className={label}>자막 스타일
            <select className={`${input} mt-1`} value={finish.subtitle} onChange={(e) => setFinish({ ...finish, subtitle: e.target.value })}>
              {["Bold yellow", "White outline", "Minimal"].map((o) => <option key={o}>{o}</option>)}
            </select></label>
          <label className={label}>법적 문구 위치
            <select className={`${input} mt-1`} value={finish.legalPos} onChange={(e) => setFinish({ ...finish, legalPos: e.target.value as "top" | "bottom" })}>
              <option value="top">상단 고정 배너</option><option value="bottom">하단 자막 바</option>
            </select></label>
          <div className="sm:col-span-2 space-y-1.5">
            <p className={label}>법적 고지 프리셋</p>
            {[...LEGAL_PRESETS, { id: "custom", text: "직접 입력" }].map((l) => (
              <label key={l.id} className="flex items-start gap-2 text-sm">
                <input type="radio" checked={finish.legalId === l.id} onChange={() => setFinish({ ...finish, legalId: l.id })} className="mt-1" />{l.text}
              </label>
            ))}
            {finish.legalId === "custom" && <input className={input} value={finish.customLegal} onChange={(e) => setFinish({ ...finish, customLegal: e.target.value })} placeholder="고지 문구 입력" />}
          </div>
        </div>

        {/* Upload Metadata Panel */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className={h2}>📋 업로드 메타데이터 (YouTube/Instagram)</h2>
            <button className={btnGhost} onClick={() => copyText("all", `${uploadMeta.title}\n\n${uploadMeta.hashtags.join(" ")}\n\n${uploadMeta.pinnedComment}`)}>
              {copiedKey === "all" ? "복사 완료" : "전체 복사"}
            </button>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>쇼츠 제목</span>
              <button className="text-primary hover:underline" onClick={() => copyText("title", uploadMeta.title)}>
                {copiedKey === "title" ? "복사됨" : "제목 복사"}
              </button>
            </div>
            <input className={input} readOnly value={uploadMeta.title} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>해시태그</span>
              <button className="text-primary hover:underline" onClick={() => copyText("tags", uploadMeta.hashtags.join(" "))}>
                {copiedKey === "tags" ? "복사됨" : "태그 복사"}
              </button>
            </div>
            <input className={input} readOnly value={uploadMeta.hashtags.join(" ")} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>고정 댓글 (제휴 링크 + 법적 고지 문구 자동 연동)</span>
              <button className="text-primary hover:underline" onClick={() => copyText("comment", uploadMeta.pinnedComment)}>
                {copiedKey === "comment" ? "복사됨" : "고정 댓글 복사"}
              </button>
            </div>
            <textarea className={input} rows={3} readOnly value={uploadMeta.pinnedComment} />
          </div>
        </div>

        {/* Local Exports Panel */}
        <div className={`${card} space-y-3`}>
          <h2 className={h2}>📦 로컬 연동 패키지 & 자막 내보내기</h2>
          <p className="text-xs text-muted-foreground">
            로컬 FFmpeg 영상 합성 프로그램 및 영상 편집 툴(프리미어/캡컷)에 전달할 패키지를 다운로드합니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={downloadJsonPackage}>
              📦 로컬 작업용 JSON 다운로드 <span className="text-xs text-muted-foreground">.json</span>
            </button>
            <button className={btnGhost} onClick={downloadSrt}>
              📝 표준 자막 파일 다운로드 <span className="text-xs text-muted-foreground">.srt</span>
            </button>
          </div>
        </div>

        <div className={`${card} space-y-2`}>
          <h2 className={h2}>최종 점검</h2>
          {checks.map((c) => <div key={c.l} className="flex justify-between text-sm">{c.l}<Badge tone={c.ok ? "ok" : "fail"}>{c.ok ? "OK" : "확인 필요"}</Badge></div>)}
          <button className={`${btnPrimary} w-full`} disabled={!checks.every((c) => c.ok)} onClick={onApprove}>최종 승인 · 업로드 대기열 등록</button>
        </div>
        <div className={`${card} space-y-2`}>
          <h2 className={h2}>업로드 대기열</h2>
          {queue.length === 0 ? <p className="text-sm text-muted-foreground">아직 없음</p> : queue.map((q) => (
            <div key={q.id} className="flex justify-between rounded-lg bg-muted p-2 text-sm"><span>{q.name} · {q.length}초</span><span className="text-xs text-muted-foreground">{q.at}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
