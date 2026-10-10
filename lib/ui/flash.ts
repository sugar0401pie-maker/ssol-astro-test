// 화면을 옮긴 뒤에 보여 줄 짧은 안내(토스트) 한 줄 — 이 탭의 sessionStorage에 잠깐 두고 다음 화면이 꺼내 쓴다.
// 프로토타입: '로그인 없이 시작했어요…', '로그인되었어요. 이제 쏘웰라와 대화할 수 있어요.', LOGIN_DONE.
const KEY = "astro_flash_v1";

export function setFlash(msg: string): void {
  try {
    sessionStorage.setItem(KEY, msg);
  } catch {
    /* 저장소를 못 쓰면 안내만 빠진다 */
  }
}

export function takeFlash(): string | null {
  try {
    const m = sessionStorage.getItem(KEY);
    if (m) sessionStorage.removeItem(KEY);
    return m;
  } catch {
    return null;
  }
}
