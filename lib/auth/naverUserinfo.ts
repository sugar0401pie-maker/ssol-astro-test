// 네이버 사용자 정보 → Supabase 커스텀 OAuth가 읽는 모양(OIDC 표준 칸)으로 바꾸기(순수 함수).
// 네이버(https://openapi.naver.com/v1/nid/me)는 {"resultcode":"00","message":"success","response":{"id":…,"email":…}}처럼
// 정보를 response 안에 한 번 더 넣어 준다. Supabase는 맨 바깥의 sub(고유 아이디)·email을 찾기 때문에
// 그대로 연결하면 "missing provider id"로 로그인이 실패했다(2026-10-10 실측).

export interface NaverMeResponse {
  resultcode?: string;
  message?: string;
  response?: { id?: string; email?: string; name?: string; nickname?: string; profile_image?: string };
}

export interface OidcUserinfo {
  sub: string;
  email?: string;
  /**
   * 네이버의 '연락처 이메일'은 사용자가 적는 연락처라 인증됐다고 보장되지 않는다. true로 두면 Supabase가 같은 이메일의
   * 다른 계정(이메일·카카오)에 자동으로 합칠 수 있어 — owner 결정(카카오·네이버·이메일은 별도 계정)과 어긋나고
   * 남의 이메일을 적은 계정이 그 사람 계정에 붙는 위험도 있다. 그래서 늘 false.
   */
  email_verified: false;
  name?: string;
  nickname?: string;
  picture?: string;
}

/** 네이버 응답이 정상(resultcode "00", id 있음)이면 바꾼 값, 아니면 null. */
export function naverToOidc(body: NaverMeResponse): OidcUserinfo | null {
  const r = body.response;
  if (body.resultcode !== "00" || !r?.id) return null;
  return {
    sub: r.id,
    ...(r.email ? { email: r.email } : {}),
    email_verified: false,
    ...(r.name ? { name: r.name } : {}),
    ...(r.nickname ? { nickname: r.nickname } : {}),
    ...(r.profile_image ? { picture: r.profile_image } : {}),
  };
}
