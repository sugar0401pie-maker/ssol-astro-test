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
  /**
   * 네이버 '연락처 이메일'은 로그인 이메일(email) 칸으로 넘기지 않고 contact_email로만 넘긴다(사용자 정보에 남음).
   * - email + email_verified:false → Supabase가 "인증 안 된 이메일"로 보고 확인 메일부터 보내며 로그인을 막았다(2026-10-10 실측).
   * - email + email_verified:true → 같은 이메일의 다른 계정(이메일·카카오)에 자동으로 합쳐질 수 있어 owner 결정(계정 별도)과
   *   어긋나고, 남의 이메일을 적은 계정이 그 사람 계정에 붙는 위험도 있다.
   * 그래서 이메일 없이 로그인('Allow users without email' 켬)하고, 연락처는 contact_email로 보관한다.
   */
  contact_email?: string;
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
    ...(r.email ? { contact_email: r.email } : {}),
    ...(r.name ? { name: r.name } : {}),
    ...(r.nickname ? { nickname: r.nickname } : {}),
    ...(r.profile_image ? { picture: r.profile_image } : {}),
  };
}
