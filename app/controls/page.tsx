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
        intro={
          <>
            Every control in scope, what it addresses, who owns it, how often it
            runs, and when it was last evidenced. Rows are tinted when a control
            is not fully implemented or its evidence would not support a Type II
            opinion. Click any row for the control description and the evidence
            an auditor would ask for.
          </>
        }
      />

      <ControlsTable rows={rows} categories={categories} owners={owners} />

      <MethodNote>
        Evidence age is measured against {formatDate(company.asOfDate)}, the
        assessment date. A control is flagged when its last evidence is older
        than the interval implied by its frequency — a continuous control needs
        recent proof, an annual one does not. All {rows.length} controls and
        their test results are synthetic.
      </MethodNote>
    </>
  );
}
