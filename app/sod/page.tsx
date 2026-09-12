import { AlertTriangle, Network, ShieldAlert, Users } from "lucide-react";

import KpiCard from "@/components/KpiCard";
import SoDExplorer from "@/components/SoDExplorer";
import { Card, MethodNote, PageHeader } from "@/components/ui";
import {
  getPermissionCatalogue,
  getRoleDescriptions,
  getRoles,
  getSodRules,
  getUsers,
} from "@/lib/data";
import {
  buildConflictGraph,
  detectViolations,
  summarizeViolations,
} from "@/lib/sod";

export const metadata = {
  title: "Segregation of duties analyzer — ControlPoint",
};

export default function SodPage() {
  const users = getUsers();
  const roles = getRoles();
  const rules = getSodRules();

  const violations = detectViolations(users, roles, rules);
  const summary = summarizeViolations(violations, users);
  const graph = buildConflictGraph(violations);

  return (
    <>
      <PageHeader
        eyebrow="Segregation of duties"
        title="Access conflict analyzer"
        intro={`Segregation of duties is an IT general control: no one person should be able to run a sensitive transaction end to end. This view expands every employee's roles into the permissions they really grant, then checks each person against a ${rules.length}-rule conflict matrix. Conflicts are judged on combined access, because the dangerous pairs usually come from two individually reasonable roles.`}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Access conflicts found"
          value={summary.totalViolations}
          tone="bad"
          icon={<Network className="h-4 w-4" />}
          note={`Across ${summary.byRule.length} of ${rules.length} conflict rules`}
        />
        <KpiCard
          label="High severity"
          value={summary.bySeverity.high}
          tone="bad"
          icon={<ShieldAlert className="h-4 w-4" />}
          note={`Plus ${summary.bySeverity.medium} medium-severity conflicts`}
        />
        <KpiCard
          label="Users with a conflict"
          value={`${summary.usersWithConflicts}`}
          tone="warn"
          icon={<Users className="h-4 w-4" />}
          note={`Of ${summary.usersReviewed} employees reviewed · ${summary.cleanUsers} clean`}
        />
        <KpiCard
          label="Criteria affected"
          value={summary.mappedCriteria.length}
          tone="warn"
          icon={<AlertTriangle className="h-4 w-4" />}
          note={summary.mappedCriteria.join(", ")}
        />
      </div>

      <Card
        title="Why an auditor cares about this"
        className="mb-5"
        bodyClassName="p-5 text-sm leading-6 text-ink-muted"
      >
        <p>
          Access conflicts get tested under{" "}
          <span className="font-semibold text-ink">
            CC6 — Logical and Physical Access
          </span>
          , where access is meant to follow roles and least privilege, and under{" "}
          <span className="font-semibold text-ink">
            CC5 — Control Activities
          </span>
          , which expects duties to be split so no one person controls a whole
          transaction. Where payments are involved they also hit{" "}
          <span className="font-semibold text-ink">
            PI1 — Processing Integrity
          </span>
          , because a self-approved payment was never really authorized.
        </p>
        <p className="mt-3">
          A finding here usually isn&apos;t about a dishonest employee. It&apos;s
          about a control that can&apos;t work: when one person can both create a
          payee and release money to it, the approval step stops being a control,
          and you lose the ability to say the transaction was reviewed. Auditors
          look for these because they&apos;re cheap to spot in an access listing
          and expensive to explain after a loss. In a Type II the bar is higher
          still — not just whether the conflict exists today, but whether it
          existed all period.
        </p>
        <p className="mt-3">
          {summary.usersWithConflicts} of {summary.usersReviewed} employees hold
          at least one conflicting pair, {summary.bySeverity.high} of the{" "}
          {summary.totalViolations} findings at high severity. Two related
          controls in your register are already weak:{" "}
          <span className="font-semibold text-ink">
            the SoD matrix is defined but not monitored
          </span>
          , and{" "}
          <span className="font-semibold text-ink">
            quarterly access reviews weren&apos;t performed for the period
          </span>
          . The conflicts below are the direct result.
        </p>
      </Card>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card
          title="Conflicts by rule"
          subtitle="Is this one bad role, or a systemic design problem?"
        >
          <ul className="space-y-2.5">
            {summary.byRule.map((rule) => {
              const width = (rule.count / summary.byRule[0].count) * 100;
              return (
                <li key={rule.ruleId}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium">
                      <span className="num text-ink-muted">{rule.ruleId}</span>{" "}
                      {rule.ruleTitle}
                    </span>
                    <span className="num shrink-0 font-semibold">
                      {rule.count}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-canvas">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${width}%`,
                        background:
                          rule.severity === "high" ? "#be123c" : "#b45309",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="Most conflicted individuals"
          subtitle="Where to start remediation"
        >
          <ul className="divide-y divide-line">
            {summary.topOffenders.slice(0, 6).map((offender) => (
              <li
                key={offender.userId}
                className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span>
                  <span className="font-medium">{offender.name}</span>
                  <span className="block text-[11px] text-ink-muted">
                    {offender.title} · {offender.department}
                  </span>
                </span>
                <span className="num shrink-0 text-right text-xs">
                  <span className="font-semibold">{offender.violations}</span>{" "}
                  conflict{offender.violations === 1 ? "" : "s"}
                  <span className="block text-[11px] text-ink-muted">
                    {offender.highSeverity} high
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <SoDExplorer
        violations={violations}
        nodes={graph.nodes}
        links={graph.links}
        roleDescriptions={getRoleDescriptions()}
        permissionCatalogue={getPermissionCatalogue()}
      />

      <MethodNote>
        Method: a user&apos;s effective permissions are the union of everything
        their roles grant. A violation is logged when someone holds both
        permissions named in a conflict rule, and the granting roles are kept so
        the finding traces back to a specific entitlement. Employees, roles, and
        entitlements are synthetic; no real access listing was used.
      </MethodNote>
    </>
  );
}
