#!/usr/bin/env python3
"""
Generate the synthetic dataset behind ControlPoint.

Everything here is invented. NimbusPay does not exist, the people do not exist,
and none of these control test results describe a real company. The data is
shaped to be *internally consistent* and audit-realistic so the readiness
engine, the SoD analyzer, and the remediation ranker have something honest to
chew on.

Run:  python3 scripts/gen_data.py
Out:  data/{company,controls,users,permissions,sod_rules,benchmark}.json
"""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 20250701
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

NOTE = (
    "Synthetic data for an educational SOC 2 readiness concept. "
    "Not a real assessment."
)

# The point-in-time the assessment is run from: the start of fieldwork, just
# after the audit period closes. Pinning this makes every "days since evidence"
# figure in the app deterministic instead of drifting with the wall clock.
AS_OF = date(2026, 1, 15)
PERIOD_START = date(2025, 7, 1)
PERIOD_END = date(2025, 12, 31)


# --------------------------------------------------------------------------
# 1. Company
# --------------------------------------------------------------------------

COMPANY = {
    "_note": NOTE,
    "name": "NimbusPay",
    "legalName": "NimbusPay, Inc.",
    "industry": "Payments SaaS",
    "description": (
        "Card-not-present payment processing and payouts platform for "
        "small and mid-sized merchants. Handles authorization, settlement, "
        "and vendor payout flows on behalf of ~3,400 merchant customers."
    ),
    "headquarters": "San Francisco, CA",
    "employees": 118,
    "founded": 2019,
    "reportType": "SOC 2 Type II",
    "auditPeriod": {
        "start": PERIOD_START.isoformat(),
        "end": PERIOD_END.isoformat(),
        "months": 6,
    },
    "asOfDate": AS_OF.isoformat(),
    "priorReport": "None — this would be NimbusPay's first Type II examination.",
    "inScopeTsc": [
        {
            "code": "Security",
            "label": "Security (Common Criteria, CC1–CC9)",
            "required": True,
            "rationale": (
                "Mandatory in every SOC 2 examination. The Common Criteria are "
                "the baseline every other category builds on."
            ),
        },
        {
            "code": "PI",
            "label": "Processing Integrity",
            "required": False,
            "rationale": (
                "Merchants are told payments are processed completely, "
                "accurately, and only once. That is a processing commitment, "
                "so the category is in scope."
            ),
        },
        {
            "code": "C",
            "label": "Confidentiality",
            "required": False,
            "rationale": (
                "Contracts commit NimbusPay to protecting merchant business "
                "data and cardholder information beyond generic security."
            ),
        },
    ],
    "outOfScopeTsc": [
        {
            "code": "A",
            "label": "Availability",
            "rationale": (
                "No contractual uptime commitment is made to merchants in the "
                "current MSA, so management scoped Availability out for the "
                "first examination."
            ),
        },
        {
            "code": "P",
            "label": "Privacy",
            "rationale": (
                "NimbusPay processes merchant and cardholder data as a service "
                "provider rather than collecting personal information for its "
                "own purposes; Privacy was scoped out and handled through "
                "Confidentiality plus contractual terms."
            ),
        },
    ],
    "scopingNote": (
        "Scope is a management decision, not an auditor's. Security is always "
        "required; the other four categories are added based on the promises "
        "the company makes to its customers. Narrower scope means a cleaner "
        "first report — and a visible gap if customers later ask for uptime or "
        "privacy assurance."
    ),
    "typeIiNote": (
        "A Type I opinion covers control design at a single date. A Type II "
        "covers operating effectiveness across the whole period, which is why "
        "evidence that a control actually ran — every quarter, every deploy, "
        "every termination — matters as much as the control existing."
    ),
    "subserviceOrganizations": [
        {
            "name": "AWS (us-west-2, us-east-1)",
            "service": "Cloud infrastructure and physical data center controls",
            "method": "Carve-out",
        },
        {
            "name": "Stripe Issuing",
            "service": "Card issuing and network connectivity",
            "method": "Carve-out",
        },
    ],
}


# --------------------------------------------------------------------------
# 2. Criteria catalogue (structure of the framework itself)
# --------------------------------------------------------------------------
# Paraphrased intent in plain language. The AICPA's criteria text is
# copyrighted and is deliberately NOT reproduced here.

