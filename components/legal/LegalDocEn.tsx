// 영문 법적 고지 한 문서를 그린다((나) 영문 전용, owner 2026-11-04). 한국어 /legal과 같은 크림 상자 + 남색 글자 테마.
// 내용은 lib/legal/en/*.json(owner Markdown에서 변환) 그대로 — 여기서 문장을 고치지 않는다.
import Link from "next/link";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import { EN_LEGAL_PAGES, enLegalUrl, groupLists, type LegalBlock, type Seg } from "@/lib/legal/en/blocks";

function Text({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) => (s.b ? <strong key={i} className="font-semibold text-navy">{s.t}</strong> : <span key={i}>{s.t}</span>))}
    </>
  );
}

const plain = (segs: Seg[]) => segs.map((s) => s.t).join("");

export default function LegalDocEn({ blocks, current }: { blocks: LegalBlock[]; current: string }) {
  const [title, ...rest] = blocks;
  return (
    <div lang="en" className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
        <Link href="/en" className="text-[13px] text-cream/70">
          ← Home
        </Link>
        <h1 className="mt-3 text-[20px] font-bold text-cream">{title && "segs" in title ? plain(title.segs) : ""}</h1>
        {EN_LEGAL_PAGES.length > 1 && (
          <nav className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium" aria-label="Policies">
            {EN_LEGAL_PAGES.map((p) => (
              <Link
                key={p.slug}
                href={enLegalUrl(p.slug)}
                aria-current={p.slug === current ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 ${p.slug === current ? "bg-cream text-navy" : "bg-cream/15 text-cream"}`}
              >
                {p.title}
              </Link>
            ))}
          </nav>
        )}
        <div className="mt-5 rounded-2xl bg-cream px-5 py-6">
          <LegalBody blocks={rest} />
        </div>
      </main>
      <div className="intro-foot">
        <AuthFooterLink lang="en" />
        <SiteFooterEn />
      </div>
    </div>
  );
}

/** 정책 본문만(제목 제외). 출생 정보 동의 [Details] 시트에서도 같은 모양으로 쓴다. */
export function LegalBody({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="space-y-3 text-[14px] leading-6 text-navy/85">
      {groupLists(blocks).map((b, i) => {
            if (b.type === "ul" || b.type === "ol") {
              const L = b.type;
              return (
                <L key={i} className={`${L === "ul" ? "list-disc" : "list-decimal"} space-y-1.5 pl-5`}>
                  {b.items.map((it, j) => (
                    <li key={j}>
                      <Text segs={it} />
                    </li>
                  ))}
                </L>
              );
            }
            if (b.type === "table") {
              const [head, ...body] = b.rows;
              const keyValue = b.kv === true;
              // 칸이 많은 표는 휴대폰에서 글자가 세로로 쪼개져 읽을 수 없어서, 한 줄 = 카드 하나(제목: 내용)로 그린다.
              if (keyValue)
                return (
                  <dl key={i} className="divide-y divide-navy/10 rounded-lg border border-navy/15 text-[13px]">
                    {b.rows.map((r, k) => (
                      <div key={k} className="grid grid-cols-[38%_1fr] gap-2 px-3 py-2">
                        <dt className="font-medium text-navy">{r[0]}</dt>
                        <dd>{r[1]}</dd>
                      </div>
                    ))}
                  </dl>
                );
              return (
                <div key={i} className="space-y-2">
                  {body.map((r, k) => (
                    <dl key={k} className="rounded-lg border border-navy/15 px-3 py-2 text-[13px]">
                      {r.map((c, m) =>
                        m === 0 ? (
                          <dt key={m} className="text-[14px] font-semibold text-navy">{c}</dt>
                        ) : (
                          <div key={m} className="mt-1">
                            <dt className="inline font-medium text-navy">{head[m]}: </dt>
                            <dd className="inline">{c}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  ))}
                </div>
              );
            }
            if (!("segs" in b)) return null;
            if (b.type === "h2" || b.type === "h1") return <h2 key={i} className="pt-2 text-[17px] font-semibold text-navy">{plain(b.segs)}</h2>;
            if (b.type === "h3") return <h3 key={i} className="pt-3 text-[15px] font-semibold text-navy">{plain(b.segs)}</h3>;
            return (
              <p key={i}>
                <Text segs={b.segs} />
              </p>
            );
          })}
    </div>
  );
}
