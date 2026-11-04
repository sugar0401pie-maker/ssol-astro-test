// 영문 정책 페이지 내용의 모양(scripts/md_to_legal_blocks.py가 owner Markdown에서 만든 JSON).
export type Seg = { t: string; b: boolean };
export type LegalBlock =
  | { type: "h1" | "h2" | "h3" | "p" | "li" | "oli"; segs: Seg[] }
  | { type: "table"; kv?: boolean; rows: string[][] };

/**
 * 영문 정책 페이지 — 정책마다 따로 주소(owner 2026-11-04, (나) 영문 전용). 원본 docs/legal_en/md/*.md(2026-11-06 시행).
 * 문서가 더 오면 Markdown을 docs/legal_en/md에 두고 JSON을 만든 뒤 여기에 한 줄 더한다.
 */
export const EN_LEGAL_PAGES = [
  { slug: "terms", title: "Terms of Use" },
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "birth-details-consent", title: "Birth Details Consent" },
  { slug: "cookies", title: "Cookie Policy" },
  { slug: "refund", title: "Refund Policy" },
  { slug: "disclaimer", title: "Disclaimer" },
  { slug: "consumer-health-data", title: "Consumer Health Data Privacy Policy" },
] as const;
export type EnLegalSlug = (typeof EN_LEGAL_PAGES)[number]["slug"];

export const enLegalUrl = (slug: EnLegalSlug) => `/en/legal/${slug}`;

/** 연속된 목록 줄(점·번호)을 한 목록으로 묶는다(화면에서 ul/ol 하나로 그리려고) */
export function groupLists(blocks: LegalBlock[]): (LegalBlock | { type: "ul" | "ol"; items: Seg[][] })[] {
  const out: (LegalBlock | { type: "ul" | "ol"; items: Seg[][] })[] = [];
  for (const b of blocks) {
    if (b.type === "li" || b.type === "oli") {
      const kind = b.type === "li" ? "ul" : "ol";
      const last = out[out.length - 1];
      if (last && last.type === kind) last.items.push(b.segs);
      else out.push({ type: kind, items: [b.segs] });
    } else out.push(b);
  }
  return out;
}
