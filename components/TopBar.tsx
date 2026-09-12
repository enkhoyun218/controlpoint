import { ShieldCheck } from "lucide-react";

type Props = {
  company?: string;
  reportType?: string;
  periodStart?: string;
  periodEnd?: string;
};

function fmt(date?: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function TopBar({
  company,
  reportType,
  periodStart,
  periodEnd,
}: Props) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">
              ControlPoint
            </p>
            <p className="text-[11px] text-ink-muted">
              SOC 2 readiness advisor
            </p>
          </div>
        </div>

        {company ? (
          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
            <div>
              <span className="text-ink-muted">Entity </span>
              <span className="font-semibold">{company}</span>
            </div>
            <div>
              <span className="text-ink-muted">Examination </span>
              <span className="font-semibold">{reportType}</span>
            </div>
            {periodStart && periodEnd ? (
              <div className="num">
                <span className="text-ink-muted">Period </span>
                <span className="font-semibold">
                  {fmt(periodStart)} – {fmt(periodEnd)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
