import type { CutKey, Storyboard, VariantId } from "./pipeline";

interface GenerateStoryboardInput {
  name: string;
  price: number;
  platform: string;
  usp?: string;
  target?: string;
  tone?: string;
}

/**
 * AI API(OpenAI/Lovable) 키가 없거나 호출에 실패했을 때 사용하는 오프라인 숏폼 대본 생성기.
 * 입력된 상품명, USP, 타깃, 톤을 반영하여 45~55초 규격의 3가지 버전(A, B, C)을 생성합니다.
 */
export function generateMockStoryboard(input: GenerateStoryboardInput): Storyboard {
  const name = input.name.trim() || "추천 상품";
  const price = input.price ? `${input.price.toLocaleString("ko-KR")}원` : "특별 할인가";
  const target = input.target?.trim() || "스마트 쇼퍼";
  const usp = input.usp?.trim() || "뛰어난 가성비와 실용적인 기능";
  const platform = input.platform || "쇼핑몰";

  return {
    productDescription: `${name}은(는) ${target}을(를) 위한 실용적인 아이템입니다. ${usp} 특징을 바탕으로 일상의 편리함을 극대화하며, 현재 ${platform}에서 ${price}에 만나보실 수 있습니다.`,
    variants: [
      {
        id: "A",
        angle: "충격/후킹형 — 도파민 폭발 호기심 자극",
        hookLine: `아직도 이거 없이 사세요? ${name} 몰랐을 때로 절대 못 돌아갑니다.`,
        cuts: {
          hook: {
            script: `아직도 이거 없이 사세요? SNS 품절 대란템 ${name}, 직접 써보고 충격받았습니다.`,
            imagePrompt: `@reviewer holds @product (${name}) in extreme close-up, dramatic lighting, vertical 9:16, shocked facial expression, viral TikTok UGC aesthetic.`,
          },
          problem: {
            script: `매일 똑같은 불편함 참으면서 스트레스 받으셨죠? 다들 쓰는 방법은 번거롭고 쉽게 망가집니다.`,
            imagePrompt: `@reviewer looking frustrated with ordinary cheap alternatives, split screen comparison, realistic indoor lighting, vertical 9:16.`,
          },
          solution: {
            script: `그럴 땐 바로 이겁니다. ${usp}! 손에 쥐는 순간 왜 난리 났는지 바로 이해되실 거예요.`,
            imagePrompt: `@reviewer demonstrating @product (${name}) solving the problem effortlessly, dynamic movement, fast cut, crisp focus, vertical 9:16.`,
          },
          proof: {
            script: `벌써 누적 리뷰 수천 개 돌파했고, 평점 4.9점 기록 중입니다. 이 퀄리티에 ${price}이라니 남는 게 있나 싶어요.`,
            imagePrompt: `Close-up macro shot of @product (${name}) build quality and texture, side-by-side happy user reactions, vertical 9:16.`,
          },
          cta: {
            script: `재고 풀릴 때마다 바로 품절되니까 지금 프로필 링크에서 최저가 확인해 보세요!`,
            imagePrompt: `@reviewer pointing directly towards profile bio link arrow, smiling, high energy, vertical 9:16, clear CTA frame.`,
          },
        },
      },
      {
        id: "B",
        angle: "일상 공감형 — 일상 속 현실적인 고민 해결",
        hookLine: `하루 종일 스트레스였는데… 이거 하나로 삶의 질 수직 상승했습니다.`,
        cuts: {
          hook: {
            script: `하루 종일 이것 때문에 불편하셨던 분들 계시죠? 딱 30초만 집중해 보세요.`,
            imagePrompt: `@reviewer looking relatable and talking casually to camera, warm cozy room ambience, natural light, vertical 9:16.`,
          },
          problem: {
            script: `특히 ${target} 분들이라면 출퇴근이나 일상에서 매번 겪는 귀찮은 일이었을 텐데요.`,
            imagePrompt: `POV shot showing everyday struggle related to ${target}, realistic lifestyle UGC setting, vertical 9:16.`,
          },
          solution: {
            script: `제가 일주일 동안 내돈내산으로 써본 ${name}! ${usp} 덕분에 정말 편해졌습니다.`,
            imagePrompt: `@reviewer naturally using @product (${name}) in daily routine, relaxed smile, smooth handheld camera, vertical 9:16.`,
          },
          proof: {
            script: `진작 살 걸 후회할 정도로 삶의 질이 달라졌어요. 친구들한테도 벌써 세 명이나 추천했습니다.`,
            imagePrompt: `Detailed look at @product (${name}) in clean aesthetic setup, authentic review proof vibe, vertical 9:16.`,
          },
          cta: {
            script: `제가 직접 구매했던 공식 할인 좌표는 프로필 링크에 남겨둘게요. 천천히 구경해 보세요.`,
            imagePrompt: `@reviewer waving softly with friendly gesture pointing to profile link, warm aesthetic outro, vertical 9:16.`,
          },
        },
      },
      {
        id: "C",
        angle: "가격/파격조건형 — 가성비 및 깜짝 혜택 강조",
        hookLine: `이 스펙에 ${price}? 다른 비싼 제품 살 필요 전혀 없습니다.`,
        cuts: {
          hook: {
            script: `잠깐만요! ${price}에 이 퀄리티가 말이 되나요? 가성비 끝판왕 찾았습니다.`,
            imagePrompt: `Big bold price tag overlay next to sleek @product (${name}), high contrast commercial lighting, vertical 9:16.`,
          },
          problem: {
            script: `비슷한 기능 가진 브랜드 제품들은 2~3배 넘게 받는데, 기능은 솔직히 다를 게 없었거든요.`,
            imagePrompt: `@reviewer comparing expensive bulky alternatives against sleek @product (${name}), vertical 9:16.`,
          },
          solution: {
            script: `하지만 ${name}은(는) 거품 싹 빼고 ${usp} 핵심 기능만 제대로 담았습니다.`,
            imagePrompt: `Highlighting key features of @product (${name}) with close-up product beauty shots, smooth turn table spin, vertical 9:16.`,
          },
          proof: {
            script: `내구성 테스트도 완료했고 실구매자 만족도도 압도적입니다. 돈 아끼는 지름길이에요.`,
            imagePrompt: `Hands-on stress test and durability demonstration of @product (${name}), convincing UGC proof, vertical 9:16.`,
          },
          cta: {
            script: `특가 행사 끝나기 전에 지금 프로필 링크 눌러서 수량 확보해 두세요!`,
            imagePrompt: `@reviewer holding up phone showing cart countdown timer, urgent energetic gesture, vertical 9:16.`,
          },
        },
      },
    ],
  };
}
