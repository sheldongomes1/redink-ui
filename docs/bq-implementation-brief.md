# RedInk UI — Implementation Brief: Next.js + BigQuery

**Context for the agent:**
RedInk is an AI-powered financial anomaly detection tool for equity analysts. It flags Nasdaq-100 companies whose quarterly SEC filings showed statistical anomalies — scored across three independent pillars: statistical divergence (Mahalanobis), earnings quality (Beneish M-Score), and management transparency (narrative divergence vs MD&A). The current UI is a working prototype in `prototype.html` (vanilla JS + React via CDN). This brief migrates it to a proper Next.js app connected to live BigQuery data.

---

## Architecture Decision: Next.js App Router on Cloud Run

**Why Next.js, not Vite + static:**
BigQuery credentials cannot be exposed to the browser. All BQ queries must run server-side. Next.js App Router server components and API routes handle BQ queries on the server, return JSON to the client — credentials never leave Cloud Run. This is the standard GCP pattern.

**Stack:**
- Next.js 14+ (App Router)
- Tailwind CSS (existing style guide in `docs/style-guide.md`)
- Recharts for trend charts
- Google Cloud BigQuery Node.js client (`@google-cloud/bigquery`) — server-side only
- GCP Application Default Credentials (ADC) — no API keys in code
- Deploy target: Google Cloud Run (`qqq-anomaly-lab` GCP project)

---

## Data Sources — BigQuery Tables

**GCP Project:** `qqq-anomaly-lab`
**Dataset:** `qqq_finance`

---

### Source 1 — `qqq_finance.top_anomaly_review_pack` (materialized table)
**Primary list query.** Pre-filtered to ALERT + FLAG + WATCH tiers only, sorted by `conviction_score DESC`. Use this for the anomaly list panel — it's small (~100–200 rows), fast, and already ranked.

**Why this and not the full table:** The full `filing_intelligence` view has 1,371 rows. Loading all of them on page load kills TTI. The review pack is the curated set — the filings actually worth an analyst's attention. The full view is available for advanced filtering in a future version.

**Powers:** Anomaly list panel (left side). All list-level fields: ticker, company_name, calendar_quarter, gics_sector, conviction_tier, conviction_score, anomaly_score_0_100, top_driver_1, divergence_label, pattern_name, filing_url.

**Key query:**
```sql
SELECT ticker, company_name, calendar_quarter, gics_sector, report_date,
       conviction_tier, conviction_score, anomaly_score_0_100,
       top_driver_1, top_driver_1_value, top_driver_2, top_driver_2_value,
       top_driver_3, top_driver_3_value,
       divergence_label, divergence_confidence, mda_tone,
       pattern_name, pattern_summary,
       beneish_manipulation_flag, beneish_m_score,
       pillar_anomaly, pillar_earnings, pillar_transparency,
       filing_url
FROM `qqq-anomaly-lab.qqq_finance.top_anomaly_review_pack`
ORDER BY conviction_score DESC
```

---

### Source 2 — `qqq_finance.filing_intelligence` (BQ view)
**Full detail query.** Joins all four pipeline tables (scores + conviction + explanations + divergence) into one flat row per filing. Use this for the detail panel — load lazily when a user clicks a row.

**Why a view not a materialized table:** The view always reflects the latest pipeline run without a separate copy step. For a per-row lookup (one ticker + one quarter), latency is ~1–2s — acceptable for a detail panel.

**Powers:** Anomaly detail panel (right side). All detail-level fields including: `explanation_brief` (3-paragraph analyst brief), `cited_passage` (verbatim MD&A quote), `divergence_rationale`, `anomaly_acknowledged`, `beneish_dsri/gmi/aqi/sgi/depi/sgai/tata/lvgi` (8 Beneish components), `self_history_score`, `peer_relative_score`, `peer_count`, `combined_z__*` per feature, `scoring_version`, `scored_at`.

**Key query:**
```sql
SELECT *
FROM `qqq-anomaly-lab.qqq_finance.filing_intelligence`
WHERE ticker = @ticker AND calendar_quarter = @calendar_quarter
LIMIT 1
```

---

### Source 3 — `qqq_finance.company_trend` (materialized table, clustered by ticker)
**Time-series query.** One row per (ticker, quarter) with pre-computed z-scores per metric, conviction scores, and narrative signals. Clustered by ticker — BQ skips all other ticker data on each query, making per-ticker lookups fast regardless of table size (~7,000+ rows).

**Why pre-computed:** Computing trend data on the fly from `quarterly_scores_detailed` would require a full table scan + pivot. The trend table is pre-joined and pre-formatted — the UI receives a flat array it can pass directly to Recharts with no client-side transformation.

