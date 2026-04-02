# RedInk — Claude Code Project Instructions (vfinal)

## What This Product Is
RedInk is an AI-powered financial anomaly detection tool for equity analysts.
It identifies quarters where a company's financial metrics diverged sharply from
both its own historical baseline and its QQQ peer group — flagging filings that
warrant closer analyst review.

RedInk is eval-first. Every anomaly flag surfaces a score, a structured driver
explanation, trust indicators, and a direct SEC filing link so the analyst can
verify the evidence themselves. No black boxes. No trading signals.

## Who This Is For
**Primary user:** Junior to mid-level equity analyst at a small or mid-size
investment firm. Reviews 10-Q and 10-K filings regularly. Does not have
Bloomberg or AlphaSense. Needs a fast way to triage which filings deserve
closer attention.

**Secondary viewer:** Hiring manager or PM reviewer evaluating this as a
portfolio piece. Should understand the product's value within 10 seconds of
landing on it.

---

## Architecture — What Exists, What Claude Code Builds

### Do not rebuild or touch these layers:
- **Data extraction:** Built in Cursor. Connects to SEC EDGAR, cleans raw
  filing data, outputs structured JSON.
- **Anomaly scoring:** Built in GCP / BigQuery. Uses robust Mahalanobis
  distance scoring across QQQ constituent filings. Model version:
  `brick3_q_v2_robust_mahalanobis_clipped`.

### What Claude Code builds:
- The entire analyst-facing UI
- The in-app review and eval interface
- All front-end logic, layout, filtering, and state

### Data source for the UI:
Load from CSV only. No direct BigQuery connection. No backend API in v0.

---

## Data Files

### `top_anomaly_review_pack.csv` — PRIMARY (use this for all v0 development)
30 rows. The highest-confidence anomaly flags from the full dataset.
Score range: 97.8 to 100.0. This is the golden demo dataset.

### `quarterly_scores.csv` — FULL DATASET (design for this from day one)
1,354 rows. All scored QQQ filings. The UI filters, search, and pagination
must be architected to handle this volume, even if v0 only loads the review pack.

### `quarterly_scores_detailed.csv` — EXTENDED (future use)
1,354 rows. Includes self z-scores and peer z-scores per feature. Use this
when building the advanced feature breakdown view in v1.

---

## Column Reference

| Column | Meaning |
|---|---|
| `ticker` | Stock ticker (e.g. WBD, FANG, MAR) |
| `company_name` | Company name (may be blank — display ticker if blank) |
| `report_date` | Quarter end date (e.g. 2022-06-30) |
| `filing_date` | Date the 10-Q/10-K was filed with the SEC |
| `filing_url` | Direct link to the SEC EDGAR filing HTML |
| `anomaly_score_0_100` | Main score. 100 = most anomalous. Always show prominently. |
| `mahalanobis_distance` | Raw statistical distance. Do not display directly. |
| `self_history_score` | Unusualness vs the company's own history (z-score scale) |
| `peer_relative_score` | Unusualness vs QQQ peers (z-score scale) |
| `combined_signal_strength` | Composite of self + peer. Use for secondary display. |
| `num_features_used` | Features contributing to score (max 8). Core trust signal. |
| `top_driver_1` | Top contributing feature name |
| `top_driver_1_value` | Z-score magnitude of top driver |
| `top_driver_2` | Second driver name |
| `top_driver_2_value` | Second driver z-score |
| `top_driver_3` | Third driver name |
| `top_driver_3_value` | Third driver z-score |
| `driver_summary` | Pipe-delimited plain-English driver explanation. Use in UI. |
| `revenue_growth_yoy` | Raw revenue growth year-over-year |
| `assets_growth_yoy` | Raw asset growth year-over-year |
| `net_income_growth_yoy` | Raw net income growth year-over-year |
| `net_margin` | Net income / revenue |
| `debt_to_assets` | Debt / total assets |
| `equity_to_assets` | Equity / total assets |
| `accrual_ratio` | Accruals relative to assets. High = potential earnings quality issue. |
| `ocf_to_net_income` | Operating cash flow vs net income. Low = earnings may not be cash-backed. |

---

