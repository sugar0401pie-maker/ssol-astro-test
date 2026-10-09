// 이벤트를 사람이 읽는 이름으로(근거 한 줄·AI 입력 라벨). 숫자는 하우스 번호만 붙는다 —
// AI 입력에서는 라벨이 '입력 데이터'일 뿐이고 AI가 문장에 쓰는 숫자는 토큰으로만 들어간다.
import type { PointKey } from "../astro/constants.ts";
import type { TimelineEvent } from "../astro/timeline.ts";

export const POINT_KO: Record<PointKey, string> = {
  sun: "태양", moon: "달", mercury: "수성", venus: "금성", mars: "화성", jupiter: "목성",
  saturn: "토성", uranus: "천왕성", neptune: "해왕성", pluto: "명왕성", asc: "상승궁", mc: "천정",
};

const ECLIPSE_KO: Record<string, string> = {
  total: "개기", annular: "금환", partial: "부분", penumbral: "반영",
};

const MILESTONE_KO = {
  saturn_return: "토성 리턴",
  jupiter_return: "목성 리턴",
  uranus_opposition: "천왕성 충(나이 마일스톤)",
  neptune_square: "해왕성 사각(나이 마일스톤)",
} as const;

const h = (house: number | null) => (house === null ? "" : `(${house}H)`);

export function eventLabel(e: TimelineEvent): string {
  switch (e.kind) {
    case "transit":
      if (e.milestone) return MILESTONE_KO[e.milestone];
      return `${POINT_KO[e.transit]} ${e.aspect} 출생 ${POINT_KO[e.target]}${h(e.targetHouse)}`;
    case "retrograde":
      return `${POINT_KO[e.planet]} 역행${h(e.house)}`;
    case "ingress":
      return `${POINT_KO[e.planet]} ${e.sign} 진입${h(e.house)}`;
    case "eclipse":
      return `${ECLIPSE_KO[e.detail] ?? ""}${e.eclipse === "solar" ? "일식" : "월식"}(${e.sign}${e.house ? ` ${e.house}H` : ""})${e.contact ? ` · 출생 ${POINT_KO[e.contact.target]}과 ${e.contact.aspect}` : ""}`;
    case "chiron_return":
      return "키론 리턴(나이 마일스톤)";
  }
}

/** 이 이벤트가 언급하는 행성·별자리 이름(검증의 '입력에 있는 이름' 목록용). */
export function eventNames(e: TimelineEvent): string[] {
  switch (e.kind) {
    case "transit":
      return [POINT_KO[e.transit], POINT_KO[e.target]];
    case "retrograde":
      return [POINT_KO[e.planet], e.sign];
    case "ingress":
      return [POINT_KO[e.planet], e.sign];
    case "eclipse":
      return ["태양", "달", e.sign, ...(e.contact ? [POINT_KO[e.contact.target]] : [])];
    case "chiron_return":
      return [];
  }
}
