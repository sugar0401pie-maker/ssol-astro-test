// astro_ai_usage 한 줄 만들기(순수 함수). 문장·개인정보 없이 숫자·코드만.
export interface UsageContext {
  feature: "paid_report" | "paid_report_redo";
  resultId?: string | null;
  lang?: "ko" | "en";
}

/** OpenAI Responses API usage 중 필요한 숫자 */
export interface UsageNumbers {
  model: string | null;
  ok: boolean;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number } | null;
    output_tokens_details?: { reasoning_tokens?: number } | null;
  } | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);

export function usageRow(ctx: UsageContext, part: string, n: UsageNumbers) {
  const u = n.usage ?? {};
  return {
    site: "astro",
    feature: ctx.feature,
    part,
    result_id: ctx.resultId && UUID.test(ctx.resultId) ? ctx.resultId : null,
    lang: ctx.lang ?? "ko",
    model: n.model ? n.model.slice(0, 80) : null,
    input_tokens: int(u.input_tokens),
    cached_tokens: int(u.input_tokens_details?.cached_tokens),
    output_tokens: int(u.output_tokens),
    reasoning_tokens: int(u.output_tokens_details?.reasoning_tokens),
    ok: n.ok,
  };
}
