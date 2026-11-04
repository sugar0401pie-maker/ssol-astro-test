// 영문판 주문 확인 이메일(08_on-screen-texts §4 — EU·UK 소비자법상 청약철회 포기 확인을 남는 매체로 보내야 한다, 결제 직후 자동).
// 문구는 08 §4 그대로. 단 원문의 '(includes a 3-day Sowella AI pass)'는 뺐다 — 쏘웰라 이용권은 리포트와 따로 주지 않는다(owner 10-08·10-15).
export const ORDER_SUPPORT = "contact@ssolwellness.com";
const SITE = "https://astro.ssolwellnesshouse.com";

export interface OrderMailInput {
  orderId: string;
  paidAt: Date;
  /** 토스가 돌려준 결제수단("카드", "해외간편결제" 등) */
  method: string | null;
  resultId: string | null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatPaidAt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}
export function methodLabel(m: string | null): string {
  if (!m) return "card or PayPal";
  if (m.includes("카드") || /card/i.test(m)) return "card";
  if (m.includes("해외간편") || /paypal|foreign/i.test(m)) return "PayPal";
  return "card or PayPal";
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function buildOrderEmailEn(m: OrderMailInput): { subject: string; text: string; html: string } {
  const subject = "Your SSOL star report — order confirmation";
  const body = `Thanks for your order. Order no. ${m.orderId} · Star report · US$2.99, one-time payment, no renewal · Paid on ${formatPaidAt(m.paidAt)} with ${methodLabel(m.method)}.`;
  const waiver = "Before paying, you asked us to deliver your report right away and acknowledged that you lose your right to cancel once it is shown to you.";
  const seller = `Seller: SSOL Wellness House · 572-07-03549 · Room 408, 4F, 100 Dongmak-ro, Mapo-gu, Seoul · ${ORDER_SUPPORT} · Contact number +82-10-2835-2263`;
  const terms = `${SITE}/en/legal/terms`;
  const refund = `${SITE}/en/legal/refund`;
  const report = m.resultId ? `${SITE}/en/results/${m.resultId}/4?utm_source=email&utm_medium=order_mail` : null;
  const text = [body, "", waiver, "", ...(report ? [`Open your report: ${report}`, ""] : []), seller, `Terms of Use: ${terms}`, `Refund Policy: ${refund}`].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#013566;max-width:560px">
<p>${esc(body)}</p>
<p>${esc(waiver)}</p>
${report ? `<p><a href="${esc(report)}" style="display:inline-block;background:#013566;color:#FDF6E9;padding:10px 18px;border-radius:999px;text-decoration:none">Open your report</a></p>` : ""}
<p style="font-size:12px;color:#5a6b80">${esc(seller)} · <a href="${terms}">Terms of Use</a> · <a href="${refund}">Refund Policy</a></p>
</div>`;
  return { subject, text, html };
}

export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
