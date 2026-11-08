import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { generateMockStoryboard } from "@/lib/mock-storyboard";

const cut = z.object({ script: z.string(), imagePrompt: z.string() });
const schema = z.object({
  productDescription: z.string(),
  variants: z.array(
    z.object({
      id: z.enum(["A", "B", "C"]),
      angle: z.string(),
      hookLine: z.string(),
      cuts: z.object({ hook: cut, problem: cut, solution: cut, proof: cut, cta: cut }),
    }),
  ),
});

const Input = z.object({
  name: z.string().min(1).max(120),
  price: z.number().min(0).max(100_000_000),
  platform: z.string().max(40),
  usp: z.string().max(1500).optional().default(""),
  target: z.string().max(300).optional().default(""),
  tone: z.string().max(60).optional().default("도파민/자극형"),
  fallbackMode: z.boolean().optional().default(true),
});

const INSTRUCTIONS = `당신은 한국 쇼핑 숏폼(유튜브 쇼츠/릴스/틱톡) 전문 카피라이터입니다.
반드시 45~55초 세로형 숏폼 양식을 따릅니다:
- hook (0-3초): 스크롤을 멈추게 하는 한 문장, 강한 비주얼
- problem (3-15초): 시청자가 매일 겪는 불편함 공감
- solution (15-35초): 제품 시연, 비포/애프터, 핵심 기능 1~2개
- proof (35-50초): 실사용 만족, 가성비, 디테일 근거
- cta (50-55초): 프로필 링크 안내 + 긴박감
3가지 버전을 만듭니다: A = 충격/후킹형, B = 일상 공감형, C = 가격/파격조건형.
대본은 자연스러운 한국어 구어체, 과장 광고·허위 효능 표현 금지.
imagePrompt는 영어로, 9:16 세로, @reviewer와 @product 태그를 사용해 Meta AI/Vibes 영상 생성에 바로 쓸 수 있게 작성.
productDescription은 상품 상세 설명 3~4문장(한국어).`;

export const Route = createFileRoute("/api/generate-storyboard")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Input.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "입력값을 확인해 주세요." }, { status: 400 });

        const d = parsed.data;
        const apiKey = process.env["LOVABLE_API_KEY"] || process.env["OPENAI_API_KEY"];

        // API 키가 없거나 더미 키인 경우 또는 개발 모드일 때 자동 Mock 폴백
        if (!apiKey || apiKey === "sk-dummy-test" || apiKey.trim() === "") {
          console.info("[Storyboard API] No valid AI API key found. Using high-quality offline storyboard generator.");
          const mockBoard = generateMockStoryboard(d);
          return Response.json(mockBoard);
        }

        const isLovableGateway = apiKey.startsWith("lovable_") || (apiKey.length > 50 && !apiKey.startsWith("sk-"));
        const baseURL = isLovableGateway ? "https://ai.gateway.lovable.dev/v1" : "https://api.openai.com/v1";
        const modelName = isLovableGateway ? "openai/gpt-6-astra" : "gpt-4o-mini";

        const provider = createOpenAI({
          baseURL,
          apiKey,
          headers: isLovableGateway ? { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } : undefined,
        });

        try {
          const result = streamText({
            model: isLovableGateway ? provider.responses(modelName) : provider(modelName),
            instructions: INSTRUCTIONS,
            output: Output.object({ schema }),
            messages: [{
              role: "user",
              content: `상품명: ${d.name}\n가격: ${d.price}원\n판매처: ${d.platform}\n핵심 판매 포인트: ${d.usp || "(없음)"}\n타깃: ${d.target || "(일반)"}\n톤: ${d.tone}`,
            }],
            abortSignal: request.signal,
            maxRetries: 0,
            providerOptions: isLovableGateway ? { openai: { store: false, forceReasoning: true, reasoningEffort: "low" } } : undefined,
          });
          const output = await result.output;
          return Response.json(output);
        } catch (e) {
          console.warn("[Storyboard API] AI generation failed, falling back to mock storyboard generator:", e);
          // AI 요청 실패(인증 실패, 한도 초과 등) 시 작업이 끊기지 않도록 폴백 생성기 실행
          const fallbackBoard = generateMockStoryboard(d);
          return Response.json(fallbackBoard);
        }
      },
    },
  },
});
