"use client";
// 결제 후 리포트를 쓰는 동안 잠긴 섹션 가운데에 뜨는 안내: 둥근 궤도를 도는 별 + 3초마다 바뀌는 문구.
// 화면이 멈춘 게 아니라 쓰는 중이라는 걸 보여 주려고(owner 요청 2026-10-14). 동작 줄이기면 별은 멈추고 문구만 바뀐다.
import { useEffect, useState } from "react";
import { WRITING_INTERVAL_MS, writingMessages } from "@/lib/report/writingMessages";

export function ReportWriting({ nickname, note, slowText }: { nickname: string; note: string; slowText?: string | null }) {
  const messages = writingMessages(nickname);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slowText) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % messages.length), WRITING_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slowText, messages.length]);
  return (
    <div className="report-writing" role="status" aria-live="polite">
      <div className="orbit star-orbit" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(203,178,122,.6)" strokeWidth="1.2" strokeDasharray="2 5" />
          <circle cx="60" cy="60" r="7" fill="#013566" stroke="#CBB27A" />
          <g className="spin">
            {/* 꼬리 달린 별(별똥별)이 원을 따라 돈다 */}
            <path d="M96 34.8 A44 44 0 0 1 104 60" fill="none" stroke="rgba(203,178,122,.7)" strokeWidth="3" strokeLinecap="round" />
            <path d="M104.0 50.0L106.5 56.6L113.5 56.9L108.0 61.3L109.9 68.1L104.0 64.2L98.1 68.1L100.0 61.3L94.5 56.9L101.5 56.6z" fill="#CBB27A" />
          </g>
        </svg>
      </div>
      <p key={slowText ? "slow" : i} className="writing-msg">
        {slowText ?? messages[i]}
      </p>
      {!slowText && note && <p className="writing-note">{note}</p>}
    </div>
  );
}
