# ControlPoint — a SOC 2 Type II readiness advisor

A GRC web app that assesses how ready a fictional payments SaaS company would be
for a **SOC 2 Type II** examination. It maps 55 controls to the Trust Services
Criteria, computes a transparent readiness score that penalizes evidence a Type
II opinion could not rely on, detects segregation-of-duties conflicts in the
access listing, and turns the result into a ranked remediation plan with a
readiness-lift projection.

**Live demo: [controlpoint.vercel.app](https://controlpoint.vercel.app)**

---

> ### Please read this first
>
> **Educational concept — not affiliated with BPM or the AICPA. Company,
> controls, evidence, and access data are synthetic. Not an official SOC 2
> assessment or opinion.**
>
> This app estimates *readiness*, which is not the same thing as an examination.
> It does not produce a SOC 2 report, an auditor's opinion, or any form of
> attestation, and nothing in it should be used to make decisions about a real
> environment. NimbusPay does not exist; neither do its 62 employees, its
> controls, or its test results. The SOC 2 framework structure is modeled
> accurately, but the AICPA's Trust Services Criteria text is copyrighted and is
> **paraphrased in plain language**, never reproduced.

---

## What it does

| Tab | What it shows |
| --- | --- |
| **Dashboard** | Readiness gauge against a peer median, four KPIs, risk-weighted coverage for CC1–CC9 plus PI and C, and the controls costing the most readiness points. |
| **Trust Criteria** | All 40 in-scope criteria as clickable cells; the scoping decision — which categories are in scope, which are not, and why. |
| **Controls** | The workpaper: 55 controls, sortable and filterable, with evidence age measured against each control's own expected interval. |
| **SoD Analyzer** | Effective-permission expansion, conflict detection against a 10-rule matrix, a bipartite conflict graph, and each finding traced back to the roles that granted it. |
| **Remediation** | 31 ranked gaps with a reason, an action, an effort estimate, and a "fix the top N → readiness goes from X% to Y%" projection. |
| **Ask the Advisor** | A Claude Haiku call grounded in a compact snapshot of the same computed numbers, with a locally computed fallback when no API key is set. |

Current state of the modeled company: **67% estimated readiness**, 15 open
high-risk controls, 24 controls whose evidence would not support the period, and
**14 access conflicts across 12 of 62 employees**.

---

## A short SOC 2 primer

**Five Trust Services Categories.** Security is required in every SOC 2
examination. The other four are elected by management based on the commitments
the company makes to its customers:

| Category | Required? | In scope here |
| --- | --- | --- |
| **Security** (the Common Criteria) | Always | Yes |
| **Availability** | Elected | No — no contractual uptime commitment |
| **Processing Integrity** | Elected | Yes — merchants are promised payments process completely and once |
| **Confidentiality** | Elected | Yes — contractual protection of merchant and cardholder data |
| **Privacy** | Elected | No — handled through Confidentiality and contract terms |

Scope is a management decision, not the auditor's, and it is the first thing a
reader of the report checks. The app shows the out-of-scope categories with the
reasoning rather than hiding them.

**Security = the Common Criteria, CC1–CC9 (33 criteria).**

| | Category | What it covers |
| --- | --- | --- |
| **CC1** | Control Environment | Ethics, board oversight, structure, competence, accountability |
| **CC2** | Communication and Information | Getting the right information to the right people, internally and externally |
| **CC3** | Risk Assessment | Identifying and analyzing what could go wrong, including fraud |
| **CC4** | Monitoring Activities | Checking that controls work, and reporting when they do not |
| **CC5** | Control Activities | Selecting and deploying controls, including technology controls and policies |
| **CC6** | Logical and Physical Access | Provisioning, least privilege, encryption, physical access |
| **CC7** | System Operations | Vulnerability management, monitoring, incident response |
| **CC8** | Change Management | Authorizing, testing, and approving changes before production |
| **CC9** | Risk Mitigation | Business disruption and vendor risk |

**Type I vs Type II.** A Type I opinion covers whether controls are *designed*
appropriately at a single point in time. A **Type II** covers whether they
*operated effectively* across a period — here, 1 July to 31 December 2025. That
distinction drives the whole app: a control that plainly exists but cannot be
shown to have run every quarter, every deploy, and every termination is the most
common way a first Type II goes wrong, and the score is built to make that
visible rather than to reward having a policy document.

---

## How the readiness score works

Auditors distrust black boxes, so the formula is small enough to check by hand,
and the app surfaces it on the page rather than burying it.

1. **Maturity points per control** — `implemented` 1.0, `partial` 0.5,
   `not_implemented` 0.
2. **Evidence multiplier** — `current` 1.0, `stale` 0.6, `missing` 0.3. This is
   the Type II part: a control nobody can evidence may well be running, but it
   cannot be relied on, so it cannot score full marks.

   ```
   effectiveness = maturity × evidence multiplier        (0.0 – 1.0)
   ```
3. **Risk weighting on roll-up** — high 3, medium 2, low 1. A failing high-risk
   control should hurt more than a failing low-risk one.
4. **Criterion coverage** = the risk-weighted mean effectiveness of the controls
   mapped to that criterion. A criterion with no control mapped to it scores
   zero rather than being skipped.
5. **Overall readiness** = the plain, *unweighted* mean of in-scope criterion
   coverage. Criteria are averaged evenly on purpose: an examination does not
   let you pass a criterion by having many controls elsewhere, so a thinly
   covered criterion must not be diluted by a heavily covered one.

**Gap ranking** uses the same engine rather than a second estimate:

```
priority = (readiness points the fix returns × inherent risk weight) ÷ effort cost
```

The readiness points are measured by re-scoring the control set with that
control remediated — not guessed. Dividing by effort is deliberate: it promotes
the cheap fixes that actually move the number, which is how a remediation plan
gets sequenced in practice. Effort is inferred from the shape of the gap
(re-evidencing a control that already runs is cheap; building one that does not
exist is not; continuous technical controls cost more than annual process ones).

The "fix the top N" projection re-scores through that same function, so the
projection can never drift from the score it is projecting.

## How the SoD engine works

Segregation of duties is an IT general control test an auditor would run by hand
against an access listing:

1. **Expand roles into permissions.** Each user's *effective permissions* are the
   union of everything their roles grant. This matters: the dangerous
   combinations are usually formed from two individually reasonable roles, which
   is exactly what a role-by-role review misses.
2. **Check each user against the conflict matrix.** Holding both halves of a
   rule emits a violation carrying the user, both permissions, the roles that
   granted each half, the severity, the rationale, and the criteria it maps to
   (CC6 for least privilege, CC5 for control activities, PI1 where payments are
   involved).
3. **Aggregate.** Totals by severity, which rules fired most (one bad role vs a
   systemic design problem), and the most conflicted individuals.

The seeded findings include the classics: a Controller who kept vendor-master
rights from an earlier role (`create_vendor` + `approve_payment` — the
fictitious-vendor path), an AP manager who can both submit and release payments,
an engineer holding both `deploy_code` and `prod_db_write`, and a Security
Administrator named as data owner for the platform they administer.

The conflict graph uses a deterministic bipartite layout rather than a force
simulation — an auditor needs to find the same person in the same place every
time they open the page.

---

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Recharts** for charts, **lucide-react** for icons
- **Anthropic Claude Haiku** via a Next.js route handler (`/api/ask`)
- **Vitest** for the engine unit tests (61 tests)
- Static JSON generated once by a **Python** script; no database, no runtime
  parsing, every page prerendered

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Optional — to make the Ask-the-Advisor tab call Claude rather than fall back to
a locally computed summary, copy `.env.example` to `.env.local` and set:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without the key the app runs fine; the advisor returns a grounded summary of the
real figures and says clearly that it was computed locally.

Other commands:

```bash
npm test        # vitest — scoring, SoD, remediation, advisor context
npm run data    # regenerate /data/*.json from scripts/gen_data.py
npm run build   # production build
```

## Project layout

```
app/
  page.tsx              Dashboard
  criteria/             Trust Services Criteria explorer
  controls/             Control register (the workpaper)
  sod/                  Segregation of duties analyzer
  remediation/          Ranked gaps + readiness projection
  advisor/              Ask the Advisor
  api/ask/route.ts      Claude Haiku endpoint
components/             UI: gauge, KPI cards, heatmap, tables, conflict graph
lib/
  data.ts               Typed loaders over the generated JSON
  scoring.ts            Readiness engine          (pure, unit-tested)
  sod.ts                Conflict detection        (pure, unit-tested)
  remediation.ts        Gap ranking + projection  (pure, unit-tested)
  advisor.ts            Context assembly for the model
data/                   Generated synthetic dataset
scripts/gen_data.py     One-time data generator
```

### About the data

`scripts/gen_data.py` writes seven JSON files from a fixed seed, so the dataset
is reproducible. The control mix is hand-authored rather than random: most
controls are implemented, several are partial, a few do not exist, and 18 are
implemented with stale evidence — the failure mode a Type II is designed to
surface. CC6 and CC8 carry the heaviest weaknesses deliberately, so the
remediation ranking and the SoD analyzer have genuine findings to work from.

The assessment date is pinned to 15 January 2026 (the start of fieldwork, just
after the period closes) so every evidence-age figure stays deterministic
instead of drifting with the wall clock.

## Deploying

The app is a standard Next.js project and deploys to Vercel with no
configuration:

```bash
npx vercel          # preview
npx vercel --prod   # production
```

Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel project if you
want the advisor tab to call the model. Everything else is static.

---

## What this deliberately does not do

- It does not produce, imply, or simulate a SOC 2 report or an auditor's opinion.
- It does not reproduce the AICPA's criteria text.
- It does not claim the peer benchmark is a real survey — those figures are
  modeled reference points, labeled as such in the app.
- It does not estimate audit outcomes. The projection is an arithmetic
  consequence of the scoring formula, nothing more.