## Driver Name Display Map
Always render driver names in human-readable form:
- `revenue_growth_yoy` → "Revenue Growth (YoY)"
- `assets_growth_yoy` → "Asset Growth (YoY)"
- `net_income_growth_yoy` → "Net Income Growth (YoY)"
- `net_margin` → "Net Margin"
- `debt_to_assets` → "Debt / Assets"
- `equity_to_assets` → "Equity / Assets"
- `accrual_ratio` → "Accrual Ratio"
- `ocf_to_net_income` → "OCF / Net Income"

---

## Score Interpretation
**Anomaly score (0–100):**
- 95–100: Extreme anomaly. Very likely worth analyst review.
- 85–94: High anomaly. Strong signal.
- 70–84: Moderate anomaly. Worth monitoring.
- Below 70: Low signal. Not shown in top review pack.

**Driver z-score values:**
- 8.0 = capped maximum (extremely far from baseline)
- 3.0–7.9 = significantly elevated
- 1.0–2.9 = mildly elevated
- Negative = below baseline (e.g. margin collapse, cash flow deterioration)

---

## Driver Score — What It Means and How to Display It

### Definition
A driver score is a standardized anomaly signal for one financial metric. It
measures how unusually high or low that metric is relative to:
1. the company's own historical pattern, and
2. current QQQ peer behavior.

It is a strength-of-deviation score — not a dollar impact, percentage change,
or valuation signal.

- **Positive driver score** = metric is unusually above baseline
- **Negative driver score** = metric is unusually below baseline
- **Larger absolute value** = stronger contribution to the anomaly

### Interpretation Bands (use absolute value)
| Absolute Value | Meaning | UI Treatment |
|---|---|---|
| 0 to 1 | Normal variation | Do not highlight |
| 1 to 2 | Mild deviation | Low emphasis |
| 2 to 3 | Meaningful deviation | Medium emphasis |
| 3 to 5 | Strong anomaly signal | High emphasis, investigate |
| 5+ | Extreme anomaly signal | Critical — major reason for flag |
| 8 / -8 | Clipped extreme (model ceiling) | Show as "MAX" or ceiling indicator |

### How Driver Scores Combine Into the Anomaly Score
The overall anomaly score reflects the combined pattern across all driver scores.
A quarter ranks highly when:
- several metrics move together in an unusual direction, or
- one or two metrics move extremely far from baseline.

A driver score of ±5 or more is usually a primary reason a quarter appears in
the top anomaly list.

### UI Rules for Rendering Driver Scores
- Always show direction: positive = above baseline (↑), negative = below baseline (↓)
- Always show the absolute magnitude as a bar width or fill percentage
- Cap bar display at 8.0 — if value is 8.0, show a visual ceiling indicator
- Color coding: positive above baseline = amber/orange, negative below = red,
  mild deviation = grey
- Never show the raw z-score number alone — always pair with the direction label
  and interpretation band label (e.g. "Strong" or "Extreme")

### Tooltip Text for Driver Score (show on hover)
"This score shows how unusually this metric moved relative to the company's
history and QQQ peers. Higher absolute values indicate stronger contribution
to the anomaly flag. Positive means above baseline; negative means below baseline."

### What Analysts Should Take From It
- High positive driver → metric is unusually strong or elevated
- High negative driver → metric is unusually weak or depressed
- Multiple strong drivers → likely a broader regime shift, not a one-off move

### What It Does NOT Mean (never imply in UI copy)
- It is not a direct measure of stock price impact
- It is not a valuation signal
- It is not proof of fraud or misstatement
- It is not a percent change in the metric itself

It is a ranking-and-investigation signal. The UI must reinforce this framing.

### Example Interpretations for UI Reference
- `net_margin = -4.5` → "Net margin was materially below normal and was a
  strong contributor to the anomaly."
- `revenue_growth_yoy = +8.0` → "Revenue growth hit the model's ceiling,
  making it one of the strongest drivers of this flag."
- `accrual_ratio = -2.3` → "Accrual behavior was meaningfully below baseline
  and may point to earnings-quality dynamics worth reviewing."

---

## UI Design Philosophy
- **Eval-first:** Every flag must show its evidence. Never show a score alone.
- **Trust visible:** Score, driver count, model version, and filing link status
  must always be present on the detail view.
