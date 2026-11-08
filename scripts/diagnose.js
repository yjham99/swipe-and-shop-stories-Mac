#!/usr/bin/env node

/**
 * Shopping Shorts Command Center - 로컬 기능별 환경 진단 스크립트
 * 사용법: npm run check:all  또는  node scripts/diagnose.js
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function pass(title, detail = "") {
  console.log(`${colors.green}  ✔ [PASS]${colors.reset} ${colors.bold}${title}${colors.reset} ${colors.dim}${detail}${colors.reset}`);
}

function warn(title, detail = "", guide = "") {
  console.log(`${colors.yellow}  ▲ [WARN]${colors.reset} ${colors.bold}${title}${colors.reset} ${colors.dim}${detail}${colors.reset}`);
  if (guide) console.log(`     ${colors.cyan}↳ 가이드: ${guide}${colors.reset}`);
}

function fail(title, detail = "", guide = "") {
  console.log(`${colors.red}  ✖ [FAIL]${colors.reset} ${colors.bold}${title}${colors.reset} ${colors.dim}${detail}${colors.reset}`);
  if (guide) console.log(`     ${colors.cyan}↳ 해결법: ${guide}${colors.reset}`);
}

console.log(`\n${colors.bold}${colors.cyan}====================================================`);
console.log(` 🩺 Shopping Shorts Command Center — 로컬 셀프 진단`);
console.log(`====================================================${colors.reset}\n`);

const results = { passed: 0, warned: 0, failed: 0 };

// 1. .env 및 환경 변수 진단
console.log(`${colors.bold}1. 환경 변수 (.env) 진단${colors.reset}`);
const envPath = path.join(rootDir, ".env");
let envVars = {};

if (fs.existsSync(envPath)) {
  pass(".env 파일 확인", `(${envPath})`);
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      envVars[key] = val;
    }
  }
} else {
  warn(".env 파일 없음", "오프라인/Mock 대본 생성 모드로 동작합니다.", "필요시 .env.example을 복사하여 .env 생성 (cp .env.example .env)");
  results.warned++;
}

const openAiKey = envVars["OPENAI_API_KEY"] || process.env.OPENAI_API_KEY;
const lovableKey = envVars["LOVABLE_API_KEY"] || process.env.LOVABLE_API_KEY;

if (lovableKey && lovableKey.trim()) {
  pass("Lovable AI Gateway 키 감지됨", `(길이: ${lovableKey.length})`);
  results.passed++;
} else if (openAiKey && openAiKey.trim()) {
  if (openAiKey.startsWith("sk-")) {
    pass("OpenAI API 키 형식 정상", `(sk-...${openAiKey.slice(-4)})`);
    results.passed++;
  } else {
    warn("OpenAI API 키 형식 비표준", `현재 값: ${openAiKey.slice(0, 5)}...`, "sk-로 시작하는 키인지 확인하세요.");
    results.warned++;
  }
} else {
  warn("AI API 키 미설정", "OpenAI/Lovable 키 없음 -> 내장 Mock 대본 생성기가 자동 활성화됩니다.");
  results.warned++;
}

// 2. 도메인 및 파이프라인 로직 진단
console.log(`\n${colors.bold}2. 핵심 도메인 파이프라인 무결성 진단${colors.reset}`);
try {
  const {
    verifyAffiliateLink,
    crossCheck,
    parseTelegramMessage,
    isValidShortsLength,
    autoScanTrends,
    formatSrtTimestamp,
    generateUploadMetadata,
  } = await import("../src/lib/pipeline.ts");

  // 제휴 링크 검증
  const cpOk = verifyAffiliateLink("https://link.coupang.com/a/test");
  const nvOk = verifyAffiliateLink("https://naver.me/abc");
  const badOk = verifyAffiliateLink("https://example.com/bad");

  if (cpOk && nvOk && !badOk) {
    pass("제휴 링크 Match-Fail 검증 로직 정상", "(쿠팡/네이버 링크 판별 성공)");
    results.passed++;
  } else {
    fail("제휴 링크 검증 로직 이상", `cp=${cpOk}, nv=${nvOk}, bad=${badOk}`);
    results.failed++;
  }

  // 텔레그램 수집 파싱
  const parsedTg = parseTelegramMessage("실리콘 물병\nhttps://www.xiaohongshu.com/explore/123\nhttps://link.coupang.com/a/xyz");
  if (parsedTg.name === "실리콘 물병" && parsedTg.refVideoUrl.includes("xiaohongshu") && parsedTg.affiliateUrl.includes("coupang")) {
    pass("텔레그램 메시지 자동 파싱 정상", "(중국 레퍼런스 + 쿠팡 분리)");
    results.passed++;
  } else {
    fail("텔레그램 파싱 이상", JSON.stringify(parsedTg));
    results.failed++;
  }

  // 트렌드 자동 수집
  const scanRes = autoScanTrends([]);
  if (scanRes.addedCount > 0 && scanRes.updated.length > 0) {
    pass("Auto Scan 트렌드 수집 엔진 정상", `(${scanRes.addedCount}개 아이템 수집 완료)`);
    results.passed++;
  } else {
    fail("Auto Scan 로직 이상", "신규 트렌드 상품을 추가하지 못했습니다.");
    results.failed++;
  }

  // SRT 타임스탬프
  const srtTime = formatSrtTimestamp(65.5);
  if (srtTime === "00:01:05,500") {
    pass("SRT 자막 타임스탬프 계산 정상", `(65.5s -> ${srtTime})`);
    results.passed++;
  } else {
    fail("SRT 타임스탬프 포맷 오류", `기대값 00:01:05,500, 결과값: ${srtTime}`);
    results.failed++;
  }

  // 메타데이터 생성
  const meta = generateUploadMetadata({ name: "무선 청소기", platform: "Coupang", affiliateUrl: "https://link.coupang.com/a/clean" }, "대박", "법적고지");
  if (meta.title.includes("무선 청소기") && meta.pinnedComment.includes("https://link.coupang.com/a/clean")) {
    pass("업로드 메타데이터/고정댓글 자동 생성 정상");
    results.passed++;
  } else {
    fail("메타데이터 생성 이상", JSON.stringify(meta));
    results.failed++;
  }
} catch (e) {
  fail("파이프라인 모듈 로드 실패", e.message);
  results.failed++;
}

// 3. 로컬 비디오 렌더링 도구 (FFmpeg) 진단
console.log(`\n${colors.bold}3. 로컬 비디오 합성 도구 (FFmpeg) 진단${colors.reset}`);
try {
  const ffmpegVer = execSync("ffmpeg -version", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" }).split("\n")[0];
  pass("FFmpeg 설치 확인됨", `(${ffmpegVer.slice(0, 30)}...)`);
  results.passed++;
} catch {
  warn("FFmpeg 미설치 또는 PATH 미등록", "Step 4 클립 합성 자동 실행 시 FFmpeg가 필요합니다.", "Mac 터미널에서 'brew install ffmpeg' 실행 권장");
  results.warned++;
}

// 4. 단위 테스트 실행 진단
console.log(`\n${colors.bold}4. Vitest 자동 테스트 검증${colors.reset}`);
try {
  execSync("npm test", { cwd: rootDir, stdio: "pipe", encoding: "utf-8" });
  pass("모든 단위 테스트 통과 (vitest)", "(pipeline & routing test ok)");
  results.passed++;
} catch (e) {
  fail("단위 테스트 실패", "npm test 를 실행하여 실패 내역을 확인하세요.");
  results.failed++;
}

// 종합 결과
console.log(`\n${colors.bold}====================================================${colors.reset}`);
console.log(`진단 완료: ${colors.green}성공 ${results.passed}건${colors.reset} / ${colors.yellow}주의/경고 ${results.warned}건${colors.reset} / ${colors.red}실패 ${results.failed}건${colors.reset}`);

if (results.failed === 0) {
  console.log(`${colors.green}${colors.bold}🎉 로컬 환경에서 쇼핑 숏폼 커맨드 센터를 실행하기에 완벽한 상태입니다!${colors.reset}`);
  console.log(`실행 명령: ${colors.cyan}npm run dev${colors.reset} (기본 브라우저: http://localhost:8080 또는 :3000)\n`);
} else {
  console.log(`${colors.red}${colors.bold}⚠️ 일부 항목에 실패가 발생했습니다. 위의 가이드라인을 확인해 주세요.${colors.reset}\n`);
}

process.exit(results.failed > 0 ? 1 : 0);
