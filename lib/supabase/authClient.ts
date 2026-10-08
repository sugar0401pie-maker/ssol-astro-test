"use client";

// 로그인 헬퍼(이메일·카카오·네이버). 쏘웰라 lib/supabase/authClient.ts와 같은 provider 설정을 쓴다.
// 회원가입은 여기서 따로 만들지 않고 쏘웰라 가입 화면으로 보낸다 — 계정이 같고(공유 auth.users),
// 가입 절차(이메일 인증·약관·프로필)를 두 곳에서 따로 관리하지 않기 위해서다.
import { getBrowserClient } from "./browser";

export type AuthResult = { ok: boolean; error?: string };

export const SIGNUP_URL = "https://app.ssolwellnesshouse.com/signup";

function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않아요.",
    "Email not confirmed": "이메일 인증이 아직 완료되지 않았어요. 메일함을 확인해 주세요.",
    "Unable to validate email address: invalid format": "이메일 형식이 올바르지 않아요.",
  };
  return known[message] ?? "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getBrowserClient();
  if (!supabase) return { ok: false, error: "설정 오류로 로그인을 사용할 수 없어요." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true };
}

// 네이버는 Supabase 커스텀 OAuth provider(식별자 "custom:naver"), 카카오는 기본 provider.
// 카카오 동의항목은 닉네임·이메일만(쏘웰라와 같은 앱 설정).
const NAVER_PROVIDER_ID = "custom:naver";
const KAKAO_SCOPES = "profile_nickname account_email";

/** 성공하면 카카오/네이버 로그인 화면으로 이동했다가 지금 주소로 돌아온다(Supabase Redirect URLs에 이 도메인 등록 필요). */
export async function signInWithOAuth(provider: "kakao" | "naver"): Promise<AuthResult> {
  const supabase = getBrowserClient();
  if (!supabase) return { ok: false, error: "설정 오류로 로그인을 사용할 수 없어요." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: (provider === "naver" ? NAVER_PROVIDER_ID : provider) as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined,
      ...(provider === "kakao" ? { scopes: KAKAO_SCOPES } : {}),
    },
  });
  return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true };
}

export async function signOut(): Promise<void> {
  await getBrowserClient()?.auth.signOut();
}
