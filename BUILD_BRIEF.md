# Claude Code Build Brief — "ControlPoint" · a SOC 2 Readiness Advisor (concept prototype)

## ▶ KICKOFF (what the user will say)
This repo will contain: this file (`BUILD_BRIEF.md`) and, once you generate it, the synthetic data under `data/`. **Your job:** read this whole brief, then build the entire project exactly as specified. Follow the build order in Section 10, work autonomously, commit after each step, and only stop to ask if you are genuinely blocked or need a decision this file doesn't answer. Make reasonable choices for anything unspecified and keep moving. **Prioritize correctness of the audit/compliance domain, honesty of labeling, and quality over scope.**

You are building a portfolio piece for a **Risk Assurance / IT Audit internship application** (BPM LLP). BPM is the only California-headquartered firm accredited to perform ISO 27001, FedRAMP, and SOC 1/SOC 2 examinations; SOC 2 for tech/SaaS companies is their core business, and they are pushing toward **continuous compliance** and **AI/GRC risk**. This app must make an auditor think: "this person actually understands SOC 2 and IT general controls."

---

## 0. What we're building & why (read first)
**ControlPoint** is a realistic **GRC / audit-readiness web app** that helps a fictional SaaS company assess how ready it is for a **SOC 2 Type II** examination. It is the audit-world analogue of a product analytics dashboard: it ingests the company's **controls, evidence, and user-access data**, maps everything to the **SOC 2 Trust Services Criteria**, computes a **readiness score**, flags **gaps and control weaknesses**, and produces **prioritized, quantified remediation recommendations**. It includes a standout **Segregation of Duties (SoD) Analyzer** that detects access-control conflicts (an IT general control test), and a **Claude-powered "Ask the Advisor"** box grounded in the company's own data.

This is a **concept prototype**, and it must be **honest**:

**Non-negotiable honesty rules:**
- Persistent label everywhere: **"Educational concept — not affiliated with BPM or the AICPA. Company, controls, evidence, and access data are synthetic. Not an official SOC 2 assessment or opinion."**
- Do not imply this produces a real SOC 2 report or auditor's opinion. It estimates *readiness*, not attestation.
- Use the real SOC 2 framework structure (below) accurately, but do **not** reproduce AICPA's copyrighted criteria text verbatim — paraphrase control intent in plain language.
- All data is modeled/synthetic; say so wherever numbers appear.

## 0.1 SOC 2 domain model (get this right — it's the whole point)
Encode this accurately; it's what signals audit literacy.

- **SOC 2 has 5 Trust Services Criteria (TSC):** **Security** (a.k.a. Common Criteria, **mandatory**), plus four **optional** categories added based on customer commitments: **Availability (A)**, **Processing Integrity (PI)**, **Confidentiality (C)**, **Privacy (P)**.
- **Security = the Common Criteria, CC1–CC9** (33 criteria total). The nine categories:
  - **CC1** — Control Environment
  - **CC2** — Communication and Information
  - **CC3** — Risk Assessment
  - **CC4** — Monitoring Activities
  - **CC5** — Control Activities
  - **CC6** — Logical and Physical Access Controls
  - **CC7** — System Operations
  - **CC8** — Change Management
  - **CC9** — Risk Mitigation
- **Type I vs Type II:** Type I tests whether controls are *designed* appropriately at a point in time; **Type II** tests whether they *operated effectively* over a period (typically 3–12 months). This app targets **Type II readiness**, so evidence must show controls running *over time*, not just existing.
- **Our fictional company** is a **payments SaaS** ("NimbusPay"), so its in-scope TSC are **Security (CC1–CC9) + Processing Integrity + Confidentiality** (payments accuracy + sensitive data). Availability and Privacy are out of scope — show them as "not in scope" so the scoping decision itself is visible (auditors care about scoping).
- **A control** maps to one or more criteria and has: id, title, plain-language description, mapped criteria (e.g., `CC6.1`), implementation status, evidence status, control owner, frequency (continuous / daily / quarterly / annual), last-tested date, and an inherent risk rating.

