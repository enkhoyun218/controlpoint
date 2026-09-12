import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  FileClock,
  FileCheck2,
  FileX2,
  XCircle,
} from "lucide-react";

import { Pill } from "@/components/ui";
import {
  EVIDENCE_LABEL,
  RISK_LABEL,
  STATUS_LABEL,
  type ControlStatus,
  type EvidenceStatus,
  type RiskLevel,
} from "@/lib/data";

/*
 * Status never relies on color alone — every pill carries an icon and a written
 * label. Auditors read the word, and color-blind readers get the same signal.
 */

export function StatusPill({ status }: { status: ControlStatus }) {
  if (status === "implemented")
    return (
      <Pill tone="good" icon={<CheckCircle2 className="h-3 w-3" />}>
        {STATUS_LABEL.implemented}
      </Pill>
    );
  if (status === "partial")
    return (
      <Pill tone="warn" icon={<CircleDashed className="h-3 w-3" />}>
        {STATUS_LABEL.partial}
      </Pill>
    );
  return (
    <Pill tone="bad" icon={<XCircle className="h-3 w-3" />}>
      {STATUS_LABEL.not_implemented}
    </Pill>
  );
}

export function EvidencePill({ evidence }: { evidence: EvidenceStatus }) {
  if (evidence === "current")
    return (
      <Pill tone="good" icon={<FileCheck2 className="h-3 w-3" />}>
        {EVIDENCE_LABEL.current}
      </Pill>
    );
  if (evidence === "stale")
    return (
      <Pill tone="warn" icon={<FileClock className="h-3 w-3" />}>
        {EVIDENCE_LABEL.stale}
      </Pill>
    );
  return (
    <Pill tone="bad" icon={<FileX2 className="h-3 w-3" />}>
      {EVIDENCE_LABEL.missing}
    </Pill>
  );
}

export function RiskPill({ risk }: { risk: RiskLevel }) {
  if (risk === "high")
    return (
      <Pill tone="bad" icon={<AlertTriangle className="h-3 w-3" />}>
        {RISK_LABEL.high}
      </Pill>
    );
  if (risk === "medium") return <Pill tone="warn">{RISK_LABEL.medium}</Pill>;
  return <Pill tone="neutral">{RISK_LABEL.low}</Pill>;
}

export function SeverityPill({ severity }: { severity: "high" | "medium" | "low" }) {
  if (severity === "high")
    return (
      <Pill tone="bad" icon={<AlertTriangle className="h-3 w-3" />}>
        High severity
      </Pill>
    );
  if (severity === "medium")
    return (
      <Pill tone="warn" icon={<CircleDashed className="h-3 w-3" />}>
        Medium severity
      </Pill>
    );
  return <Pill tone="neutral">Low severity</Pill>;
}
