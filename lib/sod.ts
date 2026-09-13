/**
 * Segregation of Duties analyzer.
 *
 * This is an IT general control test an auditor would run by hand against an
 * access listing: expand every user's roles into the permissions those roles
 * actually grant, then check each user against a conflict matrix. Holding both
 * halves of a conflicting pair means one person can complete a sensitive
 * transaction end to end with nobody else in the loop.
 *
 * Conflicts are evaluated on *effective* permissions — the union across all of
 * a user's roles — because that is how access really works. Two individually
 * reasonable roles can combine into a toxic pair, which is precisely the thing
 * a role-by-role review misses.
 *
 * Pure functions: no dates, no I/O, no randomness.
 */

import type { Severity, SodRule, User } from "./data";

export type EffectivePermission = {
  permission: string;
  /** Which of the user's roles grant it — a user can inherit the same permission twice. */
  viaRoles: string[];
};

export type SodViolation = {
  userId: string;
  name: string;
  department: string;
  title: string;
  ruleId: string;
  ruleTitle: string;
  permissionA: string;
  permissionB: string;
  viaRolesA: string[];
  viaRolesB: string[];
  severity: Severity;
  rationale: string;
  mappedCriteria: string[];
  accessNote?: string;
};

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/** Union of the permissions granted by a user's roles, with the granting roles kept for the audit trail. */
export function effectivePermissions(
  user: User,
  roles: Record<string, string[]>,
): EffectivePermission[] {
  const grants = new Map<string, string[]>();
  for (const role of user.roles) {
    for (const permission of roles[role] ?? []) {
      const existing = grants.get(permission);
      if (existing) existing.push(role);
      else grants.set(permission, [role]);
    }
  }
  return Array.from(grants, ([permission, viaRoles]) => ({
    permission,
    viaRoles,
  })).sort((a, b) => a.permission.localeCompare(b.permission));
}

export function detectViolations(
  users: User[],
  roles: Record<string, string[]>,
  rules: SodRule[],
): SodViolation[] {
  const violations: SodViolation[] = [];

  for (const user of users) {
    const granted = new Map(
      effectivePermissions(user, roles).map((p) => [p.permission, p.viaRoles]),
    );

    for (const rule of rules) {
      const viaRolesA = granted.get(rule.permissionA);
      const viaRolesB = granted.get(rule.permissionB);
      if (!viaRolesA || !viaRolesB) continue;

      violations.push({
        userId: user.userId,
        name: user.name,
        department: user.department,
        title: user.title,
        ruleId: rule.id,
        ruleTitle: rule.title,
        permissionA: rule.permissionA,
        permissionB: rule.permissionB,
        viaRolesA,
        viaRolesB,
        severity: rule.severity,
        rationale: rule.rationale,
        mappedCriteria: rule.mappedCriteria,
        accessNote: user.accessNote,
      });
    }
  }

  return violations.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.userId.localeCompare(b.userId) ||
      a.ruleId.localeCompare(b.ruleId),
  );
}

export type SodSummary = {
  totalViolations: number;
  bySeverity: Record<Severity, number>;
  usersWithConflicts: number;
  usersReviewed: number;
  cleanUsers: number;
  /** Rules that fired, most-hit first — tells you whether this is one bad role or a systemic design problem. */
  byRule: {
    ruleId: string;
    ruleTitle: string;
    severity: Severity;
    count: number;
  }[];
  byDepartment: { department: string; users: number; violations: number }[];
  topOffenders: {
    userId: string;
    name: string;
    title: string;
    department: string;
    violations: number;
    highSeverity: number;
  }[];
  /** Every criterion these findings touch, for the "what does this mean for the audit" line. */
  mappedCriteria: string[];
};

