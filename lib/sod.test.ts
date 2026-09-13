import { describe, expect, it } from "vitest";
import type { SodRule, User } from "./data";
import { getRoles, getSodRules, getUsers } from "./data";
import {
  buildConflictGraph,
  detectViolations,
  effectivePermissions,
  summarizeViolations,
} from "./sod";

// A deliberately tiny fixture: one user who holds both halves of a conflict
// through two different roles, and one who does not.
const ROLES: Record<string, string[]> = {
  Vendor_Admin: ["create_vendor", "edit_vendor"],
  AP_Approver: ["approve_payment"],
  AP_Clerk: ["initiate_payment"],
  Support_Agent: ["view_customer_data"],
};

const RULES: SodRule[] = [
  {
    id: "SOD-01",
    permissionA: "create_vendor",
    permissionB: "approve_payment",
    severity: "high",
    title: "Vendor creation and payment approval",
    rationale: "Fictitious vendor fraud.",
    mappedCriteria: ["CC6.3", "CC5.2"],
  },
  {
    id: "SOD-02",
    permissionA: "initiate_payment",
    permissionB: "approve_payment",
    severity: "high",
    title: "Payment initiation and approval",
    rationale: "Self-approval.",
    mappedCriteria: ["CC6.3"],
  },
];

const CONFLICTED: User = {
  userId: "U-001",
  name: "Test Controller",
  department: "Finance",
  title: "Controller",
  roles: ["Vendor_Admin", "AP_Approver"],
};

const CLEAN: User = {
  userId: "U-002",
  name: "Test Clerk",
  department: "Finance",
  title: "AP Clerk",
  roles: ["AP_Clerk", "Support_Agent"],
};

describe("effectivePermissions", () => {
  it("unions the permissions across every role the user holds", () => {
    expect(
      effectivePermissions(CONFLICTED, ROLES).map((p) => p.permission),
    ).toEqual(["approve_payment", "create_vendor", "edit_vendor"]);
  });

  it("records which role granted each permission", () => {
    const grant = effectivePermissions(CONFLICTED, ROLES).find(
      (p) => p.permission === "approve_payment",
    );
    expect(grant?.viaRoles).toEqual(["AP_Approver"]);
  });

  it("keeps both roles when two roles grant the same permission", () => {
    const user: User = { ...CLEAN, roles: ["AP_Clerk", "AP_Clerk_Copy"] };
    const roles = { ...ROLES, AP_Clerk_Copy: ["initiate_payment"] };
    const grant = effectivePermissions(user, roles).find(
      (p) => p.permission === "initiate_payment",
    );
    expect(grant?.viaRoles).toEqual(["AP_Clerk", "AP_Clerk_Copy"]);
  });

  it("returns nothing for a user with no roles", () => {
    expect(effectivePermissions({ ...CLEAN, roles: [] }, ROLES)).toEqual([]);
  });

  it("ignores a role that is not in the permission map", () => {
    expect(
      effectivePermissions({ ...CLEAN, roles: ["Ghost_Role"] }, ROLES),
    ).toEqual([]);
  });
});

describe("detectViolations", () => {
  it("catches a conflict that only exists across two roles combined", () => {
    const violations = detectViolations([CONFLICTED], ROLES, RULES);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      userId: "U-001",
      ruleId: "SOD-01",
      permissionA: "create_vendor",
      permissionB: "approve_payment",
      viaRolesA: ["Vendor_Admin"],
      viaRolesB: ["AP_Approver"],
      severity: "high",
      mappedCriteria: ["CC6.3", "CC5.2"],
    });
  });

  it("leaves a clean user alone", () => {
    expect(detectViolations([CLEAN], ROLES, RULES)).toEqual([]);
  });

  it("does not fire when the user holds only one half of the pair", () => {
    const halfOnly: User = { ...CLEAN, roles: ["Vendor_Admin"] };
    expect(detectViolations([halfOnly], ROLES, RULES)).toEqual([]);
  });

  it("emits one violation per rule when a user trips several", () => {
    const both: User = {
      ...CONFLICTED,
      roles: ["Vendor_Admin", "AP_Approver", "AP_Clerk"],
    };
    const violations = detectViolations([both], ROLES, RULES);
    expect(violations.map((v) => v.ruleId)).toEqual(["SOD-01", "SOD-02"]);
  });

  it("sorts high severity ahead of medium", () => {
    const rules: SodRule[] = [
      { ...RULES[0], id: "SOD-MED", severity: "medium" },
      RULES[1],
    ];
    const user: User = {
      ...CONFLICTED,
      roles: ["Vendor_Admin", "AP_Approver", "AP_Clerk"],
    };
    expect(detectViolations([user], ROLES, rules).map((v) => v.severity)).toEqual(
      ["high", "medium"],
    );
  });
});

