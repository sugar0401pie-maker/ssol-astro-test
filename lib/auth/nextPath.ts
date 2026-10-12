// /login?next=… 로 받은 돌아갈 주소를 이 사이트 안의 경로로만 허용한다(다른 사이트로 튕기는 오픈 리다이렉트 방지).
// 허용: "/"로 시작하는 경로. 거부: "//evil.com", "/\evil.com", "https://…", 빈 값 → 기본값.
// 브라우저는 주소를 읽을 때 탭·줄바꿈을 지우므로 "/\t/evil.com"이 "//evil.com"이 된다 — 제어 문자·역슬래시가 하나라도 있으면 거부한다.
export function safeNextPath(next: string | null | undefined, fallback = "/results"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://astro.invalid");
    if (u.origin !== "https://astro.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
