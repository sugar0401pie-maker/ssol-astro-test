"use client";

// 공유 링크 코드(owner 2026-10-15): 채널마다 무작위 코드 하나. 코드는 브라우저가 바로 만들고 기록은 따로 보낸다 —
// 휴대폰 공유창·카카오톡은 버튼을 누른 직후에만 열려서 기록을 기다리지 않는다.
import { newSlug, shareUrl, type ShareChannel } from "@/lib/attribution/attribution";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";

export const SITE_URL = "https://astro.ssolwellnesshouse.com";

export function makeShareLink(channel: ShareChannel, resultId: string | null): string {
  const slug = newSlug((n) => crypto.getRandomValues(new Uint8Array(n)));
  const url = shareUrl(SITE_URL, slug, channel);
  void getRealSession()
    .catch(() => null)
    .then((session) =>
      fetch("/api/share-links", {
        method: "POST",
        keepalive: true,
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ slug, channel, resultId }),
      }),
    )
    .catch(() => {
      /* 기록이 안 돼도 링크는 그대로 동작한다(utm으로 채널은 남음) */
    });
  return url;
}
