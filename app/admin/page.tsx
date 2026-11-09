import type { Metadata } from "next";
import AdminDashboard from "./AdminDashboard";

export const metadata: Metadata = { title: "관리자", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 px-4 pb-10 pt-8 text-cream">
      <AdminDashboard />
    </main>
  );
}