CRITERIA = [
    ("CC1.1", "CC1", "Control Environment", "The company demonstrates a commitment to integrity and ethical values."),
    ("CC1.2", "CC1", "Control Environment", "The board exercises independent oversight of the system of internal control."),
    ("CC1.3", "CC1", "Control Environment", "Management establishes reporting lines, structures, and authority to pursue objectives."),
    ("CC1.4", "CC1", "Control Environment", "The company attracts, develops, and retains competent people."),
    ("CC1.5", "CC1", "Control Environment", "The company holds individuals accountable for their control responsibilities."),
    ("CC2.1", "CC2", "Communication and Information", "Relevant, quality information is obtained and used to support internal control."),
    ("CC2.2", "CC2", "Communication and Information", "Internal control information, including responsibilities, is communicated internally."),
    ("CC2.3", "CC2", "Communication and Information", "Relevant information is communicated to external parties such as customers."),
    ("CC3.1", "CC3", "Risk Assessment", "Objectives are specified clearly enough to identify and assess related risks."),
    ("CC3.2", "CC3", "Risk Assessment", "Risks to objectives are identified and analyzed as a basis for managing them."),
    ("CC3.3", "CC3", "Risk Assessment", "The potential for fraud is considered when assessing risk."),
    ("CC3.4", "CC3", "Risk Assessment", "Changes that could significantly affect internal control are identified and assessed."),
    ("CC4.1", "CC4", "Monitoring Activities", "Ongoing and separate evaluations confirm whether controls are present and working."),
    ("CC4.2", "CC4", "Monitoring Activities", "Control deficiencies are evaluated and communicated to those responsible for corrective action."),
    ("CC5.1", "CC5", "Control Activities", "Control activities are selected and developed to mitigate risks to acceptable levels."),
    ("CC5.2", "CC5", "Control Activities", "Control activities over technology are selected and developed to support objectives."),
    ("CC5.3", "CC5", "Control Activities", "Control activities are deployed through policies and the procedures that put them into action."),
    ("CC6.1", "CC6", "Logical and Physical Access", "Logical access security protects information assets from unauthorized use."),
    ("CC6.2", "CC6", "Logical and Physical Access", "Access is registered, authorized, and removed when no longer appropriate."),
    ("CC6.3", "CC6", "Logical and Physical Access", "Access to data and functions is managed based on roles and least privilege."),
    ("CC6.4", "CC6", "Logical and Physical Access", "Physical access to facilities and protected assets is restricted."),
    ("CC6.5", "CC6", "Logical and Physical Access", "Data and software are removed from assets before disposal or reuse."),
    ("CC6.6", "CC6", "Logical and Physical Access", "The system is protected against threats originating outside its boundaries."),
    ("CC6.7", "CC6", "Logical and Physical Access", "Information is protected in transmission, movement, and removal."),
    ("CC6.8", "CC6", "Logical and Physical Access", "Unauthorized or malicious software is prevented from being introduced."),
    ("CC7.1", "CC7", "System Operations", "Configuration standards are used to detect vulnerabilities and unauthorized change."),
    ("CC7.2", "CC7", "System Operations", "The system is monitored to detect anomalies that indicate a security event."),
    ("CC7.3", "CC7", "System Operations", "Security events are evaluated to determine whether they are incidents."),
    ("CC7.4", "CC7", "System Operations", "Identified incidents are contained, remediated, and communicated."),
    ("CC7.5", "CC7", "System Operations", "The company recovers from identified incidents and applies what it learns."),
    ("CC8.1", "CC8", "Change Management", "Changes to infrastructure, data, software, and procedures are authorized, tested, and approved."),
    ("CC9.1", "CC9", "Risk Mitigation", "The company identifies and mitigates risks from business disruptions."),
    ("CC9.2", "CC9", "Risk Mitigation", "Risks arising from vendors and business partners are assessed and managed."),
    ("PI1.1", "PI1", "Processing Integrity", "Information about processing objectives and data quality is available to users."),
    ("PI1.2", "PI1", "Processing Integrity", "Inputs are complete, accurate, and authorized before processing."),
    ("PI1.3", "PI1", "Processing Integrity", "Processing itself is complete, accurate, timely, and properly authorized."),
    ("PI1.4", "PI1", "Processing Integrity", "Outputs are complete, accurate, and delivered only to the people entitled to them."),
    ("PI1.5", "PI1", "Processing Integrity", "Stored information supporting processing is complete, accurate, and timely."),
    ("C1.1", "C1", "Confidentiality", "Information designated confidential is identified and protected through its lifecycle."),
    ("C1.2", "C1", "Confidentiality", "Confidential information is disposed of when retention requirements end."),
]

CATEGORIES = [
    ("CC1", "Control Environment", "Security", "Tone at the top: ethics, board oversight, structure, competence, accountability."),
    ("CC2", "Communication and Information", "Security", "Getting the right information to the right people, inside and outside the company."),
    ("CC3", "Risk Assessment", "Security", "Identifying what could go wrong — including fraud — and analyzing it."),
    ("CC4", "Monitoring Activities", "Security", "Checking that controls are actually working, and reporting when they are not."),
    ("CC5", "Control Activities", "Security", "Selecting and deploying the controls, including technology controls and policies."),
    ("CC6", "Logical and Physical Access", "Security", "Who can get to what: provisioning, least privilege, encryption, physical access."),
    ("CC7", "System Operations", "Security", "Running the system: vulnerability management, monitoring, incident response."),
    ("CC8", "Change Management", "Security", "Authorizing, testing, and approving changes before they reach production."),
    ("CC9", "Risk Mitigation", "Security", "Business disruption and vendor risk."),
    ("PI1", "Processing Integrity", "Processing Integrity", "Processing is complete, valid, accurate, timely, and authorized."),
    ("C1", "Confidentiality", "Confidentiality", "Confidential information is protected in life and destroyed at end of retention."),
]

OUT_OF_SCOPE_CATEGORIES = [
    ("A1", "Availability", "Availability", "Capacity, backup, and recovery against uptime commitments."),
    ("P1–P8", "Privacy", "Privacy", "Notice, choice, collection, retention, disclosure, and quality of personal information."),
]


# --------------------------------------------------------------------------
# 3. Controls
# --------------------------------------------------------------------------
# Hand-authored so the mix is deliberate:
#   * most implemented with current evidence,
#   * several partial,
#   * a few not implemented,
#   * and a realistic set of "implemented but stale evidence" — the classic
#     Type II failure where the control exists but nobody can prove it ran all
#     period.
# CC6 (access) and CC8 (change) carry real weaknesses on purpose: those are
# where the remediation engine and the SoD analyzer need something to bite on.

def C(title, description, criteria, owner, frequency, risk, status, evidence, artifact):
    return {
        "title": title,
        "description": description,
        "criteria": criteria,
        "owner": owner,
        "frequency": frequency,
        "inherentRisk": risk,
        "status": status,
        "evidence": evidence,
        "evidenceType": artifact,
    }


