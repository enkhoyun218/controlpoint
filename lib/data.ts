/**
 * Typed loaders over the synthetic dataset in /data.
 *
 * The JSON is generated once by scripts/gen_data.py and imported statically, so
 * every page can be prerendered and there is no database or runtime parsing.
 */

import companyJson from "@/data/company.json";
import criteriaJson from "@/data/criteria.json";
import controlsJson from "@/data/controls.json";
import usersJson from "@/data/users.json";
import permissionsJson from "@/data/permissions.json";
import sodRulesJson from "@/data/sod_rules.json";
import benchmarkJson from "@/data/benchmark.json";

export type ControlStatus = "implemented" | "partial" | "not_implemented";
export type EvidenceStatus = "current" | "stale" | "missing";
export type RiskLevel = "high" | "medium" | "low";
export type Severity = "high" | "medium" | "low";

export type Control = {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  status: ControlStatus;
  evidence: EvidenceStatus;
  evidenceType: string;
  owner: string;
  frequency: string;
  lastTested: string | null;
  inherentRisk: RiskLevel;
  expectedEvidenceIntervalDays: number;
};

export type Criterion = {
  id: string;
  category: string;
  categoryName: string;
  intent: string;
};

export type CriteriaCategory = {
  id: string;
  name: string;
  tsc: string;
  summary: string;
  inScope: boolean;
};

export type TscScope = {
  code: string;
  label: string;
  required?: boolean;
  rationale: string;
};

export type Company = {
  name: string;
  legalName: string;
  industry: string;
  description: string;
  headquarters: string;
  employees: number;
  founded: number;
  reportType: string;
  auditPeriod: { start: string; end: string; months: number };
  asOfDate: string;
  priorReport: string;
  inScopeTsc: TscScope[];
  outOfScopeTsc: TscScope[];
  scopingNote: string;
  typeIiNote: string;
  subserviceOrganizations: { name: string; service: string; method: string }[];
};

export type User = {
  userId: string;
  name: string;
  department: string;
  title: string;
  roles: string[];
  accessNote?: string;
};

export type SodRule = {
  id: string;
  permissionA: string;
  permissionB: string;
  severity: Severity;
  title: string;
  rationale: string;
  mappedCriteria: string[];
};

export type Benchmark = {
  peerGroup: string;
  sampleSize: number;
  medianReadiness: number;
  topQuartileReadiness: number;
  medianOpenHighRiskGaps: number;
  medianDaysSinceEvidence: number;
  medianSodViolations: number;
  medianControlsImplementedPct: number;
  medianWeeksToAuditReady: number;
};

export function getCompany(): Company {
  return companyJson as Company;
}

export function getControls(): Control[] {
  return controlsJson.controls as Control[];
}

export function getCriteria(): Criterion[] {
  return criteriaJson.criteria as Criterion[];
}

export function getCriteriaCategories(): CriteriaCategory[] {
  return criteriaJson.categories as CriteriaCategory[];
}

export function getOutOfScopeCategories(): CriteriaCategory[] {
  return criteriaJson.outOfScopeCategories as CriteriaCategory[];
}

export function getUsers(): User[] {
  return usersJson.users as User[];
}

export function getRoles(): Record<string, string[]> {
  return permissionsJson.roles as Record<string, string[]>;
}

export function getRoleDescriptions(): Record<string, string> {
  return permissionsJson.roleDescriptions as Record<string, string>;
}

export function getPermissionCatalogue(): Record<string, string> {
  return permissionsJson.permissionCatalogue as Record<string, string>;
}

export function getSodRules(): SodRule[] {
  return sodRulesJson.rules as SodRule[];
}

export function getBenchmark(): Benchmark {
  return benchmarkJson as Benchmark;
}

/**
 * The date the assessment is run from. Pinned in the dataset so evidence-age
 * figures are reproducible rather than drifting with the current date.
 */
export function getAsOfDate(): Date {
  return new Date(`${getCompany().asOfDate}T00:00:00Z`);
}

// ---------------------------------------------------------------------------
// Small shared formatters, so numbers read the same on every tab.
// ---------------------------------------------------------------------------

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Days since a control was last evidenced, as of the assessment date. */
export function daysSinceTested(control: Control, asOf: Date): number | null {
  if (!control.lastTested) return null;
  return daysBetween(new Date(`${control.lastTested}T00:00:00Z`), asOf);
}

export const STATUS_LABEL: Record<ControlStatus, string> = {
  implemented: "Implemented",
  partial: "Partially implemented",
  not_implemented: "Not implemented",
};

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  current: "Current",
  stale: "Stale",
  missing: "Missing",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Human label for a criteria category id, e.g. "CC6" -> "Logical and Physical Access". */
export function categoryName(id: string): string {
  const all = [...getCriteriaCategories(), ...getOutOfScopeCategories()];
  return all.find((c) => c.id === id)?.name ?? id;
}

/** "CC6.2" -> "CC6" */
export function categoryOf(criterionId: string): string {
  return criterionId.split(".")[0];
}
