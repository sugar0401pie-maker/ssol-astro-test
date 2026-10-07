// 출생차트 휠의 배치 계산(순수 함수). docs/spec/02_디자인가이드.md 4장.
// 화면 그리기는 components/chart/BirthChartWheel.tsx가 하고, 여기서는 각도·위치·선 고르기만 한다.
// 런타임 import 없이 타입만 가져온다 — 클라이언트 번들에 계산 엔진(astronomy-engine)이 딸려 가지 않게.
import type { AspectName, PointKey, SIGNS } from "./constants.ts";
import type { Accuracy, NatalAspect, NatalChart } from "./natal.ts";

export type SignName = (typeof SIGNS)[number];

/**
 * 별자리 순서(양자리부터). constants.ts의 SIGNS와 같은 값 — 그쪽을 런타임으로 import하면
 * 계산 엔진이 클라이언트 번들에 딸려 가서 여기 따로 둔다(같은지는 테스트가 확인).
 */
export const WHEEL_SIGNS: readonly SignName[] = [
  "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
  "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리",
];

/**
 * 휠을 돌리는 기준 경도. A·B등급은 상승궁(ASC)을 9시에, C등급(출생시간 모름)이나
 * ASC 값이 없으면 양자리 0°를 9시에 둔다(하우스·상승궁을 쓰지 않으므로).
 */
export function rotationLonFor(chart: Pick<NatalChart, "planets" | "accuracy">): number {
  if (chart.accuracy === "C") return 0;
  return chart.planets.asc?.lon ?? 0;
}

export function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/**
 * 황경 → 화면 각도(도, 수학 좌표: 0 = 3시, 반시계 방향 증가).
 * rotationLon이 180°(9시)에 오고, 황도대는 반시계 방향으로 흐른다(일반적인 차트 관례).
 */
export function lonToAngle(lon: number, rotationLon: number): number {
  return normDeg(180 + lon - rotationLon);
}

/** 화면 각도 → SVG 좌표(y축이 아래로 커지므로 sin 부호를 뒤집는다). */
export function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

export interface PlanetInput {
  key: PointKey;
  lon: number;
}

export interface PlacedPlanet {
  key: PointKey;
  /** 실제 황경(짧은 표시선의 끝). */
  lon: number;
  /** 겹침을 피해 옮긴 뒤 원을 그릴 황경. */
  displayLon: number;
  /** 0 = 기본 줄, 1 = 바깥 줄(겹칠 때 바깥으로 밀어낸 행성). */
  level: 0 | 1;
  /** 실제 위치에서 옮겨졌는지(옮겨졌으면 실제 위치까지 짧은 선을 그린다). */
  displaced: boolean;
}

export interface LayoutOptions {
  /** 이웃 행성과 화면상 최소 간격(도). 스펙의 "4° 안으로 겹치면"이 기본값. */
  minSepDeg?: number;
  /** 같은 줄에 나란히 두려면 필요한 간격(도). 이보다 가까운 이웃은 바깥 줄로 번갈아 민다. */
  rowSepDeg?: number;
}

/**
 * 행성 겹침 풀기. 실제 간격이 minSepDeg 이상인 행성은 제자리에 두고, 더 가까운 무리만
 * 무리의 평균 위치를 중심으로 minSepDeg 간격으로 벌린다(무리가 이웃 무리와 다시 겹치면 합쳐서 반복).
 * 그 뒤 화면 간격이 rowSepDeg보다 좁은 이웃은 바깥 줄(level 1)로 번갈아 보낸다.
 */
