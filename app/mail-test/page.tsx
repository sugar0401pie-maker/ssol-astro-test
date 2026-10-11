import type { Metadata } from "next";
import MailTest from "./MailTest";

export const metadata: Metadata = { title: "메일 시험 — 쏠 아스트로 하우스", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="screen on">
      <MailTest />
    </main>
  );
}