CONTROL_SPECS = [
    # ---- CC1 Control Environment ----
    C("Code of conduct acknowledged at hire and annually",
      "Every employee and contractor signs the code of conduct when they join and re-acknowledges it each year; HR tracks completion and escalates non-signers.",
      ["CC1.1"], "Chief People Officer", "annual", "medium", "implemented", "current",
      "Signed acknowledgement export"),
    C("Background checks completed before start date",
      "Criminal, employment, and (for finance and engineering roles) credit screening is completed and cleared before a new hire receives system access.",
      ["CC1.1", "CC1.4"], "People Operations Manager", "per-event", "medium", "implemented", "current",
      "Screening vendor results sample"),
    C("Quarterly security steering committee with board reporting",
      "A cross-functional steering committee reviews the security program, open risks, and incidents each quarter, and reports to the board audit committee.",
      ["CC1.2"], "Chief Executive Officer", "quarterly", "medium", "implemented", "current",
      "Meeting minutes and board deck"),
    C("Org chart and role descriptions define security responsibility",
      "Documented reporting lines and job descriptions state who owns which security and compliance responsibilities; reviewed when the org changes and at least annually.",
      ["CC1.3", "CC2.2"], "Chief People Officer", "annual", "low", "implemented", "current",
      "Approved org chart and job descriptions"),
    C("Annual security awareness training with completion tracking",
      "All staff complete role-appropriate security training each year, including secure coding for engineers and fraud awareness for finance. Completion is tracked and enforced.",
      ["CC1.4", "CC2.2"], "Chief Information Security Officer", "annual", "medium", "implemented", "stale",
      "LMS completion report"),
    C("Performance reviews include control responsibilities",
      "Annual performance reviews assess whether individuals met the security and compliance responsibilities in their role. Currently applied to managers only, not all staff.",
      ["CC1.5"], "People Operations Manager", "annual", "low", "partial", "current",
      "Review template and sample"),

    # ---- CC2 Communication and Information ----
    C("Information security policy suite reviewed and approved annually",
      "A documented policy set (security, access, change, incident, vendor, data handling) is reviewed, approved by the CISO, and published to all staff each year.",
      ["CC2.2", "CC1.3", "CC5.3"], "Chief Information Security Officer", "annual", "medium", "implemented", "current",
      "Approved policy set with version history"),
    C("Confidential reporting channel for security and ethics concerns",
      "Staff can report security, fraud, or ethics concerns through a named channel and an anonymous hotline; reports are logged and triaged by the CISO and General Counsel.",
      ["CC2.2", "CC1.1"], "General Counsel", "continuous", "medium", "implemented", "current",
      "Hotline log and triage records"),
    C("System description and security commitments published to customers",
      "The trust page, MSA, and DPA describe the system boundary, security commitments, and customer responsibilities; reviewed annually and on material change.",
      ["CC2.3"], "General Counsel", "annual", "low", "implemented", "current",
      "Trust page and contract templates"),
    C("Data classification standard maintained and communicated",
      "A four-tier classification standard (public, internal, confidential, restricted/cardholder) defines handling rules. The standard exists but has not been rolled out to all data stores.",
      ["CC2.1", "C1.1"], "Chief Information Security Officer", "annual", "medium", "partial", "stale",
      "Classification standard and rollout tracker"),

    # ---- CC3 Risk Assessment ----
    C("Annual enterprise risk assessment with maintained risk register",
      "Management identifies and rates risks to security and processing objectives, assigns owners and treatment plans, and maintains the results in a risk register.",
      ["CC3.1", "CC3.2"], "Chief Information Security Officer", "annual", "high", "implemented", "stale",
      "Risk register and assessment memo"),
    C("Fraud risk assessment covering payment and payout flows",
      "A specific assessment of fraud scenarios — fictitious vendors, duplicate or self-approved payouts, insider misuse of production data — with mapped mitigating controls.",
      ["CC3.3"], "Controller", "annual", "high", "partial", "missing",
      "Fraud risk matrix"),
    C("Risk review of significant system and business changes",
      "Material changes (new payment rails, new subprocessors, re-architecture) get a documented risk review before launch. Applied inconsistently to infrastructure changes.",
      ["CC3.4"], "VP Engineering", "per-event", "medium", "partial", "current",
      "Change risk review records"),
    C("Vendor risk assessment before onboarding",
      "New vendors with access to production or confidential data are risk-rated and reviewed (SOC 2 report, security questionnaire, contract terms) before contract signature.",
      ["CC3.2", "CC9.2"], "Vendor Risk Manager", "per-event", "high", "implemented", "stale",
      "Vendor assessment files"),

    # ---- CC4 Monitoring Activities ----
    C("Quarterly internal control self-assessment",
      "Control owners attest each quarter that their control operated, and attach evidence. Compliance samples and challenges the attestations. Two of the last four quarters were skipped.",
      ["CC4.1"], "Compliance Manager", "quarterly", "medium", "partial", "stale",
      "Self-assessment attestations"),
    C("Annual third-party penetration test with tracked remediation",
      "An external firm performs network and application penetration testing annually; findings are risk-rated, assigned, and tracked to closure against defined SLAs.",
      ["CC4.1", "CC7.1"], "Chief Information Security Officer", "annual", "high", "implemented", "current",
      "Pen test report and remediation tracker"),
    C("Control deficiencies tracked to closure and reported to management",
      "Deficiencies from self-assessments, pen tests, and incidents are logged with owner, due date, and status, and reported monthly to leadership. Reporting has been ad hoc.",
      ["CC4.2"], "Compliance Manager", "monthly", "medium", "partial", "current",
      "Deficiency register and status reports"),

    # ---- CC5 Control Activities ----
    C("Control matrix maps every control to criteria, owner, and frequency",
      "A maintained control matrix links each control to the criteria it addresses, names an accountable owner, and states test frequency; reviewed annually by Compliance.",
      ["CC5.1", "CC5.3"], "Compliance Manager", "annual", "low", "implemented", "current",
      "Control matrix with review sign-off"),
    C("Segregation of duties matrix defined for payment and production roles",
      "A documented conflict matrix defines role pairs that must not be held by the same person across the payment, payroll, and production-change systems. Defined, but not enforced or monitored.",
      ["CC5.2", "CC6.3"], "Controller", "semi-annual", "high", "partial", "stale",
      "SoD conflict matrix and review"),
    C("Automated policy enforcement in CI/CD and cloud configuration",
      "Pipeline gates and cloud policy-as-code block known-bad configurations (public buckets, unencrypted volumes, missing tags) before they reach production.",
      ["CC5.2", "CC8.1"], "VP Engineering", "continuous", "medium", "implemented", "current",
      "Policy-as-code repo and blocked-build logs"),

    # ---- CC6 Logical and Physical Access ----
    C("Unique user IDs with SSO and enforced MFA",
      "All corporate and production applications authenticate through the identity provider with unique accounts and mandatory multi-factor authentication; shared accounts are prohibited.",
      ["CC6.1"], "IT Manager", "continuous", "high", "implemented", "current",
      "IdP configuration export and MFA coverage report"),
    C("Access provisioning requires documented approval from the data owner",
      "New access is requested through a ticket and approved by the system or data owner before it is granted. Approvals are inconsistently captured for engineering tooling.",
      ["CC6.1", "CC6.2"], "IT Manager", "per-event", "high", "partial", "stale",
      "Access request tickets with approvals"),
    C("Access revoked within 24 hours of termination",
      "Offboarding triggers removal of SSO, VPN, production, and financial system access within one business day, with a checklist signed by IT. Tickets for part of the period cannot be produced.",
      ["CC6.2", "CC6.3"], "IT Manager", "per-event", "high", "implemented", "stale",
      "Termination checklist and deprovisioning logs"),
    C("Quarterly user access review of production and financial systems",
      "System owners review every account and privilege level each quarter and certify or revoke. The review has not been performed for the audit period.",
      ["CC6.2", "CC6.3"], "Chief Information Security Officer", "quarterly", "high", "partial", "missing",
      "Signed access review certifications"),
    C("Privileged access restricted, time-bound, and reviewed",
      "Administrative and production write access should be granted just-in-time with expiry and approval. Today privileged roles are standing and unreviewed.",
      ["CC6.3"], "Security Administrator", "quarterly", "high", "not_implemented", "missing",
      "JIT grant logs and privileged role inventory"),
    C("Production database access brokered through a logged bastion",
      "Direct database access requires going through a bastion host that records the session; direct network paths to production data stores are blocked.",
      ["CC6.1", "CC6.6"], "Platform Engineering Lead", "continuous", "high", "implemented", "current",
      "Bastion session logs and network policy"),
    C("Encryption in transit for all external connections",
      "TLS 1.2 or higher is enforced on every externally reachable endpoint, with weak ciphers disabled and certificates monitored for expiry.",
      ["CC6.7", "C1.1"], "Platform Engineering Lead", "continuous", "high", "implemented", "current",
      "TLS scan results and load balancer config"),
    C("Encryption at rest for cardholder and merchant data stores",
      "Databases, object storage, backups, and snapshots holding cardholder or merchant data are encrypted at rest with managed keys and rotation enabled.",
      ["CC6.1", "C1.1"], "Platform Engineering Lead", "continuous", "high", "implemented", "current",
      "Storage encryption config export"),
    C("Endpoint protection and full-disk encryption on company laptops",
      "Managed laptops enforce disk encryption, screen lock, patching, and EDR agent health; unmanaged devices cannot reach internal applications.",
      ["CC6.6", "CC6.7", "CC6.8"], "IT Manager", "continuous", "medium", "implemented", "stale",
      "MDM fleet compliance report"),
    C("Physical access to facilities and data centers restricted",
      "Office entry uses badge access with a reviewed badge list; data center physical security is carved out to AWS and covered by reviewing their SOC 2 report annually.",
      ["CC6.4", "CC6.5"], "IT Manager", "annual", "low", "implemented", "current",
      "Badge access list and subservice SOC 2 review"),
    C("Secure disposal of decommissioned media and devices",
      "Laptops and storage media are cryptographically erased or destroyed at end of life with a certificate of destruction retained. Process is informal for cloud volumes.",
      ["CC6.5"], "IT Manager", "per-event", "low", "partial", "stale",
      "Destruction certificates"),
    C("Malicious software prevention on servers and workloads",
      "Container images are scanned and signed, only approved base images are allowed, and runtime agents alert on unexpected binaries in production workloads.",
      ["CC6.8"], "Security Engineer", "continuous", "medium", "implemented", "current",
      "Image scan results and admission policy"),

    # ---- CC7 System Operations ----
    C("Centralized logging with security alerting",
      "Application, infrastructure, and identity logs ship to a central store with alerting on privileged actions, failed authentication spikes, and configuration changes.",
      ["CC7.2"], "Security Engineer", "continuous", "high", "implemented", "current",
      "SIEM alert rules and sample alerts"),
    C("Vulnerability scanning with severity-based patch SLAs",
      "Infrastructure and dependency scanning runs monthly with remediation SLAs by severity (critical 7 days, high 30). Scans run, but overdue criticals are not tracked to closure.",
      ["CC7.1"], "Security Engineer", "monthly", "high", "partial", "stale",
      "Scan reports and SLA aging report"),
    C("Documented incident response plan with defined roles",
      "An IR plan defines severity levels, on-call roles, escalation paths, evidence handling, and customer and regulator notification timelines; reviewed annually.",
      ["CC7.3", "CC7.4"], "Chief Information Security Officer", "annual", "high", "implemented", "current",
      "Approved IR plan"),
    C("Annual incident response tabletop exercise",
      "A simulated incident is run each year with the response team, and gaps identified feed back into the plan. No exercise has been performed.",
      ["CC7.4", "CC7.5"], "Chief Information Security Officer", "annual", "medium", "not_implemented", "missing",
      "Tabletop scenario and lessons-learned memo"),
    C("Security events triaged, tracked, and communicated",
      "Alerts are triaged against defined severity criteria, incidents are logged with a timeline, and affected customers are notified per contractual commitments.",
      ["CC7.3", "CC7.4", "CC7.5", "CC2.3"], "Chief Information Security Officer", "per-event", "high", "implemented", "current",
      "Incident tickets with timelines"),
    C("Configuration baselines and drift detection for cloud infrastructure",
      "Hardened baselines are defined for compute, storage, and network resources, with automated drift detection. Detection covers production only, not the shared services account.",
      ["CC7.1", "CC7.2"], "Platform Engineering Lead", "continuous", "medium", "partial", "current",
      "Baseline definitions and drift alerts"),

    # ---- CC8 Change Management ----
    C("Peer review and approval required before code merges to main",
      "Branch protection requires an approving review from someone other than the author before merge. Administrators can bypass the rule and several bypasses were used during the period.",
      ["CC8.1"], "VP Engineering", "continuous", "high", "partial", "stale",
      "Pull request approval export and bypass log"),
    C("Automated test suite and CI gates pass before deployment",
      "Unit, integration, and contract tests plus security scanning must pass in the pipeline before an artifact is promoted to production.",
      ["CC8.1"], "VP Engineering", "continuous", "medium", "implemented", "current",
      "Pipeline run history"),
    C("Separate development, staging, and production environments",
      "Environments are isolated by account and network, and production data is not copied into lower environments. Some legacy debugging exports to staging still occur.",
      ["CC8.1", "CC6.1"], "Platform Engineering Lead", "continuous", "high", "partial", "current",
      "Account topology and data-flow review"),
    C("Emergency change procedure with retrospective approval",
      "Break-glass changes should be logged, justified, and approved after the fact within one business day. No formal procedure exists and emergency deploys are untracked.",
      ["CC8.1"], "VP Engineering", "per-event", "high", "not_implemented", "missing",
      "Emergency change log with approvals"),
    C("Infrastructure changes made through version-controlled IaC",
      "Cloud infrastructure changes go through Terraform with peer review and a plan-approval step; console changes are detected and reverted.",
      ["CC8.1", "CC7.1"], "Platform Engineering Lead", "continuous", "medium", "implemented", "stale",
      "Terraform PR history and drift reports"),

    # ---- CC9 Risk Mitigation ----
    C("Business continuity and disaster recovery plan tested annually",
      "A BC/DR plan defines RTO and RPO for payment processing and is validated by an annual restore and failover test. The plan exists; the test was not completed this period.",
      ["CC9.1"], "VP Engineering", "annual", "high", "partial", "stale",
      "BC/DR plan and test results"),
    C("Vendor contracts carry security terms and subservice reports reviewed",
      "Critical vendor contracts include security, confidentiality, and breach-notification terms, and their SOC 2 reports are reviewed annually with CUEC follow-up.",
      ["CC9.2", "CC3.2"], "Vendor Risk Manager", "annual", "medium", "partial", "stale",
      "Contract clause review and SOC 2 review memos"),

    # ---- PI Processing Integrity ----
    C("Processing commitments and data quality definitions documented",
      "Published documentation states what NimbusPay commits to on payment completeness, accuracy, and timing, and defines the data quality rules merchants can rely on.",
      ["PI1.1"], "VP Product", "annual", "low", "partial", "current",
      "Published processing commitments"),
    C("Payment input validation and authorization at the API boundary",
      "Every payment instruction is schema-validated, authenticated to a merchant key, checked for required fields and limits, and rejected with a typed error when invalid.",
      ["PI1.2"], "VP Engineering", "continuous", "high", "implemented", "current",
      "Validation rules and rejection metrics"),
    C("Idempotency keys prevent duplicate payment processing",
      "Payment requests carry an idempotency key enforced at the ledger layer so retries and network failures cannot create duplicate transfers.",
      ["PI1.2", "PI1.3"], "VP Engineering", "continuous", "high", "implemented", "current",
      "Idempotency design doc and duplicate-rate metrics"),
    C("Daily reconciliation of processed payments to settlement files",
      "An automated job reconciles the internal ledger to processor settlement files each day and routes breaks to an exception queue. The job runs, but sign-off evidence is missing for much of the period.",
      ["PI1.3", "PI1.5"], "Controller", "daily", "high", "implemented", "stale",
      "Reconciliation reports with reviewer sign-off"),
    C("Exception and error queue reviewed and cleared within SLA",
      "Failed or broken transactions land in an exception queue reviewed daily by Payment Operations, with aging thresholds and escalation. Aging items regularly exceed the SLA.",
      ["PI1.4", "PI1.5"], "Payment Operations Manager", "daily", "high", "partial", "current",
      "Exception queue aging report"),
    C("Merchant output reporting reconciled before release",
      "Settlement statements and payout reports are reconciled to the ledger and reviewed before release to merchants, so merchants only receive complete and accurate figures.",
      ["PI1.4"], "Controller", "monthly", "medium", "partial", "stale",
      "Statement review sign-off"),

    # ---- C Confidentiality ----
    C("Confidential data inventory and retention schedule maintained",
      "An inventory records where confidential and cardholder data lives, its classification, owner, and retention period. The inventory is incomplete for analytics data stores.",
      ["C1.1", "CC2.1"], "General Counsel", "annual", "medium", "partial", "stale",
      "Data inventory and retention schedule"),
    C("Confidential data deleted at the end of its retention period",
      "Automated deletion should remove confidential records once retention expires, with evidence of deletion retained. Deletion is manual, undocumented, and has not been run.",
      ["C1.2"], "Platform Engineering Lead", "quarterly", "medium", "not_implemented", "missing",
      "Deletion job logs and certificates"),
    C("Cardholder numbers tokenized and excluded from logs",
      "Primary account numbers are tokenized at ingress, stored only in the vault, and scrubbed from application logs, traces, and error reports by an automated filter.",
      ["C1.1", "CC6.1"], "Platform Engineering Lead", "continuous", "high", "implemented", "current",
      "Tokenization architecture and log scan results"),
    C("Confidentiality agreements with employees and vendors",
      "Employees, contractors, and vendors with access to confidential data sign confidentiality agreements before access is granted, tracked by Legal.",
      ["C1.1", "CC1.1"], "General Counsel", "per-event", "low", "implemented", "current",
      "Executed NDAs"),
]

