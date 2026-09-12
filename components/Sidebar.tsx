"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Grid3x3,
  Table2,
  Network,
  ListChecks,
  MessageSquareText,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/criteria", label: "Trust Criteria", icon: Grid3x3 },
  { href: "/controls", label: "Controls", icon: Table2 },
  { href: "/sod", label: "SoD Analyzer", icon: Network, badge: "NEW" },
  { href: "/remediation", label: "Remediation", icon: ListChecks },
  { href: "/advisor", label: "Ask the Advisor", icon: MessageSquareText },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:sticky md:top-0 md:h-[100dvh] md:w-60 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-4"
    >
      <p className="mb-2 hidden px-2 text-[11px] font-semibold tracking-wider text-ink-muted uppercase md:block">
        Readiness
      </p>
      {NAV.map(({ href, label, icon: Icon, ...rest }) => {
        const badge = "badge" in rest ? rest.badge : undefined;
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent-soft font-semibold text-accent"
                : "text-ink-muted hover:bg-canvas hover:text-ink",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
            {badge ? (
              <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}

      <div className="mt-auto hidden px-2 pt-6 md:block">
        <p className="text-[11px] leading-4 text-ink-muted">
          Synthetic dataset · SOC 2 Type II readiness concept
        </p>
      </div>
    </nav>
  );
}
