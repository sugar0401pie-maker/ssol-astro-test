"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { claimGuestResults } from "@/lib/guest/client";
import { getBrowserClient, isRealSession } from "@/lib/supabase/browser";

/**
 * 로그인 상태(undefined = 확인 중, null = 로그인 안 됨). 로그인돼 있으면 이 브라우저의 비회원 결과를 계정으로 옮긴 뒤에 알려 준다
 * (옮기기가 끝나야 목록·결과 조회가 계정 기준으로 맞게 나온다).
 */
export function useRealSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setSession(null));
      return;
    }
    const apply = (s: Session | null) => {
      if (!isRealSession(s)) return setSession(null);
      void claimGuestResults(s).finally(() => setSession(s));
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
