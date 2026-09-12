"use client";

import type { GraphLink, GraphNode } from "@/lib/sod";

/**
 * Bipartite conflict graph: violating users on the left, the permissions that
 * conflict on the right. Positions are computed deterministically rather than
 * by force simulation — an auditor needs to find the same person in the same
 * place every time they open the page, and a jittering cloud of nodes is not a
 * workpaper.
 *
 * Only users who actually violate a rule appear. Drawing all 62 employees would
 * bury the finding.
 */

const ROW = 34;
const TOP = 26;
const USER_X = 300;
const PERM_X = 560;
const WIDTH = 860;

const SEVERITY_COLOR = {
  high: "#be123c",
  medium: "#b45309",
  low: "#5a6474",
} as const;

export default function SoDGraph({
  nodes,
  links,
  selected,
  onSelect,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const users = nodes.filter((n) => n.kind === "user");
  const permissions = nodes.filter((n) => n.kind === "permission");

  const y = new Map<string, number>();
  users.forEach((n, i) => y.set(n.id, TOP + i * ROW));
  permissions.forEach((n, i) => y.set(n.id, TOP + i * ROW));

  const height = TOP + Math.max(users.length, permissions.length) * ROW + 10;

  const connected = new Set<string>();
  if (selected) {
    connected.add(selected);
    for (const link of links) {
      if (link.source === selected) connected.add(link.target);
      if (link.target === selected) connected.add(link.source);
    }
  }

  const isDim = (id: string) => selected !== null && !connected.has(id);
  const linkDim = (link: GraphLink) =>
    selected !== null && link.source !== selected && link.target !== selected;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="min-w-[720px]"
        style={{ height }}
        role="img"
        aria-label={`Conflict graph: ${users.length} users linked to ${permissions.length} conflicting permissions`}
      >
        <text x={USER_X} y={14} textAnchor="end" fontSize="10" fill="#8a93a2">
          USERS WITH CONFLICTS
        </text>
        <text x={PERM_X} y={14} fontSize="10" fill="#8a93a2">
          CONFLICTING PERMISSIONS
        </text>

        {links.map((link) => {
          const y1 = y.get(link.source) ?? 0;
          const y2 = y.get(link.target) ?? 0;
          const mid = (USER_X + PERM_X) / 2;
          const dim = linkDim(link);
          return (
            <path
              key={`${link.source}-${link.target}`}
              d={`M ${USER_X + 8} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${PERM_X - 8} ${y2}`}
              fill="none"
              stroke={SEVERITY_COLOR[link.severity]}
              strokeWidth={dim ? 1 : 1.6}
              opacity={dim ? 0.12 : selected ? 0.85 : 0.4}
            />
          );
        })}

        {users.map((node) => {
          const cy = y.get(node.id) ?? 0;
          const active = selected === node.id;
          return (
            <g
              key={node.id}
              onClick={() => onSelect(active ? null : node.id)}
              className="cursor-pointer"
              opacity={isDim(node.id) ? 0.3 : 1}
            >
              <rect
                x={0}
                y={cy - 13}
                width={USER_X + 4}
                height={26}
                rx={6}
                fill={active ? "#e8f1f5" : "transparent"}
              />
              <text
                x={USER_X - 16}
                y={cy - 1}
                textAnchor="end"
                fontSize="11.5"
                fontWeight={active ? 700 : 600}
                fill="#101828"
              >
                {node.label}
              </text>
              <text
                x={USER_X - 16}
                y={cy + 10}
                textAnchor="end"
                fontSize="9.5"
                fill="#5a6474"
              >
                {node.sublabel}
              </text>
              <circle
                cx={USER_X}
                cy={cy}
                r={active ? 7 : 5}
                fill={SEVERITY_COLOR[node.severity]}
              />
            </g>
          );
        })}

        {permissions.map((node) => {
          const cy = y.get(node.id) ?? 0;
          const active = selected === node.id;
          return (
            <g
              key={node.id}
              onClick={() => onSelect(active ? null : node.id)}
              className="cursor-pointer"
              opacity={isDim(node.id) ? 0.3 : 1}
            >
              <rect
                x={PERM_X - 4}
                y={cy - 13}
                width={WIDTH - PERM_X + 4}
                height={26}
                rx={6}
                fill={active ? "#e8f1f5" : "transparent"}
              />
              <circle
                cx={PERM_X}
                cy={cy}
                r={active ? 6 : 4}
                fill="#101828"
              />
              <text
                x={PERM_X + 14}
                y={cy + 4}
                fontSize="11.5"
                fontWeight={active ? 700 : 500}
                fill="#101828"
                fontFamily="var(--font-mono)"
              >
                {node.label}
              </text>
              <text
                x={WIDTH - 6}
                y={cy + 4}
                textAnchor="end"
                fontSize="10"
                fill="#8a93a2"
              >
                {node.degree} link{node.degree === 1 ? "" : "s"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: SEVERITY_COLOR.high }}
          />
          High severity conflict
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: SEVERITY_COLOR.medium }}
          />
          Medium severity conflict
        </span>
        <span>Click a name or a permission to isolate it.</span>
      </div>
    </div>
  );
}