## 1. Tech stack (use exactly this unless impossible)
- **Framework:** Next.js (App Router, TypeScript) + Tailwind CSS.
- **Charts:** Recharts. **Icons:** lucide-react.
- **AI:** Anthropic Claude API via a Next.js route (`/app/api/ask/route.ts`). Use the **cheapest current model (Claude Haiku)**. Read the key from `process.env.ANTHROPIC_API_KEY`; never hardcode. Degrade gracefully if the key is missing.
- **Data:** pre-generated static JSON in `/data/*.json` from a one-time Python script. The app reads JSON; it does not parse CSVs at runtime.
- **Deploy:** Vercel, single deploy, no server-only DB.

## 2. Data generation (Phase 1 — Python `scripts/gen_data.py`)
Generate realistic, internally consistent synthetic data. Print a summary when done. Write these files to `/data/`:

1. **company.json** — NimbusPay profile: name, "payments SaaS," employee count (~120), in-scope TSC (Security, PI, Confidentiality), target report type (Type II), audit period (e.g., 2025-07-01 → 2025-12-31), and a `_note` honesty field.
2. **controls.json** — ~40–55 controls spanning **all of CC1–CC9** plus PI and Confidentiality criteria. For each: `id`, `title`, `description` (plain language), `criteria` (array like `["CC6.2"]`), `status` (`implemented` | `partial` | `not_implemented`), `evidence` (`current` | `stale` | `missing`), `owner` (role), `frequency`, `lastTested` (date, some old/stale to create Type II gaps), `inherentRisk` (`high`|`medium`|`low`). Deliberately seed a realistic mix: most implemented, several `partial`, a few `not_implemented`, and some `implemented`-but-`stale`-evidence (a classic Type II failure: control exists but can't be proven to have operated all period). Ensure **CC6 (access)** and **CC8 (change management)** have some weaknesses so recommendations and the SoD module have something to fire on.
3. **users.json** — ~60 synthetic employees: `userId`, `name`, `department`, `title`, and `roles` (array of system roles like `AP_Clerk`, `AP_Approver`, `Vendor_Admin`, `Developer`, `Prod_DBA`, `Payroll_Admin`, `Security_Admin`).
4. **permissions.json** — map each **role → set of permissions** (e.g., `AP_Approver → ["approve_payment"]`, `Vendor_Admin → ["create_vendor","edit_vendor"]`, `Developer → ["deploy_code"]`, `Prod_DBA → ["prod_db_write"]`).
5. **sod_rules.json** — a **Segregation of Duties conflict matrix**: pairs of permissions that must not be held by the same person, each with a rationale and severity. Include classic conflicts, e.g.:
   - `create_vendor` + `approve_payment` (fictitious-vendor fraud risk) — high
   - `initiate_payment` + `approve_payment` (self-approval) — high
   - `deploy_code` + `prod_db_write` without review (unauthorized change) — high
   - `create_user` + `approve_access` (privilege self-grant) — medium
   Seed the user/role data so that **several real SoD violations exist**.
6. **benchmark.json** — peer benchmark for a similar-size SaaS: median readiness %, median open high-risk gaps, median days-since-evidence. Used for "companies like you."
7. Every JSON gets a `_note`: "Synthetic data for an educational SOC 2 readiness concept. Not a real assessment."

## 3. App structure (Phase 2)
```
/app
  layout.tsx              (shell: top bar + left sidebar + persistent honesty banner)
  page.tsx                (Dashboard / readiness overview)
  /criteria/page.tsx      (TSC & Common Criteria coverage explorer)
  /controls/page.tsx      (controls register — the audit workpaper table)
  /sod/page.tsx           (Segregation of Duties Analyzer — the standout feature)
  /remediation/page.tsx   (prioritized gap remediation plan)
  /advisor/page.tsx       (Ask-the-Advisor Claude box)
  /api/ask/route.ts
/components               (KpiCard, ReadinessGauge, CriteriaHeatmap, ControlsTable, SoDGraph, GapCard, Banner, Sidebar, TopBar)
/lib
  data.ts                 (typed loaders)
  scoring.ts              (readiness scoring engine — pure, unit-tested)
  sod.ts                  (SoD conflict detection — pure, unit-tested)
  remediation.ts          (gap ranking — pure, unit-tested)
/data
```
Sidebar order: Dashboard · Trust Criteria · Controls · **SoD Analyzer (NEW badge)** · Remediation · Ask the Advisor.

## 4. Per-tab specs (populate ALL — no empty tabs)
- **Dashboard:** overall **Readiness Gauge** (0–100%); KPI cards (controls implemented %, open high-risk gaps, controls with stale/missing evidence, SoD violations); a **CC1–CC9 readiness bar/heatmap**; "companies like you" vs benchmark; the Type II audit-period banner.
- **Trust Criteria:** a **heatmap/grid of CC1–CC9 (+ PI, C)** showing coverage and weakest areas; click a criterion → the controls mapped to it and its status. Show which TSC are **in scope vs not in scope** and explain scoping in one line.
- **Controls (the workpaper):** sortable/filterable table — id, title, criteria, status, evidence, owner, frequency, last tested, inherent risk. Filters by status/criteria/risk. Visually flag `stale` evidence and `not_implemented`. This should look like an auditor's control matrix.
- **SoD Analyzer (THE FEATURE):**
  - Compute each user's effective permissions (union of their roles' permissions), then detect violations against `sod_rules`.
  - **Violations table:** user, the conflicting permission pair, the roles that granted them, severity, and the rationale (why it's a risk).
  - **Conflict graph:** a simple node-link view (users ↔ conflicting permissions) highlighting violators; keep it readable (filter to violators). This is where the graph/data skill shows.
  - **Summary:** # users with conflicts, by severity, mapped to **CC6 (Logical Access)** and **CC5 (Control Activities)**. Include a short "why this matters to an auditor" note.
- **Remediation:** ranked **GapCards** from the engine — each gap has a title, the criterion it affects, why it matters (the risk), an **estimated effort** (low/med/high), a **priority score**, and a concrete recommended action. Rank by risk × (inverse effort). Show a "if you fix the top N, readiness goes from X% → Y%" projection.
- **Ask the Advisor:** Claude box; user asks e.g. "What's blocking my Type II readiness?" or "Which SoD conflict is most urgent?"; answers grounded in the JSON. Show 3–4 suggested questions.

## 5. Readiness scoring engine (`/lib/scoring.ts`) — pure, testable
Return a transparent, defensible score (auditors distrust black boxes):
- Per control **maturity points:** `implemented`=1.0, `partial`=0.5, `not_implemented`=0. Apply an **evidence multiplier** for Type II: `current`=1.0, `stale`=0.6, `missing`=0.3 (a control with no evidence can't be relied on over a period).
- **Criterion coverage** = weighted average of its mapped controls' (maturity × evidence).
- **Overall readiness** = average of in-scope criteria coverage, expressed 0–100%. Weight **high-inherent-risk** controls more.
- Return structured output: overall %, per-criterion %, counts (implemented/partial/missing, stale evidence, high-risk open), and the list of the biggest drags on the score. Document the formula in code comments and surface a one-line "how this is calculated" in the UI (no hidden magic).

## 6. SoD analyzer (`/lib/sod.ts`) — pure, testable
- Input: users, role→permission map, SoD conflict rules.
- For each user: compute effective permissions; for each conflict rule, if the user holds **both** sides, emit a violation `{userId, name, permissionA, permissionB, viaRolesA, viaRolesB, severity, rationale, mappedCriteria:["CC6.1","CC5.2"]}`.
- Aggregate: totals by severity; list top offenders. Unit-test with a tiny fixture proving a known conflict is caught and a clean user is not.

## 7. Claude API (`/api/ask/route.ts`)
- Build a **compact** context string from company + a summarized controls/gaps/SoD snapshot (not raw dumps — keep tokens small).
- System prompt: *"You are a SOC 2 readiness advisor for a synthetic company. Answer ONLY from the provided data. Be concise, specific, and quantified. Reference the relevant Common Criteria (CCx) when useful. If the data doesn't support an answer, say so. You do not issue audit opinions."*
- Claude **Haiku**. Return text. Friendly fallback if the key is missing so the app still runs.

## 8. Styling (clean, professional, audit-firm feel)
- Light theme, white surfaces, subtle borders, rounded cards, generous spacing — a serious GRC-tool look (think a compliance SaaS, not a consumer app).
- One restrained accent color for primary actions and the SoD highlight. **Never encode meaning with red/green alone** (add icons/labels — accessibility, and auditors read status text).
- Persistent **honesty banner** at the very top on every page.
- Responsive; looks right on a recruiter's laptop.

## 9. Quality bar / acceptance criteria
- Every tab renders real, non-placeholder data. No lorem ipsum, no empty tabs.
- SOC 2 structure is **accurate**: CC1–CC9, mandatory Security, optional TSC, Type II framing, scoping shown.
- The **SoD analyzer catches the seeded violations** and explains each; unit tests pass.
- The **readiness score is transparent** and recomputes from the JSON; formula documented and surfaced.
- Remediation gives ≥3 prioritized, quantified, plainly-justified actions with a readiness-lift projection.
- Ask-box returns grounded, quantified answers (or degrades gracefully).
- Numbers formatted consistently (%, counts, dates). Loads fast, no console errors, deploys clean to Vercel.
- **README** with: what it is, the honesty note, the SOC 2 primer (5 TSC + CC1–CC9 + Type I vs II), the stack, how to run, the live link, and a short "how the readiness score and SoD engine work" section.

## 10. Build order (commit after each)
1. Scaffold Next.js + Tailwind; add honesty Banner, Sidebar, TopBar, routing for all tabs (empty first).
2. Write `scripts/gen_data.py`; generate `/data/*.json`; commit the JSON.
3. `/lib/data.ts` typed loaders.
4. `/lib/scoring.ts` + unit tests; build the Dashboard + Trust Criteria views.
5. Controls register table.
6. `/lib/sod.ts` + unit tests; build the SoD Analyzer tab (table + graph).
7. `/lib/remediation.ts` + Remediation tab with the readiness-lift projection.
8. `/api/ask` + Ask-the-Advisor box.
9. Polish styling; format numbers; full QA across tabs.
10. README; deploy to Vercel; put the live URL in the README.

## 11. Deliverables
- Deployed Vercel URL (the demo).
- Clean GitHub repo with README.
- `/data` JSON + `scripts/gen_data.py`.
- Keep this brief in the repo as `BUILD_BRIEF.md`.

**Remember:** a tight, accurate, honestly-labeled SOC 2 readiness tool that gets the framework right and catches real SoD conflicts beats a big flashy one. Domain correctness + honesty are the whole point.

---

### Resume one-liner when done (fill in real numbers)
> "Built a SOC 2 Type II readiness web app: modeled a SaaS company's controls against the Trust Services Criteria (CC1–CC9), computed a transparent readiness score with Type II evidence weighting, and built a Segregation of Duties analyzer that flags access-control conflicts (e.g., create-vendor + approve-payment) mapped to CC6."

### Sources (domain grounding — for your own reference, not the app)
- SOC 2 Trust Services Criteria & CC1–CC9: https://secureframe.com/hub/soc-2/common-criteria · https://drata.com/learn/soc-2/trust-services-criteria
- BPM Risk Assurance identity (SOC 2 / ISO 27001 / FedRAMP): https://www.bpm.com/news/inforisk-joins-bpm-llp-expanding-information-security-assessment-services/