# How long evidence stays fresh before an auditor would call it stale, by
# control frequency. A continuous control needs recent proof; an annual one
# does not.
INTERVAL_DAYS = {
    "continuous": 14,
    "daily": 7,
    "weekly": 21,
    "monthly": 45,
    "quarterly": 110,
    "semi-annual": 200,
    "annual": 380,
    "per-event": 120,
}


def build_controls(rng: random.Random) -> list[dict]:
    controls = []
    for i, spec in enumerate(CONTROL_SPECS, start=1):
        interval = INTERVAL_DAYS[spec["frequency"]]
        evidence = spec["evidence"]
        if evidence == "current":
            age = int(interval * rng.uniform(0.15, 0.7))
        elif evidence == "stale":
            age = int(interval * rng.uniform(1.4, 2.8))
        else:  # missing
            age = None

        last_tested = (AS_OF - timedelta(days=age)).isoformat() if age is not None else None

        controls.append(
            {
                "id": f"CTRL-{i:03d}",
                "title": spec["title"],
                "description": spec["description"],
                "criteria": spec["criteria"],
                "status": spec["status"],
                "evidence": evidence,
                "evidenceType": spec["evidenceType"],
                "owner": spec["owner"],
                "frequency": spec["frequency"],
                "lastTested": last_tested,
                "inherentRisk": spec["inherentRisk"],
                "expectedEvidenceIntervalDays": interval,
            }
        )
    return controls


