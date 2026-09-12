/**
 * Semicircular readiness gauge with an optional peer-median tick.
 * Plain SVG so it renders on the server with no layout shift.
 */

const R = 78;
const STROKE = 16;
const CX = 100;
const CY = 100;

function polar(value: number) {
  // 0% sits at 180deg (left), 100% at 0deg (right).
  const angle = Math.PI * (1 - Math.min(Math.max(value, 0), 100) / 100);
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

function arcPath(from: number, to: number) {
  const a = polar(from);
  const b = polar(to);
  // The gauge spans a half circle, so no sweep here can exceed 180 degrees and
  // the large-arc flag is always 0.
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function readinessBand(value: number) {
  if (value >= 80)
    return { label: "Approaching audit-ready", color: "#047857", tone: "good" as const };
  if (value >= 60)
    return { label: "Material gaps remain", color: "#b45309", tone: "warn" as const };
  return { label: "Not close to examination", color: "#be123c", tone: "bad" as const };
}

export default function ReadinessGauge({
  value,
  benchmark,
}: {
  value: number;
  benchmark?: number;
}) {
  const band = readinessBand(value);
  const tick = benchmark !== undefined ? polar(benchmark) : null;
  const tickInner =
    benchmark !== undefined
      ? {
          x: CX + (R - STROKE / 2 - 3) * Math.cos(Math.PI * (1 - benchmark / 100)),
          y: CY - (R - STROKE / 2 - 3) * Math.sin(Math.PI * (1 - benchmark / 100)),
        }
      : null;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 120"
        className="w-full max-w-[260px]"
        role="img"
        aria-label={`Estimated readiness ${value.toFixed(0)} percent — ${band.label}`}
      >
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="#e9edf2"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={arcPath(0, Math.max(value, 0.5))}
          fill="none"
          stroke={band.color}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {tick && tickInner ? (
          <line
            x1={tickInner.x}
            y1={tickInner.y}
            x2={tick.x + (tick.x - tickInner.x) * 0.25}
            y2={tick.y + (tick.y - tickInner.y) * 0.25}
            stroke="#101828"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : null}
        <text
          x={CX}
          y={92}
          textAnchor="middle"
          className="num"
          fontSize="34"
          fontWeight="600"
          fill="#101828"
        >
          {value.toFixed(0)}%
        </text>
        <text x={22} y={116} textAnchor="middle" fontSize="9" fill="#8a93a2">
          0
        </text>
        <text x={178} y={116} textAnchor="middle" fontSize="9" fill="#8a93a2">
          100
        </text>
      </svg>

      <p className="mt-1 text-sm font-semibold" style={{ color: band.color }}>
        {band.label}
      </p>
      {benchmark !== undefined ? (
        <p className="num mt-1 text-[11px] text-ink-muted">
          Black tick = peer median {benchmark}%
        </p>
      ) : null}
    </div>
  );
}
