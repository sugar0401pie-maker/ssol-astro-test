// 테스트 화면 단계와 '이전' 버튼이 돌아갈 곳(순수 함수 — steps.test.ts).
export type Step = "welcome" | "experience" | "firstTime" | "birth" | "q1" | "q2" | "q3" | "loading" | "candidates" | "tie" | "consent" | "result";

/** 이전 화면. 없으면 null(첫 화면·계산 중·결과는 '이전'을 보이지 않는다). 생년월일 화면은 처음 안내를 거쳤으면 그리로 돌아간다. */
export function prevStep(step: Step, firstTime: boolean | null): Step | null {
  switch (step) {
    case "experience":
      return "welcome";
    case "firstTime":
      return "experience";
    case "birth":
      return firstTime ? "firstTime" : "experience";
    case "q1":
      return "birth";
    case "q2":
      return "q1";
    case "q3":
      return "q2";
    default:
      return null;
  }
}
