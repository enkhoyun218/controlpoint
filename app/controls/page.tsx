import ControlsTable, { type ControlRow } from "@/components/ControlsTable";
import { MethodNote, PageHeader } from "@/components/ui";
import {
  categoryOf,
  daysSinceTested,
  formatDate,
  getAsOfDate,
  getCompany,
  getControls,
} from "@/lib/data";

export const metadata = {
  title: "Control register — ControlPoint",
};

export default function ControlsPage() {
  const company = getCompany();
  const controls = getControls();
  const asOf = getAsOfDate();

  const rows: ControlRow[] = controls.map((control) => ({
    id: control.id,
    title: control.title,
    description: control.description,
    criteria: control.criteria,
    categories: Array.from(new Set(control.criteria.map(categoryOf))),
    status: control.status,
    evidence: control.evidence,
    evidenceType: control.evidenceType,
    owner: control.owner,
    frequency: control.frequency,
    lastTested: control.lastTested,
    lastTestedLabel: formatDate(control.lastTested),
    daysSinceTested: daysSinceTested(control, asOf),
    expectedEvidenceIntervalDays: control.expectedEvidenceIntervalDays,
    inherentRisk: control.inherentRisk,
  }));

  const categories = Array.from(
    new Set(rows.flatMap((r) => r.categories)),
  ).sort();
  const owners = Array.from(new Set(rows.map((r) => r.owner))).sort();

  return (
    <>
      <PageHeader
        eyebrow="Control register"
        title="The workpaper"
        intro="Every in-scope control: what it covers, who owns it, how often it runs, and when it was last evidenced. Rows are tinted when a control isn't fully in place, or when its evidence wouldn't hold up in a Type II. Click any row for the control's description and the evidence an auditor would ask for."
      />

      <ControlsTable rows={rows} categories={categories} owners={owners} />

      <MethodNote>
        Evidence age is measured against the assessment date,{" "}
        {formatDate(company.asOfDate)}. A control gets flagged when its last
        evidence is older than its cadence implies — a continuous control needs
        fresh proof, an annual one doesn&apos;t. All {rows.length} controls and
        their results are synthetic.
      </MethodNote>
    </>
  );
}
