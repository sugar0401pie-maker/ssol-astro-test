// 키론(2060 Chiron) 위치 — astronomy-engine에 키론이 없어서, owner가 만든 5일 간격 표를 선형 보간한다
// (docs/reference/12_바람판정v3/키론_계산.py: JPL 궤도요소(epoch 2012-03-14)에서 태양·목성·토성·천왕성·해왕성 중력을 넣어 수치적분,
// 1900-01-01~2044-01-01, 지구 중심 황경). 바람판정_엔진.py의 chiron_lon_jd·chiron_return을 그대로 옮겼다 — 결과가 같아야 한다.
// 서버에서만 쓴다(표가 약 78KB).
import table from "../../data/astro/chiron_lon_5d.json" with { type: "json" };

const T = table as { jd0: number; step: number; lon: number[] };

/** 키론 지구 중심 황경(도). 표 범위(1900~2044) 밖이면 null. */
export function chironLonJd(jd: number): number | null {
  const i = (jd - T.jd0) / T.step;
  const k = Math.floor(i);
  if (k < 0 || k + 1 >= T.lon.length) return null;
  const f = i - k;
  const a = T.lon[k];
  const b = T.lon[k + 1];
  const d = ((((b - a + 540) % 360) + 360) % 360) - 180;
  return (((a + d * f) % 360) + 360) % 360;
}

/** 'YYYY-MM-DD'의 03:00 UTC 율리우스일(엔진의 하루 표본 시각과 같음) */
export function jdOf(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) / 86_400_000 + 2440587.5 + 0.125;
}

/** 출생일(현지 날짜) 정오 UTC의 키론 위치 — 원본 엔진과 같은 기준 */
export function natalChiron(birthDate: string): number | null {
  return chironLonJd(jdOf(birthDate) - 0.125 + 0.5);
}

const ORB = 1.5;
const diff = (a: number, b: number) => Math.abs(((((a - b + 540) % 360) + 360) % 360) - 180);

/** 연도별 키론 리턴 정확일(그해 오브 1.5° 안에서 가장 가까운 날). 원본 chiron_return과 같다. */
export function chironReturnYears(birthDate: string, years: number[]): Map<number, string> {
  const out = new Map<number, string>();
  const natal = natalChiron(birthDate);
  if (natal === null) return out;
  for (const y of years) {
    let best: { d: string; o: number } | null = null;
    for (let ms = Date.UTC(y, 0, 1); new Date(ms).getUTCFullYear() === y; ms += 86_400_000) {
      const d = new Date(ms).toISOString().slice(0, 10);
      const lon = chironLonJd(jdOf(d));
      if (lon === null) continue;
      const o = diff(lon, natal);
      if (o <= ORB && (best === null || o < best.o)) best = { d, o };
    }
    if (best) out.set(y, best.d);
  }
  return out;
}

/** 키론이 출생 위치 ±1.5° 안에 있는 구간들(전환점·5년 마일스톤용) */
export function chironReturnRuns(birthDate: string, days: string[]): Array<{ from: string; to: string; exact: string }> {
  const natal = natalChiron(birthDate);
  if (natal === null) return [];
  const runs: Array<{ from: string; to: string; exact: string; o: number }> = [];
  let run: { from: string; to: string; exact: string; o: number } | null = null;
  for (const d of days) {
    const lon = chironLonJd(jdOf(d));
    const o = lon === null ? Infinity : diff(lon, natal);
    if (o <= ORB) {
      if (!run) run = { from: d, to: d, exact: d, o };
      run.to = d;
      if (o < run.o) Object.assign(run, { exact: d, o });
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs.map(({ from, to, exact }) => ({ from, to, exact }));
}