describe("summarizeViolations", () => {
  const users = [CONFLICTED, CLEAN];
  const summary = summarizeViolations(
    detectViolations(users, ROLES, RULES),
    users,
  );

  it("counts users with conflicts separately from users reviewed", () => {
    expect(summary.usersWithConflicts).toBe(1);
    expect(summary.usersReviewed).toBe(2);
    expect(summary.cleanUsers).toBe(1);
  });

  it("totals by severity", () => {
    expect(summary.bySeverity).toEqual({ high: 1, medium: 0, low: 0 });
  });

  it("collects the criteria the findings map to", () => {
    expect(summary.mappedCriteria).toEqual(["CC5.2", "CC6.3"]);
  });
});

describe("buildConflictGraph", () => {
  const graph = buildConflictGraph(detectViolations([CONFLICTED], ROLES, RULES));

  it("links the violating user to both conflicting permissions", () => {
    expect(graph.nodes.filter((n) => n.kind === "user")).toHaveLength(1);
    expect(graph.nodes.filter((n) => n.kind === "permission")).toHaveLength(2);
    expect(graph.links).toHaveLength(2);
  });

  it("excludes users with no conflicts", () => {
    const clean = buildConflictGraph(detectViolations([CLEAN], ROLES, RULES));
    expect(clean.nodes).toEqual([]);
    expect(clean.links).toEqual([]);
  });

  it("counts one line, not two, when a user trips two rules sharing a permission", () => {
    // Both rules name approve_payment, so this user reaches it once.
    const user: User = {
      ...CONFLICTED,
      roles: ["Vendor_Admin", "AP_Approver", "AP_Clerk"],
    };
    const g = buildConflictGraph(detectViolations([user], ROLES, RULES));
    const shared = g.nodes.find((n) => n.label === "approve_payment");
    expect(shared?.degree).toBe(1);
    expect(
      g.links.filter((l) => l.target === "p:approve_payment"),
    ).toHaveLength(1);
  });
});

describe("graph degree", () => {
  it("equals the number of lines drawn to each node, across the real dataset", () => {
    // The graph labels permission nodes with their degree, so a degree that
    // counts violations rather than links would print a number the picture
    // contradicts.
    const graph = buildConflictGraph(
      detectViolations(getUsers(), getRoles(), getSodRules()),
    );
    const drawn = new Map<string, number>();
    for (const link of graph.links) {
      drawn.set(link.source, (drawn.get(link.source) ?? 0) + 1);
      drawn.set(link.target, (drawn.get(link.target) ?? 0) + 1);
    }
    for (const node of graph.nodes) {
      expect(node.degree).toBe(drawn.get(node.id) ?? 0);
    }
  });
});

describe("the real dataset", () => {
  const users = getUsers();
  const violations = detectViolations(users, getRoles(), getSodRules());
  const summary = summarizeViolations(violations, users);

  it("finds the seeded conflicts", () => {
    expect(summary.totalViolations).toBeGreaterThanOrEqual(10);
    expect(summary.bySeverity.high).toBeGreaterThan(0);
    expect(summary.bySeverity.medium).toBeGreaterThan(0);
  });

  it("catches the Controller who also maintains the vendor master", () => {
    const finding = violations.find(
      (v) => v.title === "Controller" && v.ruleId === "SOD-01",
    );
    expect(finding).toBeDefined();
    expect(finding?.viaRolesA).toContain("Vendor_Admin");
    expect(finding?.viaRolesB).toContain("Controller_Role");
  });

  it("leaves most of the company clean", () => {
    expect(summary.cleanUsers).toBeGreaterThan(summary.usersWithConflicts);
  });

  it("maps every finding to at least one criterion", () => {
    expect(violations.every((v) => v.mappedCriteria.length > 0)).toBe(true);
  });

  it("builds a graph containing every violator", () => {
    const graph = buildConflictGraph(violations);
    expect(graph.nodes.filter((n) => n.kind === "user")).toHaveLength(
      summary.usersWithConflicts,
    );
  });
});