export function layoutPlanets(points: readonly PlanetInput[], opts: LayoutOptions = {}): PlacedPlanet[] {
  const minSep = opts.minSepDeg ?? 4;
  const rowSep = opts.rowSepDeg ?? minSep * 2;
  const n = points.length;
  if (n === 0) return [];

  // 원을 가장 큰 빈틈에서 끊어 한 줄로 편다(이 빈틈에서는 겹침이 생기지 않는다).
  const sorted = points.map((p) => ({ key: p.key, lon: normDeg(p.lon) })).sort((a, b) => a.lon - b.lon);
  let breakAt = 0;
  let biggest = -1;
  for (let i = 0; i < n; i++) {
    const next = i === n - 1 ? sorted[0].lon + 360 : sorted[i + 1].lon;
    const gap = next - sorted[i].lon;
    if (gap > biggest) {
      biggest = gap;
      breakAt = (i + 1) % n;
    }
  }
  const seq = [...sorted.slice(breakAt), ...sorted.slice(0, breakAt)];
  const base = seq[0].lon;
  const unwrapped = seq.map((p) => normDeg(p.lon - base) + base);

  // 무리(cluster) = 연속된 인덱스 [start, end]. 처음엔 하나씩.
  let clusters = unwrapped.map((_, i) => ({ start: i, end: i }));
  const positions = unwrapped.slice();
  const place = (c: { start: number; end: number }) => {
    const size = c.end - c.start + 1;
    let mean = 0;
    for (let i = c.start; i <= c.end; i++) mean += unwrapped[i];
    mean /= size;
    for (let i = c.start; i <= c.end; i++) positions[i] = mean + (i - c.start - (size - 1) / 2) * minSep;
  };
  // 무리가 합쳐질 때마다 개수가 줄어드므로 최대 n번이면 멈춘다.
  for (let guard = 0; guard < n; guard++) {
    let merged = false;
    const next: typeof clusters = [];
    for (const c of clusters) {
      const prev = next[next.length - 1];
      if (prev && positions[c.start] - positions[prev.end] < minSep - 1e-9) {
        prev.end = c.end;
        place(prev);
        merged = true;
      } else {
        next.push({ ...c });
      }
    }
    clusters = next;
    if (!merged) break;
  }

  const out: PlacedPlanet[] = [];
  let prevLevel = 1 as 0 | 1;
  for (let i = 0; i < n; i++) {
    const tight = i > 0 && positions[i] - positions[i - 1] < rowSep - 1e-9;
    const level: 0 | 1 = tight && prevLevel === 0 ? 1 : 0;
    prevLevel = level;
    const displayLon = normDeg(positions[i]);
    out.push({
      key: seq[i].key,
      lon: seq[i].lon,
      displayLon,
      level,
      displaced: level === 1 || Math.abs(positions[i] - unwrapped[i]) > 0.05,
    });
  }
  return out;
}

export type AspectTone = "harmony" | "tension";

export interface AspectLine {
  a: PointKey;
  b: PointKey;
  aspect: AspectName;
  orb: number;
  tone: AspectTone;
}

const TONE: Partial<Record<AspectName, AspectTone>> = {
  육분: "harmony",
  삼분: "harmony",
  사각: "tension",
  충: "tension",
};

/** 휠에 기본으로 그리는 각도 선 개수(스펙 4장 "상위 8개"). */
export const DEFAULT_ASPECT_LINES = 8;

/**
 * 휠에 그릴 각도 선 고르기. 합(0°)은 두 행성이 붙어 있어 선으로 그리지 않고,
 * ASC·MC가 낀 각도도 선에서 뺀다(축은 따로 그린다). 오브가 작을수록(정확할수록) 먼저.
 * showAll이면 개수 제한 없이 모두.
 */
export function pickAspectLines(aspects: readonly NatalAspect[], showAll = false): AspectLine[] {
  const lines: AspectLine[] = [];
  for (const asp of aspects) {
    if (asp.a === "asc" || asp.a === "mc" || asp.b === "asc" || asp.b === "mc") continue;
    const tone = TONE[asp.aspect];
    if (!tone) continue;
    lines.push({ a: asp.a, b: asp.b, aspect: asp.aspect, orb: asp.orb, tone });
  }
  // Array.prototype.sort는 안정 정렬 — 오브가 같으면 엔진의 출력 순서를 유지한다.
  lines.sort((x, y) => x.orb - y.orb);
  return showAll ? lines : lines.slice(0, DEFAULT_ASPECT_LINES);
}

/** 하우스·축을 그릴 수 있는지(C등급이거나 ASC가 없으면 숨긴다). */
export function showsHouses(chart: { accuracy: Accuracy; planets: NatalChart["planets"] }): boolean {
  return chart.accuracy !== "C" && chart.planets.asc != null;
}
