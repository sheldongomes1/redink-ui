# RedInk — Claude Memory File

## Course Integration — On Every Session Start
At the start of every session in this project folder, do the following:
1. Read `instructions.md` and find the **Course Progress** section to get the current lesson number and name.
2. Fetch that lesson file from `https://github.com/exiao/claude-code-course` using:
   `gh api repos/exiao/claude-code-course/contents/lessons/<filename> --jq '.content' | base64 -d`
3. Load the lesson instructions into context so you are ready to teach it if the user asks.
4. When the user completes a lesson (says they're done, moves on, or asks for the next lesson), update the **Course Progress** section in `instructions.md` — mark the lesson complete and set the next lesson as current.

Course repo: `github.com/exiao/claude-code-course`
Lesson index is in `instructions.md` under **Course Progress**.

## What This Product Does
RedInk is an AI-powered financial anomaly detection tool for equity analysts. It identifies quarters where a company's financial metrics diverged sharply from its own historical baseline and its QQQ peer group — flagging SEC filings that warrant closer analyst review.

Every flag is eval-first: score, structured driver explanation, trust indicators, and a direct SEC filing link so the analyst can verify the evidence themselves. No black boxes. No trading signals.

## Who It's For
**Primary user:** Junior to mid-level equity analyst at a small or mid-size investment firm. Reviews 10-Q and 10-K filings regularly. Does not have Bloomberg or AlphaSense. Needs a fast way to triage which filings deserve closer attention.

**Secondary viewer:** Hiring manager or PM evaluating this as a portfolio piece. Should understand the product's value within 10 seconds of landing on it.

## How It's Built

### Do not rebuild or touch these layers:
- **Data extraction:** Built in Cursor. Connects to SEC EDGAR, cleans raw filing data, outputs structured JSON.
- **Anomaly scoring:** Built in GCP / BigQuery. Uses robust Mahalanobis distance scoring across QQQ constituent filings. Model: `brick3_q_v2_robust_mahalanobis_clipped`.

### What Claude Code builds:
- The entire analyst-facing UI
- The in-app review and eval interface
- All front-end logic, layout, filtering, and state

### Tech Stack:
- React (functional components and hooks only)
- Tailwind CSS for all styling
- PapaParse for CSV loading
- localStorage for review state persistence
- No backend in v0 or v1
- No authentication in v0 or v1

## Data Files

### `top_anomaly_review_pack.csv` — PRIMARY (use for all v0 development)
30 rows. Highest-confidence anomaly flags. Score range: 97.8–100.0. Golden demo dataset.

### `quarterly_scores.csv` — FULL DATASET (design for this from day one)
1,354 rows. All scored QQQ filings. UI filters, search, and pagination must be architected to handle this volume even if v0 only loads the review pack.

### `quarterly_scores_detailed.csv` — EXTENDED (future use / v1)
1,354 rows. Includes self z-scores and peer z-scores per feature. Use when building the advanced feature breakdown view in v1.

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

## Score Interpretation
**Anomaly score (0–100):**
- 95–100: Extreme anomaly. Very likely worth analyst review.
- 85–94: High anomaly. Strong signal.
- 70–84: Moderate anomaly. Worth monitoring.
- Below 70: Low signal. Not shown in top review pack.

**Score badge colors:** red = 95+, orange = 85–94, yellow = 70–84

**Driver z-score values:**
- 8.0 = capped maximum (extremely far from baseline)
- 3.0–7.9 = significantly elevated
- 1.0–2.9 = mildly elevated
- Negative = below baseline (e.g. margin collapse, cash flow deterioration)

## UI Design Philosophy
- **Eval-first:** Every flag must show its evidence. Never show a score alone.
- **Trust visible:** Score, driver count, model version, and filing link status must always be present on the detail view.
- **Structured evidence first:** Drivers before narrative. Numbers before prose.
- **Verifiable:** Every anomaly must link directly to the SEC filing.
- **No black boxes:** If the user can't see why something was flagged, the UI has failed.
- **Financial aesthetic:** Dark or neutral palette. Dense but readable. Bloomberg-lite, not consumer app.

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
- Driver summary paragraph (parse `driver_summary` by splitting on ` | ` and rendering each clause as a natural sentence)

**Metrics table — always show these four:**
- Revenue Growth (YoY)
- Net Margin
- Net Income Growth (YoY)
- OCF / Net Income

**Trust chips (always visible, non-negotiable):**
- `{num_features_used} features used`
- `Model: brick3_q_v2`
- `Filing link ✓` if filing_url present, `Filing link ✗` if missing
- `Self + Peer scoring` if both scores present, `Peer only` if self_history_score is missing

**SEC Filing button:**
- Prominent button that opens `filing_url` in a new tab
- If filing_url is missing, show disabled state with tooltip

**Review interface — Brick 9 — build from day one, not as a bolt-on:**
- Three buttons below the detail: `✓ Good` | `⚠ Needs Review` | `✗ Skip`
- Selecting a label updates the row's review status in app state
- Reviewed rows show their label on the list panel (small badge)
- Store review state in localStorage so it persists across page refreshes
- In v1 this will export to CSV — design the state shape with that in mind

## Eval Status and Review State
Every anomaly row has a review status. Default is `unreviewed`.

Possible states:
- `unreviewed` — default, no action taken
- `good` — analyst confirmed this is a meaningful flag
- `needs_review` — flag is present but explanation needs improvement
- `skip` — not useful for this version

The left panel list must visually distinguish these states at a glance. The filter panel must allow filtering by review status.

This is not cosmetic. The review interface is the eval loop that makes RedInk an eval-first product rather than just a dashboard.

## Explanation Paragraph Logic
Generate from `driver_summary` using this template:

"This quarter was flagged because [parsed driver summary in plain English]. The anomaly score of [score] reflects divergence from both the company's own historical range and its QQQ peer group. [If self_history_score > peer_relative_score: 'The divergence is strongest relative to the company's own history.' Else: 'The divergence is strongest relative to QQQ peers.'] Review the linked SEC filing for management commentary and financial statement detail."

Parse `driver_summary` by splitting on ` | ` and rendering each clause as a natural sentence.

## Release Gate Philosophy — Brick 11
The app should never be considered shippable unless:
- 80%+ of anomaly explanations are marked "good" or "needs review" (not skip)
- 100% of displayed rows have a valid filing URL
- All trust chips render correctly for every row
- No duplicate rows visible in the UI

Treat these as acceptance criteria, not aspirational goals.

## Version Roadmap

### v0 (current)
- Load `top_anomaly_review_pack.csv` (30 rows)
- Two-panel layout with list and detail
- Driver bars, trust chips, explanation paragraph
- SEC filing link
- Review buttons with localStorage persistence

### v1 (next)
- Load full `quarterly_scores.csv` (1,354 rows)
- Pagination or virtual scrolling on list panel
- Export reviewed anomalies to CSV
- Add self z-score vs peer z-score breakdown using `quarterly_scores_detailed.csv`
- Improve explanation quality scoring

### v2 (deployment)
- Deploy to Google Cloud Run
- Connect to BigQuery for live scoring data (replace CSV)
- Add release gate dashboard showing eval metrics

## What NOT to Build (Ever)
- Trading signals or buy/sell recommendations
- Stock price charts or price data
- Portfolio construction tools
- Direct BigQuery connection in v0/v1
- User login or authentication in v0/v1

## Model and Scoring Reference
- Full version string: `brick3_q_v2_robust_mahalanobis_clipped`
- Display as: `brick3_q_v2`
- Method: Robust Mahalanobis Distance (Minimum Covariance Determinant)
- Features used: up to 8 per row (revenue growth, asset growth, net income growth, net margin, debt/assets, equity/assets, accrual ratio, OCF/net income)
- Coverage: QQQ constituents, 10-Q and 10-K filings

## Hero Demo Example — Use for All Testing and Design Decisions
**WBD (Warner Bros. Discovery) — Q2 2022**
- Anomaly score: 100.0
- Self history score: 4.29 | Peer relative score: 3.85
- Top drivers: Revenue growth far above baseline (8.0) | Asset growth far above baseline (8.0) | Net margin deeply negative (-5.9955)
- Net margin raw value: -34.8% (severe margin collapse)
- Features used: 8 of 8
- Filing: https://www.sec.gov/Archives/edgar/data/1437107/000143710722000209/disca-20220630.htm
- Why it matters: Classic RedInk case. Revenue and assets surging (post-merger with Discovery) while profitability collapsed. Exactly the kind of divergence a junior analyst should be triaging but would likely miss without a tool.
