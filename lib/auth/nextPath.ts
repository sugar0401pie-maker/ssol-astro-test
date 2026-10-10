// /login?next=… 로 받은 돌아갈 주소를 이 사이트 안의 경로로만 허용한다(다른 사이트로 튕기는 오픈 리다이렉트 방지).
// 허용: "/"로 시작하는 경로. 거부: "//evil.com", "/\evil.com", "https://…", 빈 값 → 기본값.
export function safeNextPath(next: string | null | undefined, fallback = "/results"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
