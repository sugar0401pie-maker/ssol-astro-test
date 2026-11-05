// IndexNow(빙·네이버 등에 바뀐 페이지를 바로 알리기, owner 2026-11-05). 키는 공개 값이지만 환경변수 INDEXNOW_KEY에서만 읽는다.
/** IndexNow 키 형식: 영문 소문자·숫자 32자(openssl rand -hex 16) */
export const INDEXNOW_KEY_RE = /^[0-9a-f]{32}$/;

/** 키 파일 요청에 돌려줄 글자 — 환경변수 키와 주소의 키가 정확히 같을 때만, 아니면 null(404) */
export function keyFileBody(requested: string, envKey: string | undefined): string | null {
  const key = (envKey ?? "").trim();
  if (!INDEXNOW_KEY_RE.test(key)) return null;
  return requested === key ? key : null;
}