export function summarizeViolations(
  violations: SodViolation[],
  users: User[],
): SodSummary {
  const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const v of violations) bySeverity[v.severity] += 1;

  const ruleMap = new Map<string, SodSummary["byRule"][number]>();
  for (const v of violations) {
    const existing = ruleMap.get(v.ruleId);
    if (existing) existing.count += 1;
    else
      ruleMap.set(v.ruleId, {
        ruleId: v.ruleId,
        ruleTitle: v.ruleTitle,
        severity: v.severity,
        count: 1,
      });
  }

  const offenderMap = new Map<string, SodSummary["topOffenders"][number]>();
  for (const v of violations) {
    const existing = offenderMap.get(v.userId);
    if (existing) {
      existing.violations += 1;
      if (v.severity === "high") existing.highSeverity += 1;
    } else {
      offenderMap.set(v.userId, {
        userId: v.userId,
        name: v.name,
        title: v.title,
        department: v.department,
        violations: 1,
        highSeverity: v.severity === "high" ? 1 : 0,
      });
    }
  }

  const deptMap = new Map<string, { users: Set<string>; violations: number }>();
  for (const v of violations) {
    const entry = deptMap.get(v.department) ?? {
      users: new Set<string>(),
      violations: 0,
    };
    entry.users.add(v.userId);
    entry.violations += 1;
    deptMap.set(v.department, entry);
  }

  const usersWithConflicts = offenderMap.size;

  return {
    totalViolations: violations.length,
    bySeverity,
    usersWithConflicts,
    usersReviewed: users.length,
    cleanUsers: users.length - usersWithConflicts,
    byRule: Array.from(ruleMap.values()).sort(
      (a, b) =>
        b.count - a.count ||
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    ),
    byDepartment: Array.from(deptMap, ([department, v]) => ({
      department,
      users: v.users.size,
      violations: v.violations,
    })).sort((a, b) => b.violations - a.violations),
    topOffenders: Array.from(offenderMap.values()).sort(
      (a, b) =>
        b.highSeverity - a.highSeverity ||
        b.violations - a.violations ||
        a.name.localeCompare(b.name),
    ),
    mappedCriteria: Array.from(
      new Set(violations.flatMap((v) => v.mappedCriteria)),
    ).sort(),
  };
}

// ---------------------------------------------------------------------------
// Conflict graph
// ---------------------------------------------------------------------------

export type GraphNode = {
  id: string;
  label: string;
  kind: "user" | "permission";
  /** Users: number of violations they are in. Permissions: number of violating users holding it. */
  degree: number;
  severity: Severity;
  sublabel?: string;
};

export type GraphLink = {
  source: string;
  target: string;
  severity: Severity;
  ruleId: string;
};

/**
 * Users on one side, the conflicting permissions on the other. Only users who
 * actually violate a rule are included — a graph of all 62 employees would be
 * unreadable and would not be what an auditor asks to see.
 */
export function buildConflictGraph(violations: SodViolation[]): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const users = new Map<string, GraphNode>();
  const permissions = new Map<string, GraphNode>();
  const links = new Map<string, GraphLink>();

  const worse = (a: Severity, b: Severity) =>
    SEVERITY_ORDER[a] <= SEVERITY_ORDER[b] ? a : b;

  for (const v of violations) {
    const userId = `u:${v.userId}`;
    const existingUser = users.get(userId);
    if (existingUser) {
      existingUser.severity = worse(existingUser.severity, v.severity);
    } else {
      users.set(userId, {
        id: userId,
        label: v.name,
        sublabel: v.title,
        kind: "user",
        degree: 0,
        severity: v.severity,
      });
    }

    for (const permission of [v.permissionA, v.permissionB]) {
      const pid = `p:${permission}`;
      const existing = permissions.get(pid);
      if (existing) {
        existing.severity = worse(existing.severity, v.severity);
      } else {
        permissions.set(pid, {
          id: pid,
          label: permission,
          kind: "permission",
          degree: 0,
          severity: v.severity,
        });
      }

      const key = `${userId}|${pid}`;
      const link = links.get(key);
      if (link) link.severity = worse(link.severity, v.severity);
      else
        links.set(key, {
          source: userId,
          target: pid,
          severity: v.severity,
          ruleId: v.ruleId,
        });
    }
  }

  // Degree is counted from the deduplicated links, not from the violations,
  // so the number on a node always equals the number of lines drawn to it.
  // One person tripping two rules that share a permission is a single line.
  for (const link of links.values()) {
    const source = users.get(link.source);
    if (source) source.degree += 1;
    const target = permissions.get(link.target);
    if (target) target.degree += 1;
  }

  return {
    nodes: [
      ...Array.from(users.values()).sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          b.degree - a.degree ||
          a.label.localeCompare(b.label),
      ),
      ...Array.from(permissions.values()).sort(
        (a, b) => b.degree - a.degree || a.label.localeCompare(b.label),
      ),
    ],
    links: Array.from(links.values()),
  };
}
