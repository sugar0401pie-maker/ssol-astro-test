// 영문 문단: emph이면 첫 문장을 굵게(lib/en/emphasis.ts 규칙). 한국어 화면에서는 쓰지 않는다.
import { splitKeySentence } from "@/lib/en/emphasis";

export function KeyText({ text, emph }: { text: string; emph: boolean }) {
  const s = emph ? splitKeySentence(text) : null;
  if (!s) return <>{text}</>;
  return (
    <>
      <b className="key-s">{s.key}</b>
      {s.rest}
    </>
  );
}