# --------------------------------------------------------------------------
# 4. Roles, permissions, SoD rules, users
# --------------------------------------------------------------------------

PERMISSION_CATALOGUE = {
    "create_vendor": "Create a new vendor or payee record",
    "edit_vendor": "Change vendor banking or contact details",
    "view_vendor": "View the vendor master file",
    "initiate_payment": "Submit a payment or payout for processing",
    "approve_payment": "Release a payment or payout for settlement",
    "create_payment_batch": "Assemble a batch of payments for release",
    "view_bank_account": "View company bank account balances and detail",
    "post_journal_entry": "Post an entry to the general ledger",
    "approve_journal_entry": "Approve a general ledger entry",
    "view_gl": "Read the general ledger",
    "run_payroll": "Execute a payroll run",
    "edit_employee_comp": "Change employee compensation records",
    "commit_code": "Commit code to a source repository",
    "approve_code_review": "Approve a pull request for merge",
    "deploy_code": "Deploy an artifact to production",
    "manage_infrastructure": "Change production cloud infrastructure",
    "prod_db_read": "Read production database contents",
    "prod_db_write": "Write directly to the production database",
    "create_user": "Create a user account in the identity provider",
    "modify_permissions": "Grant or change entitlements on an account",
    "approve_access": "Approve an access request as data owner",
    "reset_password": "Reset a user's credentials",
    "view_audit_log": "Read security and system audit logs",
    "view_customer_data": "View merchant and cardholder-adjacent records",
    "export_customer_data": "Bulk export merchant records",
}

