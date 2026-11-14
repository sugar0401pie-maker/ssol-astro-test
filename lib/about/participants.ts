// 참여자 수 한 곳(owner 지정 숫자 — 2026-11-14: 11,371). 첫 화면(한국어·영문)과 /about이 같은 값·같은 기준일을 쓴다.
// 자동으로 늘지 않는다. 숫자를 바꿀 때는 기준일(asOf)도 같이 바꾼다.
export const PARTICIPANTS = { count: 11371, asOf: "2026-11-14" } as const;

/** "2026.11.02" */
export const participantsDate = (asOf: string = PARTICIPANTS.asOf) => asOf.replaceAll("-", ".");
