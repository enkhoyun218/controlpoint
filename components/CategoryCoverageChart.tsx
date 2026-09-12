"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CategoryDatum = {
  id: string;
  name: string;
  coverage: number;
  controls: number;
};

function color(v: number) {
  if (v >= 80) return "#047857";
  if (v >= 60) return "#b45309";
  return "#be123c";
}

type TooltipPayload = { payload: CategoryDatum }[];

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">
        {d.id} · {d.name}
      </p>
      <p className="num mt-0.5 text-ink-muted">
        {d.coverage.toFixed(0)}% coverage · {d.controls} control
        {d.controls === 1 ? "" : "s"} mapped
      </p>
    </div>
  );
}

export default function CategoryCoverageChart({
  data,
  benchmark,
}: {
  data: CategoryDatum[];
  benchmark?: number;
}) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
          barCategoryGap={6}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#5a6474" }}
            axisLine={{ stroke: "#e3e7ed" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="id"
            width={46}
            tick={{ fontSize: 11, fill: "#101828", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(16,24,40,0.04)" }}
          />
          {benchmark !== undefined ? (
            <ReferenceLine
              x={benchmark}
              stroke="#101828"
              strokeDasharray="4 3"
              label={{
                value: `peer ${benchmark}%`,
                position: "top",
                fontSize: 10,
                fill: "#5a6474",
              }}
            />
          ) : null}
          <Bar dataKey="coverage" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={color(d.coverage)} />
            ))}
            <LabelList
              dataKey="coverage"
              position="right"
              formatter={(v) => `${Math.round(Number(v))}%`}
              style={{ fontSize: 11, fill: "#5a6474" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