**Powers:** Trend sparkline / time-series chart in the detail panel showing conviction_score over time, pillar breakdown per quarter, and which metrics drove the anomaly historically.

**Key query:**
```sql
SELECT calendar_quarter, report_date, conviction_score, conviction_tier,
       pillar_anomaly, pillar_earnings, pillar_transparency,
       anomaly_score_0_100, beneish_m_score, beneish_manipulation_flag,
       z_revenue_growth_yoy, z_net_margin, z_ocf_to_net_income,
       z_assets_growth_yoy, z_debt_to_assets, z_accrual_ratio,
       divergence_label, mda_tone, pattern_name
FROM `qqq-anomaly-lab.qqq_finance.company_trend`
WHERE ticker = @ticker
ORDER BY report_date ASC
```

---

### Source 4 — `qqq_finance.eval_scores` (to be created — upload judge_evals_v2.csv)
**Eval confidence query.** Contains per-(ticker, calendar_quarter) judge eval scores: faithfulness_score, direction_accuracy_score, actionability_score, avg_judge_score, direction_label_match, and one-sentence rationales from each judge. Currently lives in `qqq-eval-suite/results/judge_evals_v2_*.csv` — needs to be uploaded to BQ once before the UI can query it.

**Why BQ and not a bundled file:** Consistency. All live data comes from BQ. When the judge runs on new output versions (v4+), a single re-upload keeps the UI current without a redeploy.

**Powers:** Eval Confidence Panel (see `qqq-eval-suite/docs/redink_eval_ui_spec.md`): AI Confidence Badge, Quality Breakdown Panel (dot indicators + rationale text), Analyst Action Prompt, Eval Metadata footnote.

**Key query:**
```sql
SELECT faithfulness_score, faithfulness_rationale,
       direction_accuracy_score, direction_accuracy_rationale,
       actionability_score, actionability_rationale,
       avg_judge_score, direction_label_match
FROM `qqq-anomaly-lab.qqq_finance.eval_scores`
WHERE ticker = @ticker AND calendar_quarter = @calendar_quarter
LIMIT 1
```

---

### Source 5 — `qqq_finance.golden_cases` (to be created — upload golden_dataset.csv filtered to is_blow_up_case=TRUE)
**Anchor badge lookup.** Small lookup table — only rows where `is_blow_up_case = TRUE`. Currently ~1 row (APP 2024-Q1). Queried once on page load and cached client-side.

**Why BQ and not hardcoded:** As more confirmed blow-up cases are added to the golden dataset, the UI reflects them automatically on next pipeline run + upload. No code change needed.

**Powers:** Golden Dataset Anchor Badge (gold star ★ next to ticker, `case_notes` tooltip).

**Key query:**
```sql
SELECT ticker, calendar_quarter, case_notes
FROM `qqq-anomaly-lab.qqq_finance.golden_cases`
WHERE is_blow_up_case = TRUE
```

---

## Reference Files (read before building)
- `redink-ui/prototype.html` — working prototype, migrate the design and UX patterns
- `redink-ui/docs/style-guide.md` — Stripe-inspired white UI, typography, color system
- `redink-ui/docs/PLAN.md` — layout spec and component breakdown
- `redink-ui/docs/video-storyboards.md` — demo flow (tells you what the recruiter sees first)
- `redink-ui/instructions.md` — full column reference, score interpretation bands, driver display rules
- `qqq-eval-suite/docs/redink_eval_ui_spec.md` — eval confidence panel spec (Components 1–5)

---

## Pre-work before starting (do these first)
1. Upload `qqq-eval-suite/results/judge_evals_v2_*.csv` → BQ table `qqq_finance.eval_scores`
2. Upload `qqq-eval-suite/data/golden_dataset.csv` (is_blow_up_case=TRUE rows only) → BQ table `qqq_finance.golden_cases`
3. Confirm `qqq_finance.top_anomaly_review_pack` and `qqq_finance.company_trend` exist and have data

---

## Hero Demo Row — validate this works before polishing anything else
**WBD, 2022-Q2:** conviction_tier = ALERT, divergence_label = CONTRADICTS, cited_passage is a real sentence from the MD&A, conviction_score at or near top of list.
**APP, 2024-Q1:** gold star anchor badge visible, `is_blow_up_case = TRUE`.

---

## What NOT to Build
- No trading signals or buy/sell recommendations
- No user authentication (v0 scope)
- No CSV export (post-demo)
- No backend beyond Next.js API routes — no separate Express/FastAPI service
- Do not read from local CSV files — BQ only
