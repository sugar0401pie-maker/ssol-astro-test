// 영문 법적 고지 페이지 내용의 모양(scripts/docx_to_legal_blocks.py가 만든 JSON).
export type Seg = { t: string; b: boolean };
export type LegalBlock =
  | { type: "h1" | "h2" | "h3" | "p" | "li"; segs: Seg[] }
  | { type: "table"; rows: string[][] };

/** 영문 법적 고지 페이지 목록(각각 따로 주소, owner 2026-11-04). 문서를 받을 때마다 여기에 더한다. */
export const EN_LEGAL_PAGES = [{ slug: "privacy", title: "Privacy Policy" }] as const;

/** 연속된 li를 한 목록으로 묶는다(화면에서 ul 하나로 그리려고) */
export function groupLists(blocks: LegalBlock[]): (LegalBlock | { type: "ul"; items: Seg[][] })[] {
  const out: (LegalBlock | { type: "ul"; items: Seg[][] })[] = [];
  for (const b of blocks) {
    if (b.type === "li") {
      const last = out[out.length - 1];
      if (last && last.type === "ul") last.items.push(b.segs);
      else out.push({ type: "ul", items: [b.segs] });
    } else out.push(b);
  }
  return out;
}