ROLES = {
    "AP_Clerk": ["create_payment_batch", "initiate_payment", "view_vendor"],
    "AP_Approver": ["approve_payment", "view_vendor", "view_gl"],
    "Vendor_Admin": ["create_vendor", "edit_vendor", "view_vendor"],
    "Treasury_Analyst": ["initiate_payment", "view_bank_account"],
    "Controller_Role": ["approve_payment", "approve_journal_entry", "view_gl", "view_bank_account"],
    "GL_Accountant": ["post_journal_entry", "view_gl"],
    "Finance_Manager": ["approve_journal_entry", "view_gl", "view_bank_account"],
    "Payroll_Admin": ["run_payroll", "edit_employee_comp"],
    "Developer": ["commit_code", "prod_db_read"],
    "Release_Manager": ["deploy_code", "approve_code_review"],
    "SRE": ["deploy_code", "manage_infrastructure", "prod_db_read"],
    "Prod_DBA": ["prod_db_write", "prod_db_read"],
    "Security_Admin": ["modify_permissions", "create_user", "view_audit_log"],
    "IT_Helpdesk": ["create_user", "reset_password"],
    "Access_Approver": ["approve_access"],
    "Auditor_ReadOnly": ["view_audit_log", "view_gl"],
    "Support_Agent": ["view_customer_data"],
    "Support_Lead": ["view_customer_data", "export_customer_data"],
    "QA_Engineer": ["approve_code_review"],
}

ROLE_DESCRIPTIONS = {
    "AP_Clerk": "Accounts payable clerk — prepares and submits payment runs",
    "AP_Approver": "Accounts payable approver — releases payments",
    "Vendor_Admin": "Maintains the vendor master file",
    "Treasury_Analyst": "Manages bank relationships and initiates transfers",
    "Controller_Role": "Controller — final approver for payments and entries",
    "GL_Accountant": "General ledger accountant",
    "Finance_Manager": "Finance manager — reviews and approves entries",
    "Payroll_Admin": "Runs payroll and maintains compensation records",
    "Developer": "Application engineer with commit and read access",
    "Release_Manager": "Owns production releases",
    "SRE": "Site reliability engineer — infrastructure and deploys",
    "Prod_DBA": "Production database administrator",
    "Security_Admin": "Administers identity and entitlements",
    "IT_Helpdesk": "First-line IT support",
    "Access_Approver": "Data owner who approves access requests",
    "Auditor_ReadOnly": "Read-only access for internal audit",
    "Support_Agent": "Merchant support agent",
    "Support_Lead": "Merchant support lead with export rights",
    "QA_Engineer": "Quality engineer who reviews changes",
}

SOD_RULES = [
    {
        "id": "SOD-01",
        "permissionA": "create_vendor",
        "permissionB": "approve_payment",
        "severity": "high",
        "title": "Vendor creation and payment approval",
        "rationale": (
            "One person can create a payee they control and then approve money "
            "moving to it. This is the classic fictitious-vendor fraud path and "
            "the reason vendor master maintenance is kept away from payment release."
        ),
        "mappedCriteria": ["CC6.3", "CC5.2", "PI1.3"],
    },
    {
        "id": "SOD-02",
        "permissionA": "initiate_payment",
        "permissionB": "approve_payment",
        "severity": "high",
        "title": "Payment initiation and approval",
        "rationale": (
            "Self-approval removes the second pair of eyes entirely — the person "
            "submitting the payment is the person releasing it, so no independent "
            "check on amount, payee, or validity ever happens."
        ),
        "mappedCriteria": ["CC6.3", "CC5.2", "PI1.3"],
    },
    {
        "id": "SOD-03",
        "permissionA": "create_vendor",
        "permissionB": "initiate_payment",
        "severity": "high",
        "title": "Vendor creation and payment initiation",
        "rationale": (
            "Even without approval rights, a single person able to add a payee and "
            "queue a payment to it controls both sides of the setup and relies "
            "entirely on the approver catching an unfamiliar vendor name."
        ),
        "mappedCriteria": ["CC6.3", "CC5.2"],
    },
    {
        "id": "SOD-04",
        "permissionA": "deploy_code",
        "permissionB": "prod_db_write",
        "severity": "high",
        "title": "Production deployment and direct database write",
        "rationale": (
            "Someone who can both ship code and edit production data directly can "
            "make a change and then alter the records that would reveal it, "
            "defeating the change management trail."
        ),
        "mappedCriteria": ["CC6.3", "CC8.1", "CC5.2"],
    },
    {
        "id": "SOD-05",
        "permissionA": "deploy_code",
        "permissionB": "approve_code_review",
        "severity": "high",
        "title": "Self-approved production change",
        "rationale": (
            "Approving your own change and then deploying it means no independent "
            "review ever occurred, which is exactly what the change management "
            "criterion is designed to prevent."
        ),
        "mappedCriteria": ["CC8.1", "CC5.2"],
    },
    {
        "id": "SOD-06",
        "permissionA": "post_journal_entry",
        "permissionB": "approve_journal_entry",
        "severity": "high",
        "title": "Journal entry posting and approval",
        "rationale": (
            "The person recording an entry should not be the person approving it; "
            "otherwise a misstatement can be both created and blessed by the same "
            "individual without detection."
        ),
        "mappedCriteria": ["CC5.2", "PI1.5"],
    },
    {
        "id": "SOD-07",
        "permissionA": "create_user",
        "permissionB": "approve_access",
        "severity": "medium",
        "title": "Account creation and access approval",
        "rationale": (
            "Holding both lets a person grant themselves or a colleague entitlements "
            "and sign off on the request, so the approval record proves nothing."
        ),
        "mappedCriteria": ["CC6.1", "CC6.2", "CC5.2"],
    },
    {
        "id": "SOD-08",
        "permissionA": "modify_permissions",
        "permissionB": "approve_access",
        "severity": "medium",
        "title": "Entitlement change and access approval",
        "rationale": (
            "Privilege escalation becomes self-service: the administrator who "
            "changes entitlements is also the control that is supposed to "
            "authorize the change."
        ),
        "mappedCriteria": ["CC6.1", "CC6.3", "CC5.2"],
    },
    {
        "id": "SOD-09",
        "permissionA": "run_payroll",
        "permissionB": "edit_employee_comp",
        "severity": "medium",
        "title": "Compensation change and payroll execution",
        "rationale": (
            "One person can change a compensation record and then pay it out, with "
            "no independent review of the change before money leaves."
        ),
        "mappedCriteria": ["CC6.3", "CC5.2"],
    },
    {
        "id": "SOD-10",
        "permissionA": "export_customer_data",
        "permissionB": "modify_permissions",
        "severity": "medium",
        "title": "Bulk data export and entitlement change",
        "rationale": (
            "A person who can widen their own access and bulk-export merchant "
            "records can assemble a confidential dataset without anyone approving it."
        ),
        "mappedCriteria": ["CC6.1", "C1.1"],
    },
]