- **Structured evidence first:** Drivers before narrative. Numbers before prose.
- **Verifiable:** Every anomaly must link directly to the SEC filing.
- **No black boxes:** If the user can't see why something was flagged, the UI
  has failed.
- **Financial aesthetic:** Dark or neutral palette. Dense but readable.
  Think Bloomberg-lite, not consumer app.

---

## Full UI Layout

### Left Panel — Anomaly List
- Ranked by `anomaly_score_0_100` descending by default
- Each row shows:
  - Ticker (bold)
  - Report date
  - Anomaly score (color-coded badge: red 95+, orange 85–94, yellow 70–84)
  - Top driver name (human-readable)
  - Review status indicator (reviewed / unreviewed dot)
- Filters:
  - Ticker (text search)
  - Year (dropdown)
  - Score threshold (slider or dropdown)
  - Review status (all / unreviewed / reviewed)
- Clicking a row loads the detail panel

### Right Panel — Anomaly Detail
**Header section:**
- Ticker + company name (large)
- Report date + filing date
- Anomaly score (large color-coded badge)
- Self history score + peer relative score (two smaller supporting numbers)

**Driver section:**
- Top 3 driver bars or cards
- Each shows: human-readable driver name + z-score magnitude + direction indicator
- Driver summary paragraph rendered from `driver_summary` field

**Metrics table:**
Show these four raw metrics always:
- Revenue Growth (YoY)
- Net Margin
- Net Income Growth (YoY)
- OCF / Net Income

**Trust chips (always visible):**
- `{num_features_used} features used`
- `Model: brick3_q_v2`
- `Filing link ✓` or `Filing link ✗`
- `Self + Peer scoring` if both scores present, `Peer only` if self is missing

**SEC Filing button:**
- Prominent button that opens `filing_url` in a new tab
- If filing_url is missing, show disabled state with tooltip

**Review interface (Brick 9 — build this from day one, not as a bolt-on):**
- Three buttons below the detail: `✓ Good` | `⚠ Needs Review` | `✗ Skip`
- Selecting a label updates the row's review status in app state
- Reviewed rows show their label on the list panel (small badge)
- Store review state in localStorage so it persists across page refreshes
- In v1 this will export to CSV — design the state shape with that in mind

---

## Explanation Paragraph Logic
Generate from `driver_summary` using this template:

