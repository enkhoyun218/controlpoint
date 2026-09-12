import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type Tone = "good" | "warn" | "bad" | "neutral";

const ACCENT: Record<Tone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-rose-700",
  neutral: "text-ink",
};

export default function KpiCard({
  label,
  value,
  unit,
  note,
  tone = "neutral",
  icon,
  href,
  linkLabel,
}: {
  label: string;
  value: string | number;
  unit?: string;
  note?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        {icon ? <span className="text-ink-muted">{icon}</span> : null}
      </div>
      <p className={`num mt-2 text-3xl font-semibold tracking-tight ${ACCENT[tone]}`}>
        {value}
        {unit ? (
          <span className="ml-0.5 text-lg font-medium">{unit}</span>
        ) : null}
      </p>
      {note ? (
        <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">{note}</p>
      ) : null}
      {href ? (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
          {linkLabel ?? "View"}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className =
    "block rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

  return href ? (
    <Link href={href} className={`${className} transition-colors hover:border-[#bcd7e2]`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
