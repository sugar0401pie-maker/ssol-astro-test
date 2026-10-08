import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서버 전용 클라이언트: 보안 규칙(RLS)을 우회하는 비밀 키를 쓴다. "server-only" 덕분에 브라우저 코드에서
// 불러오면 빌드가 실패한다(키 노출 방지). 키는 점성술 전용으로 새로 만든 비밀 키(sb_secret_…)든
// 예전 service_role 키든 같은 환경변수 이름(SUPABASE_SERVICE_ROLE_KEY)으로 받는다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 서버 환경변수(URL, SERVICE_ROLE_KEY)가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