"This quarter was flagged because [parsed driver summary in plain English].
The anomaly score of [score] reflects divergence from both the company's own
historical range and its QQQ peer group. [If self_history_score >
peer_relative_score: 'The divergence is strongest relative to the company's
own history.' Else: 'The divergence is strongest relative to QQQ peers.']
Review the linked SEC filing for management commentary and financial statement
detail."

Parse `driver_summary` by splitting on ` | ` and rendering each clause as a
natural sentence.

---

## Eval Status and Review State
Every anomaly row has a review status. Default is `unreviewed`.

Possible states:
- `unreviewed` — default, no action taken
- `good` — analyst confirmed this is a meaningful flag
- `needs_review` — flag is present but explanation needs improvement
- `skip` — not useful for this version

The left panel list must visually distinguish these states at a glance.
The filter panel must allow filtering by review status.

This is not cosmetic. The review interface is the eval loop that makes
RedInk an eval-first product rather than just a dashboard.

---

## Trust Chips — Always Render These
On every detail panel, always show:
- Number of features used (from `num_features_used`)
- Model version string: `brick3_q_v2`
- Filing link status (present or missing)
- Scoring coverage: self + peer, or peer only

These are non-negotiable. They are the product's claim to trustworthiness.

---

## Release Gate Philosophy (Brick 11)
The app should never be considered shippable unless:
- 80%+ of anomaly explanations are marked "good" or "needs review" (not skip)
- 100% of displayed rows have a valid filing URL
- All trust chips render correctly for every row
- No duplicate rows visible in the UI

Claude Code should treat these as acceptance criteria, not aspirational goals.

---

## Version Roadmap — Build With This in Mind

### v0 (tonight / this weekend)
- Load top_anomaly_review_pack.csv (30 rows)
- Two-panel layout with list and detail
- Driver bars, trust chips, explanation paragraph
- SEC filing link
- Review buttons with localStorage persistence

### v1 (next weekend)
- Load full quarterly_scores.csv (1,354 rows)
- Pagination or virtual scrolling on list panel
- Export reviewed anomalies to CSV
- Add self z-score vs peer z-score breakdown using quarterly_scores_detailed.csv
- Improve explanation quality scoring

### v2 (deployment)
- Deploy to Google Cloud Run
- Connect to BigQuery for live scoring data (replace CSV)
- Add release gate dashboard showing eval metrics

---

## Tech Stack
- React (functional components and hooks only)
- Tailwind CSS for all styling
- PapaParse for CSV loading
- localStorage for review state persistence
- No backend in v0 or v1
- No authentication in v0 or v1

---

## What NOT to Build (Ever)
- Trading signals or buy/sell recommendations
- Stock price charts or price data
- Portfolio construction tools
- Direct BigQuery connection in v0/v1
- User login or authentication in v0/v1

---

## Model and Scoring Reference
Full version string: `brick3_q_v2_robust_mahalanobis_clipped`
Display as: `brick3_q_v2`
Method: Robust Mahalanobis Distance (Minimum Covariance Determinant)
Features used: up to 8 per row (revenue growth, asset growth, net income growth,
net margin, debt/assets, equity/assets, accrual ratio, OCF/net income)
Coverage: QQQ constituents, 10-Q and 10-K filings

---

## Hero Demo Example — Use for All Testing and Design Decisions
**WBD (Warner Bros. Discovery) — Q2 2022**
- Anomaly score: 100.0
- Self history score: 4.29 | Peer relative score: 3.85
- Top drivers: Revenue growth far above baseline (8.0) | Asset growth far
  above baseline (8.0) | Net margin deeply negative (-5.9955)
- Net margin raw value: -34.8% (severe margin collapse)
- Features used: 8 of 8
- Filing: https://www.sec.gov/Archives/edgar/data/1437107/000143710722000209/disca-20220630.htm
- Why it matters: Classic RedInk case. Revenue and assets surging (post-merger
  with Discovery) while profitability collapsed. Exactly the kind of divergence
  a junior analyst should be triage-ing but would likely miss without a tool.

---

## Course Progress

**Repo:** `github.com/exiao/claude-code-course`

| # | Lesson File | Title | Status |
|---|-------------|-------|--------|
| 01 | 01-course-overview.md | Welcome to Claude Code | ✅ Complete |
| 02 | 02-first-site.md | First Site | ✅ Complete |
| 03 | 03-copy-and-customize.md | Copy and Customize | ✅ Complete |
| 04 | 04-bring-your-context.md | Bring Your Context | ✅ Complete |
| 05 | 05-leverage-plans.md | Leverage Plans | ✅ Complete |
| 06 | 06-brainstorm-features.md | Brainstorm Features | ✅ Complete |
| 07 | 07-skills-exercise.md | Skills Exercise | ✅ Complete |
| 08 | 08-style-guide-exercise.md | Style Guide Exercise | 🔄 **Current** |
| 09 | 09-analyze-exercise.md | Analyze Exercise | ⬜ Not started |
| 10 | 10-analyze-your-data.md | Analyze Your Data | ⬜ Not started |
| 11 | 11-automate-your-documentation.md | Automate Your Documentation | ⬜ Not started |
| 12 | 12-create-your-chief-of-staff.md | Create Your Chief of Staff | ⬜ Not started |
| 18e | 18e-github-exercise.md | GitHub Exercise | ✅ Complete |
| 19e | 19e-architecture-exercise.md | Architecture Exercise | ✅ Complete |
| 20e | 20e-tests-and-linter-exercise.md | Tests and Linter Exercise | ✅ Complete |
| 21e | 21e-code-review-exercise.md | Code Review Exercise | ✅ Complete |
| 22e | 22e-publish-your-app-exercise.md | Publish Your App Exercise | ✅ Complete |
| 23e | 23e-cicd-pipeline-exercise.md | CI/CD Pipeline Exercise | ✅ Complete |

**Current lesson:** `08-style-guide-exercise.md` — Style Guide Exercise

> Claude: Update this table and the "Current lesson" line whenever a lesson is completed or the student moves on.
