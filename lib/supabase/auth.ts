import "server-only";
import { createAdminClient } from "./admin";

/** "Authorization: Bearer <토큰>"으로 로그인한 실제 사용자를 확인한다. 없거나 익명·무효면 null(요청 거부). */
export async function getUserIdFromAuthHeader(header: string | null): Promise<string | null> {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const { data, error } = await createAdminClient().auth.getUser(match[1]);
    if (error || !data.user || data.user.is_anonymous) return null;
    return data.user.id;
  } catch {
    return null; // 환경변수 누락 등 — 로그인 안 된 것으로 취급(fail closed)
  }
}
