import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import AdminDashboard from "./AdminDashboard";
import AdminGate from "./AdminGate";

export const metadata: Metadata = { title: "관리자", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-8 text-cream">
      <div className="flex flex-col gap-4 px-4">
        <AdminGate next="/admin">
          <AdminDashboard />
        </AdminGate>
      </div>
      <AuthFooterLink />
      <SiteFooter />
    </main>
  );
}
