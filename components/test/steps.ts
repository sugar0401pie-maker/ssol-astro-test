// 테스트 화면 단계와 '이전' 버튼이 돌아갈 곳(순수 함수 — steps.test.ts).
// 2026-10-10 owner 결정: 질문 3개는 프로토타입처럼 한 화면(questions), 동점 선택은 결과 2번 섹션 안으로(별도 화면 없음).
export type Step = "welcome" | "experience" | "firstTime" | "birth" | "questions" | "loading" | "candidates" | "consent" | "result";

/** 이전 화면. 없으면 null(첫 화면·계산 중·결과는 '이전'을 보이지 않는다). 생년월일 화면은 처음 안내를 거쳤으면 그리로 돌아간다. */
export function prevStep(step: Step, firstTime: boolean | null): Step | null {
  switch (step) {
    case "experience":
      return "welcome";
    case "firstTime":
      return "experience";
    case "birth":
      return firstTime ? "firstTime" : "experience";
    case "questions":
      return "birth";
    default:
      return null;
  }
}

// ---- 화면마다 주소(owner 2026-10-09: "테스트 각각 별도 페이지로 만들어서 뒤로 갈 수 있도록") ----
// 계산 중(loading)·저장 재시도(consent)는 주소를 바꾸지 않는다 — 뒤로 가기로 그 화면에 다시 들어가지 않게.

const SLUG: Partial<Record<Step, string>> = {
  welcome: "",
  experience: "experience",
  firstTime: "intro",
  birth: "birth",
  questions: "questions",
  candidates: "type",
  result: "result",
};

/** 주소가 있는 화면인가 */
export function isPage(step: Step): boolean {
  return step in SLUG;
}

export function pathOf(step: Step): string {
  const s = SLUG[step];
  return s ? `/test/${s}` : "/test";
}

/** 주소 → 화면. 모르는 주소면 null */
export function stepFromPath(pathname: string): Step | null {
  const slug = pathname.replace(/\/+$/, "").replace(/^\/test\/?/, "");
  if (pathname.replace(/\/+$/, "") === "/test") return "welcome";
  const hit = (Object.entries(SLUG) as Array<[Step, string]>).find(([, v]) => v && v === slug);
  return hit ? hit[0] : null;
}

/** 새로고침했을 때 이어 갈 수 있는 진행 상태(이 탭의 sessionStorage) */
export interface Progress {
  nickname: string;
  firstTime: boolean | null;
  consented: boolean;
  answers: { q1?: string; q2?: string; q3?: string };
  /** 결과를 저장했으면 그 id — 결과 화면을 새로고침하면 저장된 결과로 보낸다 */
  savedId?: string | null;
}

/**
 * 새로고침한 주소의 화면을 그대로 보여 줘도 되는지 — 앞 화면의 답이 없으면 답이 있는 가장 뒤 화면으로 되돌린다.
 * 후보·결과는 계산 결과가 메모리에만 있어 다시 그릴 수 없으므로 질문 화면으로(저장된 결과가 있으면 그쪽은 화면에서 처리).
 */
export function restorableStep(requested: Step, p: Progress | null): Step {
  if (!p) return "welcome";
  const ok = (s: Step): boolean => {
    switch (s) {
      case "welcome":
        return true;
      case "experience":
        return !!p.nickname.trim();
      case "firstTime":
        return ok("experience") && p.firstTime === true;
      case "birth":
        return ok("experience") && p.firstTime !== null;
      case "questions":
        return ok("birth") && p.consented;
      default:
        return false;
    }
  };
  const want = requested === "candidates" || requested === "result" ? "questions" : requested;
  // 요청한 화면에서 '이전' 방향으로 거슬러 올라가며 처음 보여 줄 수 있는 화면
  let s: Step | null = want;
  while (s && !ok(s)) s = s === "firstTime" ? "experience" : prevStep(s, p.firstTime);
  return s ?? "welcome";
}
