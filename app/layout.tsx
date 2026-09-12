import type { Metadata } from "next";
import "./globals.css";
import Banner from "@/components/Banner";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { getCompany } from "@/lib/data";

export const metadata: Metadata = {
  title: "ControlPoint — SOC 2 Type II readiness advisor",
  description:
    "An educational concept: a SOC 2 Type II readiness check over a fictional payments SaaS. See control coverage, evidence freshness, segregation-of-duties conflicts, and a prioritized fix list.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const company = getCompany();
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Banner />
        <TopBar
          company={company.name}
          reportType={company.reportType}
          periodStart={company.auditPeriod.start}
          periodEnd={company.auditPeriod.end}
        />
        <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
