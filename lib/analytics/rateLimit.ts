// 이용 흐름 기록 요청 횟수 제한(2026-10-17). 반복 요청으로 기록 표가 쓸데없는 줄로 차서 통계가 흐려지지 않게.
// 서버 인스턴스 메모리 안에서만 세는 '최선 노력' 방식이다(인스턴스가 여러 개면 각자 센다) — 돈이 드는 길이 아니라
// 이 정도로 충분하고, DB를 한 번 더 읽지 않아도 된다. 넘은 요청은 조용히 버린다(화면에는 영향 없음).

export interface WindowLimiter {
  /** 이번 요청을 받아도 되면 true(받은 것으로 센다) */
  take(key: string, now?: number): boolean;
}

/** 고정 창 방식: key마다 windowMs 동안 max번까지. 기억하는 key는 maxKeys개까지(넘으면 가장 오래된 것부터 잊음). */
export function windowLimiter(max: number, windowMs: number, maxKeys = 5000): WindowLimiter {
  const hits = new Map<string, { start: number; n: number }>();
  return {
    take(key, now = Date.now()) {
      const h = hits.get(key);
      if (!h || now - h.start >= windowMs) {
        hits.delete(key);
        if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        hits.set(key, { start: now, n: 1 });
        return true;
      }
      if (h.n >= max) return false;
      h.n += 1;
      return true;
    },
  };
}

// 한 사람이 테스트를 끝까지 하고 결과 7장을 다 넘겨도 이벤트는 30개 안팎이다 — 넉넉히 잡는다.
/** 같은 브라우저(anonId) 기준: 10분에 60개 */
export const ANON_LIMIT = { max: 60, windowMs: 10 * 60_000 };
/** 같은 IP 기준(공용 와이파이 등 여러 사람이 한 IP일 수 있어 더 넉넉히): 10분에 300개 */
export const IP_LIMIT = { max: 300, windowMs: 10 * 60_000 };
