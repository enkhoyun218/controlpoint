"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import SoDGraph from "@/components/SoDGraph";
import { SeverityPill } from "@/components/StatusPills";
import { Card } from "@/components/ui";
import type { GraphLink, GraphNode, SodViolation } from "@/lib/sod";

export default function SoDExplorer({
  violations,
  nodes,
  links,
  roleDescriptions,
  permissionCatalogue,
}: {
  violations: SodViolation[];
  nodes: GraphNode[];
  links: GraphLink[];
  roleDescriptions: Record<string, string>;
  permissionCatalogue: Record<string, string>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [severity, setSeverity] = useState<"all" | "high" | "medium">("all");

  const filtered = useMemo(() => {
    let out = violations;
    if (severity !== "all") out = out.filter((v) => v.severity === severity);
    if (selected?.startsWith("u:")) {
      const userId = selected.slice(2);
      out = out.filter((v) => v.userId === userId);
    } else if (selected?.startsWith("p:")) {
      const permission = selected.slice(2);
      out = out.filter(
        (v) => v.permissionA === permission || v.permissionB === permission,
      );
    }
    return out;
  }, [violations, severity, selected]);

  const selectedLabel = selected
    ? (nodes.find((n) => n.id === selected)?.label ?? null)
    : null;

  return (
    <div className="space-y-4">
      <Card
        title="Conflict graph"
        subtitle="Each line is one person holding one half of a conflicting pair. A person connected to two permissions joined by a rule is a violation."
      >
        <SoDGraph
          nodes={nodes}
          links={links}
          selected={selected}
          onSelect={setSelected}
        />
      </Card>

      <Card
        title="Violations"
        subtitle="Every user holding both halves of a conflict, the roles that granted each half, and why it matters"
        right={
          <div className="flex items-center gap-2">
            {(["all", "high", "medium"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSeverity(level)}
                aria-pressed={severity === level}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${
                  severity === level
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                {level === "all" ? "All severities" : level}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        {selectedLabel ? (
          <div className="flex items-center gap-2 border-b border-line bg-accent-soft px-5 py-2 text-xs text-accent">
            Filtered to{" "}
            <span className="font-semibold">{selectedLabel}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <X className="h-3 w-3" aria-hidden />
              clear
            </button>
          </div>
        ) : null}

        <ul className="divide-y divide-line">
          {filtered.map((v) => (
            <li key={`${v.userId}-${v.ruleId}`} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div>
                  <p className="text-sm font-semibold">
                    {v.name}
                    <span className="num ml-2 text-[11px] font-normal text-ink-muted">
                      {v.userId} · {v.title} · {v.department}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {v.ruleId} — {v.ruleTitle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <SeverityPill severity={v.severity} />
                  {v.mappedCriteria.map((c) => (
                    <span
                      key={c}
                      className="num rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-line ring-inset"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <PermissionSide
                  permission={v.permissionA}
                  roles={v.viaRolesA}
                  roleDescriptions={roleDescriptions}
                  permissionCatalogue={permissionCatalogue}
                />
                <PermissionSide
                  permission={v.permissionB}
                  roles={v.viaRolesB}
                  roleDescriptions={roleDescriptions}
                  permissionCatalogue={permissionCatalogue}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-ink-muted">
                <span className="font-semibold text-ink">Why it matters: </span>
                {v.rationale}
              </p>
              {v.accessNote ? (
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  <span className="font-semibold text-ink">
                    How the access arose:{" "}
                  </span>
                  {v.accessNote}
                </p>
              ) : null}
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-ink-muted">
              No violations match this filter.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}

function PermissionSide({
  permission,
  roles,
  roleDescriptions,
  permissionCatalogue,
}: {
  permission: string;
  roles: string[];
  roleDescriptions: Record<string, string>;
  permissionCatalogue: Record<string, string>;
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2.5">
      <p className="font-mono text-xs font-semibold text-ink">{permission}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">
        {permissionCatalogue[permission] ?? ""}
      </p>
      <p className="mt-2 text-[11px] text-ink-muted">
        <span className="font-semibold text-ink">Granted via </span>
        {roles.map((role, i) => (
          <span key={role}>
            {i > 0 ? ", " : ""}
            <span className="font-mono font-medium text-ink">{role}</span>
            {roleDescriptions[role] ? ` (${roleDescriptions[role]})` : ""}
          </span>
        ))}
      </p>
    </div>
  );
}
