"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserClient, isRealSession } from "@/lib/supabase/browser";

/** 로그인 상태(undefined = 확인 중, null = 로그인 안 됨). */
export function useRealSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setSession(null));
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(isRealSession(data.session) ? data.session : null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(isRealSession(s) ? s : null));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
