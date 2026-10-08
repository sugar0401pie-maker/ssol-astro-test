"use client";

// 브라우저용 Supabase 클라이언트. 공개되어도 되는 값(NEXT_PUBLIC_*)만 쓴다.
// 쏘웰라(app.)·디저트 테스트(quiz.)와 로그인을 공유하려고 세션을 쿠키(@supabase/ssr)로 저장하고,
// 쿠키 도메인을 .ssolwellnesshouse.com으로 맞춘다(쏘웰라 lib/supabase/browser.ts와 같은 로직 — 세 앱이 같아야 공유된다).
import { createBrowserClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { sharedCookieDomain } from "./shared-cookie-domain";

let client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // 값이 비어 있으면 조용히 실패하지 않고 콘솔에 남긴다(쏘웰라 2026-09-23 배포 사고와 같은 상황을 빨리 찾게).
    console.error("Supabase 브라우저 클라이언트 초기화 실패: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY가 비어 있습니다.");
    return null;
  }
  client = createBrowserClient(url, anonKey, {
    cookieOptions: { domain: sharedCookieDomain(typeof window !== "undefined" ? window.location.hostname : undefined) },
  });
  return client;
}

/** 익명 세션은 로그인으로 치지 않는다(쏘웰라 AuthGate와 같은 기준). */
export function isRealSession(session: Session | null): session is Session {
  return !!session && session.user?.is_anonymous !== true;
}

export async function getRealSession(): Promise<Session | null> {
  const supabase = getBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return isRealSession(data.session) ? data.session : null;
}
