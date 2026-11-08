import type { Metadata } from "next";
import AdminReports from "./AdminReports";

export const metadata: Metadata = { title: "리포트 다시 만들기", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 px-4 pb-10 pt-8 text-cream">
      <AdminReports />
    </main>
  );
}