FIRST_NAMES = [
    "Amara", "Ben", "Priya", "Diego", "Elena", "Farid", "Grace", "Hiro", "Isabel",
    "Jonah", "Keiko", "Liam", "Maya", "Noor", "Omar", "Paloma", "Quinn", "Rafael",
    "Sofia", "Tomas", "Uma", "Viktor", "Wren", "Xiomara", "Yusuf", "Zara",
    "Adrian", "Bianca", "Caleb", "Dalia", "Ezra", "Freya", "Gabriel", "Hannah",
    "Ines", "Jamal", "Kara", "Lucas", "Mira", "Nathan", "Olga", "Pedro", "Rosa",
    "Simon", "Tara", "Ugo", "Vera", "Will", "Yara", "Zane", "Anika", "Bruno",
    "Clara", "Dmitri", "Elias", "Fatima", "Gunnar", "Helena", "Ivan", "Julia",
]
LAST_NAMES = [
    "Okafor", "Zhang", "Raman", "Martinez", "Petrova", "Haddad", "Lin", "Tanaka",
    "Reyes", "Whitfield", "Sato", "O'Brien", "Desai", "Rahman", "Aziz", "Ferrer",
    "Callahan", "Duarte", "Moreno", "Alvarez", "Nkemdirim", "Novak", "Ellison",
    "Castillo", "Demir", "Larsen", "Boateng", "Ivanov", "Brennan", "Kaur",
    "Silva", "Nakamura", "Abadi", "Kovac", "Mensah", "Sorensen", "Bianchi",
    "Fournier", "Lindqvist", "Marchetti", "Osei", "Pak", "Quintero", "Rossi",
    "Stoyanov", "Thibault", "Ugarte", "Volkov", "Weber", "Yoshida",
]

# Departments and the roles that are normal for them.
DEPT_ROLE_POOL = {
    "Finance": [
        ("Accounts Payable Specialist", ["AP_Clerk"]),
        ("Accounts Payable Specialist", ["AP_Clerk"]),
        ("Senior Accountant", ["GL_Accountant"]),
        ("Staff Accountant", ["GL_Accountant"]),
        ("Accounting Manager", ["Finance_Manager"]),
        ("Treasury Analyst", ["Treasury_Analyst"]),
        ("Financial Analyst", ["Auditor_ReadOnly"]),
        ("Procurement Specialist", ["Vendor_Admin"]),
    ],
    "Engineering": [
        ("Software Engineer", ["Developer"]),
        ("Senior Software Engineer", ["Developer"]),
        ("Staff Engineer", ["Developer", "QA_Engineer"]),
        ("Site Reliability Engineer", ["SRE"]),
        ("Release Manager", ["Release_Manager"]),
        ("QA Engineer", ["QA_Engineer"]),
        ("Database Administrator", ["Prod_DBA"]),
    ],
    "Security": [
        ("Security Engineer", ["Auditor_ReadOnly"]),
        ("Security Administrator", ["Security_Admin"]),
        ("Compliance Analyst", ["Auditor_ReadOnly"]),
    ],
    "IT": [
        ("IT Support Specialist", ["IT_Helpdesk"]),
        ("IT Systems Administrator", ["IT_Helpdesk"]),
    ],
    "People Operations": [
        ("People Operations Specialist", []),
        ("Payroll Specialist", ["Payroll_Admin"]),
        ("Recruiter", []),
    ],
    "Customer Support": [
        ("Support Agent", ["Support_Agent"]),
        ("Support Agent", ["Support_Agent"]),
        ("Support Team Lead", ["Support_Lead"]),
    ],
    "Payment Operations": [
        ("Payment Operations Analyst", ["AP_Clerk"]),
        ("Payment Operations Specialist", ["Support_Agent"]),
        ("Payment Operations Manager", ["AP_Approver"]),
    ],
    "Product": [
        ("Product Manager", []),
        ("Product Designer", []),
    ],
    "Legal": [
        ("Corporate Counsel", []),
        ("Contracts Manager", ["Vendor_Admin"]),
    ],
}

# Deliberately seeded conflicts. These are the people an auditor would flag on
# day one: each combination is plausible for a ~120-person company where access
# accumulated as people changed jobs.
SEEDED_VIOLATORS = [
    {
        "title": "Controller",
        "department": "Finance",
        "roles": ["Controller_Role", "Vendor_Admin"],
        "note": "Kept vendor master rights from an earlier procurement role.",
    },
    {
        "title": "Accounts Payable Manager",
        "department": "Finance",
        "roles": ["AP_Clerk", "AP_Approver"],
        "note": "Covers approvals when the Controller is out, and still runs batches.",
    },
    {
        "title": "Procurement Lead",
        "department": "Finance",
        "roles": ["Vendor_Admin", "AP_Clerk"],
        "note": "Onboards vendors and queues their first payment.",
    },
    {
        "title": "Senior Accountant",
        "department": "Finance",
        "roles": ["GL_Accountant", "Finance_Manager"],
        "note": "Promoted without the prior entitlement being removed.",
    },
    {
        "title": "Principal Engineer",
        "department": "Engineering",
        "roles": ["Developer", "Release_Manager", "Prod_DBA"],
        "note": "Long-tenured engineer who accumulated production entitlements.",
    },
    {
        "title": "Lead Site Reliability Engineer",
        "department": "Engineering",
        "roles": ["SRE", "Prod_DBA"],
        "note": "On-call runbooks require direct database intervention.",
    },
    {
        "title": "Release Manager",
        "department": "Engineering",
        "roles": ["Release_Manager"],
        "note": "Approves and deploys the same change — role design conflict, not accumulation.",
    },
    {
        "title": "Platform Engineering Lead",
        "department": "Engineering",
        "roles": ["SRE", "Release_Manager"],
        "note": "Deploys and approves reviews for the platform team.",
    },
    {
        "title": "Security Administrator",
        "department": "Security",
        "roles": ["Security_Admin", "Access_Approver"],
        "note": "Named as data owner for the identity platform while administering it.",
    },
    {
        "title": "IT Manager",
        "department": "IT",
        "roles": ["IT_Helpdesk", "Access_Approver"],
        "note": "Approves access requests for systems the helpdesk provisions.",
    },
    {
        "title": "Payroll Manager",
        "department": "People Operations",
        "roles": ["Payroll_Admin", "Finance_Manager"],
        "note": "Payroll plus compensation edit rights held in one role set.",
    },
    {
        "title": "Support Operations Lead",
        "department": "Customer Support",
        "roles": ["Support_Lead", "Security_Admin"],
        "note": "Retained admin rights from a previous internal tooling project.",
    },
]


