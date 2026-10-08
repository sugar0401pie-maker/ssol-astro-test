// 공유 이미지(디자인가이드 4장): 선을 뺀 단순판 휠(별자리 고리 + 행성 기호 + 가운데 태양 별자리 기호) + 유형 문구.
// 브라우저에서 SVG 글자로 만들고 캔버스로 PNG를 뽑는다 — 출생 정보는 어디에도 보내지 않는다.
// 닉네임·생년월일·시간·장소는 넣지 않는다(공유하는 사람이 원치 않는 정보가 퍼지지 않게).
import { PLANET_GLYPHS, PLANET_ORDER, SIGN_GLYPHS } from "@/components/chart/labels";
import type { NatalChart } from "@/lib/astro/natal";
import { layoutPlanets, lonToAngle, polar, rotationLonFor } from "@/lib/astro/wheelLayout";

export const SHARE_W = 1080;
export const SHARE_H = 1350; // 4:5

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 긴 유형 문구를 대략 글자 수로 줄 나눔(한 줄 18자 안팎, 단어 단위). */
export function wrapKorean(text: string, max = 18): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if (line && (line + " " + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

export function buildShareSvg(args: { chart: NatalChart; sunSign: string; sunSignIndex: number; typeLine: string; competency: string; style: string }): string {
  const { chart } = args;
  const cx = SHARE_W / 2;
  const cy = 560;
  const R = 420;
  const ringIn = R - 70;
  const rot = rotationLonFor(chart);
  const angle = (lon: number) => lonToAngle(lon, rot);
  const parts: string[] = [];
  parts.push(
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1E3F"/><stop offset="1" stop-color="#013566"/></linearGradient></defs>`,
    `<rect width="${SHARE_W}" height="${SHARE_H}" fill="url(#bg)"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#CBB27A" stroke-width="3"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${ringIn}" fill="none" stroke="#CBB27A" stroke-width="2"/>`,
  );
  // 별자리 고리 12칸(내 태양 별자리 칸은 옅게 채움)
  for (let i = 0; i < 12; i++) {
    const a0 = angle(i * 30);
    const p0 = polar(cx, cy, R, a0);
    const p1 = polar(cx, cy, ringIn, a0);
    parts.push(`<line x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="#CBB27A" stroke-width="2"/>`);
    const mid = polar(cx, cy, (R + ringIn) / 2, angle(i * 30 + 15));
    const fill = i === args.sunSignIndex ? "#CBB27A" : "#FDF6E9";
    parts.push(`<text x="${mid.x.toFixed(1)}" y="${mid.y.toFixed(1)}" font-size="40" fill="${fill}" text-anchor="middle" dominant-baseline="central">${SIGN_GLYPHS[i]}</text>`);
  }
  // 행성 기호(겹치지 않게 배치) — 각도 선·하우스는 넣지 않는다
  const pts = PLANET_ORDER.flatMap((key) => {
    const p = chart.planets[key];
    return p ? [{ key, lon: p.lon }] : [];
  });
  for (const p of layoutPlanets(pts, { minSepDeg: 9, rowSepDeg: 17 })) {
    const pos = polar(cx, cy, ringIn - (p.level === 1 ? 130 : 60), angle(p.displayLon));
    parts.push(
      `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="30" fill="#0B1E3F" stroke="#CBB27A" stroke-width="2"/>`,
      `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" font-size="34" fill="#FDF6E9" text-anchor="middle" dominant-baseline="central">${PLANET_GLYPHS[p.key] ?? ""}</text>`,
    );
  }
  // 가운데 태양 별자리 기호
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="90" fill="#FDF6E9" stroke="#013566" stroke-width="6"/>`,
    `<text x="${cx}" y="${cy}" font-size="96" fill="#013566" text-anchor="middle" dominant-baseline="central">${SIGN_GLYPHS[args.sunSignIndex] ?? ""}</text>`,
  );
  // 유형 문구
  const font = `font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"`;
  const lines = wrapKorean(args.typeLine);
  let y = 1060;
  parts.push(`<text x="${cx}" y="${y}" ${font} font-size="40" fill="#CBB27A" text-anchor="middle">${esc(args.sunSign)} · ${esc(`${args.competency} × ${args.style}`)}</text>`);
  y += 64;
  for (const l of lines.slice(0, 3)) {
    parts.push(`<text x="${cx}" y="${y}" ${font} font-size="44" font-weight="700" fill="#FDF6E9" text-anchor="middle">${esc(l)}</text>`);
    y += 58;
  }
  parts.push(`<text x="${cx}" y="${SHARE_H - 50}" ${font} font-size="30" fill="#FDF6E9" fill-opacity="0.7" text-anchor="middle">쏠 점성술 하우스 · astro.ssolwellnesshouse.com</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_W}" height="${SHARE_H}" viewBox="0 0 ${SHARE_W} ${SHARE_H}">${parts.join("")}</svg>`;
}

/** SVG → PNG Blob(캔버스). 실패하면 null. */
export async function svgToPng(svg: string): Promise<Blob | null> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("이미지 만들기 실패"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_W;
    canvas.height = SHARE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
