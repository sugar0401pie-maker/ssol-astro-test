// /<키>.txt → 여기로(next.config rewrites). 키 파일은 키 한 줄만(공백·줄바꿈 없이). 다른 주소·키가 없으면 404.
import { keyFileBody } from "@/lib/indexnow";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const body = keyFileBody((await params).key, process.env.INDEXNOW_KEY);
  if (body === null) return new Response("Not found", { status: 404 });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
