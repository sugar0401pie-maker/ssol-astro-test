import type { Faq } from "@/lib/about/content";
import { H2 } from "./AboutShell";

/** FAQ 목록 — 질문은 <h3>, 답은 바로 아래 단락(접지 않아 HTML에 그대로 있다) */
export default function FaqList({ faqs, title = "자주 묻는 질문" }: { faqs: Faq[]; title?: string }) {
  const groups = Array.from(new Set(faqs.map((f) => f.group)));
  return (
    <>
      <H2>{title}</H2>
      {groups.map((g) => (
        <section key={g} className="mt-4">
          {groups.length > 1 && <p className="text-[13px] font-semibold text-navy/70">{g}</p>}
          {faqs
            .filter((f) => f.group === g)
            .map((f) => (
              <div key={f.q} className="mt-3">
                <h3 className="text-[15px] font-semibold text-navy">Q. {f.q}</h3>
                <p className="mt-1">A. {f.a}</p>
              </div>
            ))}
        </section>
      ))}
    </>
  );
}
