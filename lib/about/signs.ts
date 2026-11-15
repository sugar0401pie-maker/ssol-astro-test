// 12별자리 공개 소개 페이지(/about/signs, /about/signs/<영문>) 데이터 — owner 2026-11-15 '별자리 12종도 별도 페이지로'.
// 글은 전부 해석 DB(검수 완료) 그대로: A1 별자리 소개, A2 태양, A3 달, A4 상승궁. 새 문장을 지어내지 않는다.
// 순수 함수(DB를 인자로 받음) — 화면은 서버에서 ASTRO_DB를 넘기고, 테스트는 JSON 파일을 넘긴다.
import type { AstroDb } from "../report/db.ts";
import { SITE_URL } from "../seo.ts";

export const SIGNS_URL = `${SITE_URL}/about/signs`;
export const SIGNS_H1 = "12별자리 — 별자리 친구들 12종";
export const SIGNS_TITLE = "12별자리 소개 — 기간·원소·수호성과 태양·달·상승궁 읽기 | 쏠 아스트로 하우스";
export const SIGNS_DESCRIPTION =
  "양자리부터 물고기자리까지, 열두 별자리의 기간·원소·성질·수호성과 키워드, 그리고 태양·달·상승궁이 그 별자리에 있을 때의 읽기를 모았어요.";
/** 별자리 날짜는 해마다 하루쯤 달라진다(A1 검수 메모) — 경계 날짜는 테스트가 계산한 값을 따른다고 안내 */
export const SIGN_DATES_NOTE = "기간은 대략이에요. 태양이 별자리를 옮기는 날은 해마다 하루쯤 달라서, 정확한 별자리는 테스트에서 태어난 날과 시간으로 계산해요.";

export interface SignPage {
  slug: string; // aries
  name: string; // 양자리
  nameEn: string;
  symbol: string;
  dates: string;
  element: string;
  modality: string;
  ruler: string;
  keywords: string;
  oneLiner: string;
  intro: string;
  sun: { line: string; text: string; shadow: string };
  moon: { line: string; text: string; comfort: string };
  rising: { line: string; text: string };
  /** 별자리 그림(결과 2장 '별이 본 나의 유형'과 같은 그림) */
  art: string;
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function buildSignPages(db: AstroDb): SignPage[] {
  const rows = (t: string) => db.dbs[t]?.rows ?? [];
  const bySign = (t: string) => new Map(rows(t).map((r) => [s(r.sign), r]));
  const sun = bySign("A2");
  const moon = bySign("A3");
  const asc = bySign("A4");
  return rows("A1").map((r) => {
    const name = s(r.sign);
    const slug = s(r.sign_en).toLowerCase();
    const a2 = sun.get(name) ?? {};
    const a3 = moon.get(name) ?? {};
    const a4 = asc.get(name) ?? {};
    return {
      slug,
      name,
      nameEn: s(r.sign_en),
      symbol: s(r.symbol),
      dates: s(r.dates),
      element: s(r.element),
      modality: s(r.modality),
      ruler: s(r.ruler),
      keywords: s(r.keywords),
      oneLiner: s(r.one_liner),
      intro: s(r.term_note),
      sun: { line: s(a2.table_line), text: s(a2.text), shadow: s(a2.shadow_line) },
      moon: { line: s(a3.table_line), text: s(a3.text), comfort: s(a3.comfort_line) },
      rising: { line: s(a4.table_line), text: s(a4.text) },
      art: `/art/${slug}/art_02_type.webp`,
    };
  });
}

export const signUrl = (slug: string) => `${SIGNS_URL}/${slug}`;
export const signTitle = (p: SignPage) => `${p.name}(${p.nameEn}) — ${p.keywords} | 쏠 아스트로 하우스`;
export const signDescription = (p: SignPage) => `${p.name}(${p.dates}) · ${p.element} 원소 · 수호성 ${p.ruler}. ${p.oneLiner}`;

const breadcrumb = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
});

/** 구조화 데이터 — 웹페이지·이동 경로만(가격·별점 없음) */
export function signsIndexJsonLd(pages: SignPage[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${SIGNS_URL}#page`, url: SIGNS_URL, name: SIGNS_H1, description: SIGNS_DESCRIPTION, inLanguage: "ko-KR" },
      {
        "@type": "ItemList",
        itemListElement: pages.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: signUrl(p.slug) })),
      },
      breadcrumb([["쏠 아스트로 하우스", `${SITE_URL}/`], ["소개", `${SITE_URL}/about`], ["12별자리", SIGNS_URL]]),
    ],
  };
}

export function signJsonLd(p: SignPage) {
  const url = signUrl(p.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${url}#page`, url, name: `${p.name} — ${p.keywords}`, description: signDescription(p), inLanguage: "ko-KR" },
      breadcrumb([["쏠 아스트로 하우스", `${SITE_URL}/`], ["12별자리", SIGNS_URL], [p.name, url]]),
    ],
  };
}
