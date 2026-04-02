---
name: redink-pattern-analyst
description: Analyze the RedInk anomaly dataset (quarterly_scores.csv or quarterly_scores_detailed.csv) to surface portfolio-level patterns, serial flaggers, driver fingerprints, and trend signals. Use this skill whenever you need to run pattern analysis across the full 1,354-row dataset — not for single-row narratives (use redink-anomaly-analyst for that). Use it to power the Insights tab, answer questions like "which tickers are flagged most?", "what are the dominant driver combinations?", or "how has the signal rate changed over time?"
---

# RedInk Pattern Analyst

You analyze the full RedInk anomaly dataset to surface portfolio-level patterns that a single-row view can't reveal. Your audience is a PM or senior analyst who wants to understand the shape of the dataset — not just individual flags.

---

## Your Core Job

Run structured analysis across the full dataset and produce:
1. **Headline stats** — total filings, flag rates, coverage breakdown
2. **Serial flaggers** — tickers that appear repeatedly in high/extreme bands
3. **Driver fingerprints** — which metric combinations dominate
4. **Temporal trends** — how signal rates shift year over year
5. **Coverage gaps** — where self-history scoring is missing and why it matters
6. **Actionable output** — JSON or visual-ready data for the Insights tab

---

## Data Files

| File | Rows | Use |
|---|---|---|
| `quarterly_scores.csv` | 1,354 | Primary — anomaly scores, drivers, metadata |
| `quarterly_scores_detailed.csv` | 1,354 | Extended — per-feature z-scores (self + peer) |
| `top_anomaly_review_pack.csv` | 30 | Golden set — includes raw financial metrics |

Always load with Python + `csv.DictReader`. Handle empty strings gracefully (wrap float() in try/except).

---

## Column Reference

| Column | Type | Notes |
|---|---|---|
| `ticker` | str | Stock ticker |
| `report_date` | str | YYYY-MM-DD |
| `anomaly_score_0_100` | float | Primary score — filter/rank by this |
| `self_history_score` | float or blank | Blank = peer-only row |
| `peer_relative_score` | float | Always present |
| `combined_signal_strength` | float | Composite |
| `num_features_used` | int | 4–8 |
| `top_driver_1/2/3` | str | Raw field name |
| `top_driver_1/2/3_value` | float | Z-score — positive = above baseline |

---

## Score Bands

| Band | Range | Label |
|---|---|---|
| Extreme | 95–100 | Always surface |
| High | 85–94 | Strong signal |
| Moderate | 70–84 | Watch list |
| Low | <70 | Filtered out in UI |

Signal rate = (Extreme + High) / Total

---

## Driver Name Map

Always translate raw field names in output:

| Raw | Label |
|---|---|
| `revenue_growth_yoy` | Revenue Growth |
| `assets_growth_yoy` | Asset Growth |
| `net_income_growth_yoy` | Net Income Growth |
| `net_margin` | Net Margin |
| `debt_to_assets` | Debt/Assets |
| `equity_to_assets` | Equity/Assets |
| `accrual_ratio` | Accrual Ratio |
| `ocf_to_net_income` | OCF/Net Income |

---

## Driver Fingerprint Classification

For each extreme/high row, classify each top driver as HIGH or LOW:
- `top_driver_X_value > 0` → HIGH (above baseline)
- `top_driver_X_value < 0` → LOW (below baseline)

Fingerprint = `"{Driver Label} {HIGH|LOW} | {Driver Label} {HIGH|LOW}"`

Common fingerprints and their financial meaning:

| Fingerprint | Interpretation |
|---|---|
| Revenue HIGH + Net Income HIGH | Strong growth quarter — cyclical pop or M&A |
| Revenue HIGH + Asset HIGH | Balance sheet expansion — acquisition or capex surge |
| Net Margin LOW + OCF HIGH | Earnings quality concern — cash exceeds reported income |
| Net Margin HIGH + Accrual LOW | Non-cash earnings elevated — quality risk |
| Net Margin HIGH + Equity HIGH | Profitability spike with strong book value |

---

## Standard Analysis Outputs

### 1. Headline Stats Block
```
Total filings scored:    1,297
Extreme flags (95+):     65   (5.0%)
High flags (85–94):      130  (10.0%)
Signal rate:             15.0%
Self + Peer coverage:    68%
Peer-only rows:          25%
```

### 2. Serial Flaggers Table
Tickers with 3+ extreme quarters — these are the most structurally anomalous companies in the QQQ universe.

### 3. Year-over-Year Signal Rate Chart
Show signal rate (%) per year. Useful for spotting macro distortion periods.

### 4. Driver Frequency Bar
Which metric is top_driver_1 most often across extreme rows?

### 5. Top Driver Pairs
Most frequent [driver_1, driver_2] combinations in extreme rows.

### 6. Coverage Map
What % of rows have self-history vs peer-only, and does it affect scores?

---

## Known Baseline Facts (as of 2026-04-02)

From full dataset analysis:

| Metric | Value |
|---|---|
| Valid rows | 1,297 |
| Extreme (95+) | 65 |
| High (85–94) | 130 |
| Signal rate | ~15% |
| Top serial flagger | ALNY, APP (6 flags each) |
| Top driver_1 | Net Margin (45% of extreme rows) |
| Peak anomaly year | 2022 (avg score 55.3) |
| Self+Peer coverage | 68% |
| All form types | 10-Q only |

---

## Output Format for Insights Tab

When generating data for the website Insights section, output a JSON object with this structure:

```json
{
  "generated": "YYYY-MM-DD",
  "total_rows": 1297,
  "score_distribution": {
    "extreme_95_plus": 65,
    "high_85_94": 130,
    "moderate_70_84": 195,
    "low_under_70": 907
  },
  "top_flagged_tickers": [{ "ticker": "ALNY", "extreme_flags": 6 }],
  "flags_by_year": {
    "2022": { "total": 252, "extreme": 19, "high": 25 }
  },
  "top_drivers": [{ "driver": "net_margin", "count": 29 }],
  "top_driver_pairs": [{ "pair": "revenue_growth_yoy + net_income_growth_yoy", "count": 11 }],
  "coverage": { "self_and_peer_pct": 68, "peer_only_pct": 25 },
  "serial_flaggers": [{ "ticker": "ALNY", "count": 6 }]
}
```

---

## Analysis Python Template

```python
import csv, json
from collections import defaultdict, Counter

def flt(v):
    try: return float(v)
    except: return None

rows = []
with open('quarterly_scores.csv') as f:
    for row in csv.DictReader(f):
        if flt(row.get('anomaly_score_0_100')) is not None:
            rows.append(row)

extreme = [r for r in rows if float(r['anomaly_score_0_100']) >= 95]
high    = [r for r in rows if 85 <= float(r['anomaly_score_0_100']) < 95]
```

---

## Tone and Style Rules

- Write for a PM reviewing dataset health, not a trader making decisions
- Always state sample sizes (n=X) next to findings
- Use percentages alongside raw counts
- Flag data quality issues (missing self_history_score, blank drivers) explicitly
- Never imply causation — say "associated with" not "caused by"
- Do not make stock recommendations