def effective_permissions(roles: list[str]) -> set[str]:
    out: set[str] = set()
    for role in roles:
        out.update(ROLES.get(role, []))
    return out


def has_conflict(roles: list[str]) -> bool:
    perms = effective_permissions(roles)
    return any(
        rule["permissionA"] in perms and rule["permissionB"] in perms
        for rule in SOD_RULES
    )


def build_users(rng: random.Random) -> list[dict]:
    used_names: set[str] = set()

    def new_name() -> str:
        while True:
            name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
            if name not in used_names:
                used_names.add(name)
                return name

    users: list[dict] = []
    counter = 1

    for seed in SEEDED_VIOLATORS:
        users.append(
            {
                "userId": f"U-{counter:03d}",
                "name": new_name(),
                "department": seed["department"],
                "title": seed["title"],
                "roles": list(seed["roles"]),
                "accessNote": seed["note"],
            }
        )
        counter += 1

    # Everyone else gets a clean, plausible role set. Any draw that would create
    # a conflict is re-rolled so the violations in the dataset are the ones we
    # seeded on purpose and can point to.
    pool = [(dept, title, roles) for dept, entries in DEPT_ROLE_POOL.items() for title, roles in entries]
    target = 62
    while counter <= target:
        dept, title, roles = rng.choice(pool)
        roles = list(roles)
        # A minority of people legitimately hold a second, non-conflicting role.
        if rng.random() < 0.18:
            extra = rng.choice(["Auditor_ReadOnly", "Support_Agent", "QA_Engineer", "Access_Approver"])
            if extra not in roles:
                candidate = roles + [extra]
                if not has_conflict(candidate):
                    roles = candidate
        if has_conflict(roles):
            continue
        users.append(
            {
                "userId": f"U-{counter:03d}",
                "name": new_name(),
                "department": dept,
                "title": title,
                "roles": roles,
            }
        )
        counter += 1

    return users


# --------------------------------------------------------------------------
# 5. Benchmark
# --------------------------------------------------------------------------

BENCHMARK = {
    "_note": (
        "Illustrative peer figures for an educational concept. These are "
        "modeled reference points, not a survey of real companies."
    ),
    "peerGroup": "Payments and fintech SaaS, 50–250 employees, preparing a first SOC 2 Type II",
    "sampleSize": 40,
    "medianReadiness": 71,
    "topQuartileReadiness": 84,
    "medianOpenHighRiskGaps": 6,
    "medianDaysSinceEvidence": 34,
    "medianSodViolations": 5,
    "medianControlsImplementedPct": 78,
    "medianWeeksToAuditReady": 14,
}


# --------------------------------------------------------------------------
# Write it all out
# --------------------------------------------------------------------------

def write(name: str, payload) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / name
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    return path


def main() -> None:
    rng = random.Random(SEED)

    controls = build_controls(rng)
    users = build_users(rng)

    criteria_payload = {
        "_note": NOTE,
        "categories": [
            {"id": cid, "name": name, "tsc": tsc, "summary": summary, "inScope": True}
            for cid, name, tsc, summary in CATEGORIES
        ],
        "outOfScopeCategories": [
            {"id": cid, "name": name, "tsc": tsc, "summary": summary, "inScope": False}
            for cid, name, tsc, summary in OUT_OF_SCOPE_CATEGORIES
        ],
        "criteria": [
            {"id": cid, "category": cat, "categoryName": cat_name, "intent": intent}
            for cid, cat, cat_name, intent in CRITERIA
        ],
    }

    write("company.json", COMPANY)
    write("criteria.json", criteria_payload)
    write("controls.json", {"_note": NOTE, "asOfDate": AS_OF.isoformat(), "controls": controls})
    write("users.json", {"_note": NOTE, "users": users})
    write(
        "permissions.json",
        {
            "_note": NOTE,
            "permissionCatalogue": PERMISSION_CATALOGUE,
            "roleDescriptions": ROLE_DESCRIPTIONS,
            "roles": ROLES,
        },
    )
    write("sod_rules.json", {"_note": NOTE, "rules": SOD_RULES})
    write("benchmark.json", BENCHMARK)

    # ---- summary ----
    by_status: dict[str, int] = {}
    by_evidence: dict[str, int] = {}
    for c in controls:
        by_status[c["status"]] = by_status.get(c["status"], 0) + 1
        by_evidence[c["evidence"]] = by_evidence.get(c["evidence"], 0) + 1

    mapped = {crit for c in controls for crit in c["criteria"]}
    all_criteria = {cid for cid, *_ in CRITERIA}
    unmapped = sorted(all_criteria - mapped)

    violations = []
    for user in users:
        perms = effective_permissions(user["roles"])
        for rule in SOD_RULES:
            if rule["permissionA"] in perms and rule["permissionB"] in perms:
                violations.append((user["name"], rule["id"], rule["severity"]))

    print("ControlPoint synthetic dataset")
    print("-" * 60)
    print(f"Company           : {COMPANY['name']} ({COMPANY['employees']} employees)")
    print(f"Report            : {COMPANY['reportType']}")
    print(f"Audit period      : {PERIOD_START} -> {PERIOD_END}   (as of {AS_OF})")
    print(f"In-scope TSC      : {', '.join(t['code'] for t in COMPANY['inScopeTsc'])}")
    print(f"Criteria modeled  : {len(CRITERIA)}  ({len(all_criteria & mapped)} mapped to >=1 control)")
    print(f"Controls          : {len(controls)}")
    print(f"  by status       : {by_status}")
    print(f"  by evidence     : {by_evidence}")
    print(f"Users             : {len(users)}")
    print(f"Roles             : {len(ROLES)}   Permissions: {len(PERMISSION_CATALOGUE)}")
    print(f"SoD rules         : {len(SOD_RULES)}")
    print(f"SoD violations    : {len(violations)} across {len({v[0] for v in violations})} users")
    high = sum(1 for v in violations if v[2] == 'high')
    print(f"  high severity   : {high}")
    print(f"  medium severity : {len(violations) - high}")
    if unmapped:
        print(f"WARNING: criteria with no control mapped: {unmapped}")
    else:
        print("Every modeled criterion has at least one control mapped to it.")
    print(f"\nWrote 7 files to {DATA_DIR}")


if __name__ == "__main__":
    main()
