import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import AdminGate from "../AdminGate";
import AdminReports from "./AdminReports";

export const metadata: Metadata = { title: "리포트 다시 만들기", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-8 text-cream">
      <div className="flex flex-col gap-4 px-4">
        <AdminGate next="/admin/reports">
          <AdminReports />
        </AdminGate>
      </div>
      <AuthFooterLink />
      <SiteFooter />
    </main>
  );
}
