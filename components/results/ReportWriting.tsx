"use client";
// 결제 후 리포트를 쓰는 동안 잠긴 섹션 가운데에 뜨는 안내: 여러 궤도를 도는 별들 + 3초마다 바뀌는(은은하게 깜빡이는) 문구.
// 화면이 멈춘 게 아니라 쓰는 중이라는 걸 보여 주려고(owner 2026-10-14). 동작 줄이기면 별은 멈추고 문구만 바뀐다.
import { useEffect, useState } from "react";
import { WRITING_INTERVAL_MS, writingMessages } from "@/lib/report/writingMessages";

/** 작은 안내(owner 문구 2026-10-14) — 결과 화면은 리포트가 다 되면 자동으로 채워진다 */
export const WRITING_NOTE = "약 30초 정도 걸리고, 다 만들어지면 자동으로 연결돼요.\n만약 바로 연결되지 않을 경우, 새로고침을 눌러주세요.";

export function ReportWriting({ nickname, slowText }: { nickname: string; slowText?: string | null }) {
  const messages = writingMessages(nickname);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slowText) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % messages.length), WRITING_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slowText, messages.length]);
  return (
    <div className="report-writing" role="status" aria-live="polite">
      <div className="star-orbit" aria-hidden="true">
        <svg viewBox="0 0 160 160">
          <defs>
            <radialGradient id="rw-glow">
              <stop offset="0" stopColor="#F3DFA6" stopOpacity=".95" />
              <stop offset=".45" stopColor="#CBB27A" stopOpacity=".45" />
              <stop offset="1" stopColor="#CBB27A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="tw" cx="22" cy="26" r="1.6" fill="#FDF6E9" style={{ animationDelay: "0s" }} />
          <circle className="tw" cx="138" cy="22" r="1.3" fill="#FDF6E9" style={{ animationDelay: "0.6s" }} />
          <circle className="tw" cx="150" cy="132" r="1.7" fill="#FDF6E9" style={{ animationDelay: "1.1s" }} />
          <circle className="tw" cx="18" cy="128" r="1.2" fill="#FDF6E9" style={{ animationDelay: "1.6s" }} />
          <circle className="tw" cx="80" cy="8" r="1.1" fill="#FDF6E9" style={{ animationDelay: "0.3s" }} />
          <circle className="tw" cx="6" cy="80" r="1.4" fill="#FDF6E9" style={{ animationDelay: "0.9s" }} />
          <circle className="tw" cx="122" cy="152" r="1.2" fill="#FDF6E9" style={{ animationDelay: "1.4s" }} />
          <circle className="tw" cx="40" cy="150" r="1.5" fill="#FDF6E9" style={{ animationDelay: "0.2s" }} />
          <g className="ring-rev">
            <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(203,178,122,.55)" strokeWidth="1.2" strokeDasharray="1.5 6" />
          </g>
          <circle cx="80" cy="80" r="44" fill="none" stroke="rgba(1,53,102,.22)" strokeWidth="1" />
          <circle cx="80" cy="80" r="26" fill="none" stroke="rgba(203,178,122,.35)" strokeWidth="1" />
          <circle className="core-glow" cx="80" cy="80" r="20" fill="url(#rw-glow)" />
          <circle cx="80" cy="80" r="7" fill="#013566" stroke="#CBB27A" strokeWidth="1.5" />
          <g className="orb orb-a">
            <path d="M129.0 38.9 A64 64 0 0 1 144 80" fill="none" stroke="rgba(203,178,122,.75)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M144.0 71.0L146.2 76.9L152.6 77.2L147.6 81.2L149.3 87.3L144.0 83.8L138.7 87.3L140.4 81.2L135.4 77.2L141.8 76.9z" fill="#E8C878" stroke="#FDF6E9" strokeWidth=".8" />
          </g>
          <g className="orb orb-b">
            <path d="M80.0 30.5L81.4 34.1L85.2 34.3L82.2 36.7L83.2 40.4L80.0 38.3L76.8 40.4L77.8 36.7L74.8 34.3L78.6 34.1z" fill="#013566" />
          </g>
          <g className="orb orb-c">
            <circle cx="106" cy="80" r="3" fill="#CBB27A" />
          </g>
        </svg>
      </div>
      <p key={slowText ? "slow" : i} className="writing-msg">
        {slowText ?? messages[i]}
      </p>
      {!slowText && <p className="writing-note">{WRITING_NOTE}</p>}
    </div>
  );
}
