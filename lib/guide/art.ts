// 화면별 안내 그림 목록(owner 2026-10-10 구글 드라이브 'general' 폴더, 화면마다 여러 장).
// 화면을 열 때마다 이 중 한 장을 무작위로 보여 준다. 새 그림을 더하면 public/guide/<화면>/에 파일을 넣고 여기 이름을 더한다.
// c는 2026-10-10 두 번째 폴더(파일 번호 = 화면 번호). a·b 원본 파일 번호는 03 다음부터 화면 번호와 한 칸씩 밀려 있어(예: 05-birth-calendar-clock = 04 출생 정보) 그림 내용으로 맞췄다.
export const GUIDE_ART_FILES = {
  "02": ["a.webp", "b.webp", "c.webp"], // 환영 — 02-welcome
  "03": ["a.webp", "b.webp", "c.webp"], // 경험 확인 — 03-gentle-question
  "03-1": ["a.webp", "b.webp", "c.webp"], // 처음 안내 — 04-first-star-map
  "04": ["a.webp", "b.webp", "c.webp"], // 출생 정보 — 05-birth-calendar-clock
  "05": ["a.webp", "b.webp", "c.webp"], // 질문 3개 — 06-taking-notes
  "06": ["a.webp", "b.webp", "c.webp"], // 로그인 — 07-key-envelope
  "07": ["a.webp", "b.webp", "c.webp"], // 유형 후보 선택 — 08-two-paths
  "08": ["a.webp", "b.webp", "c.webp"], // 로딩 — 09-looking-through-telescope
} as const satisfies Record<string, readonly string[]>;
export type GuideArtId = keyof typeof GUIDE_ART_FILES;

/** 그 화면의 그림 하나를 고른다(rand는 0 이상 1 미만). 그림이 없으면 null. */
export function pickGuideArt(id: GuideArtId, rand: number): string | null {
  const files: readonly string[] = GUIDE_ART_FILES[id] ?? [];
  if (!files.length) return null;
  const i = Math.min(files.length - 1, Math.max(0, Math.floor(rand * files.length)));
  return `/guide/${id}/${files[i]}`;
}
