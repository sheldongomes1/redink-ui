# Prompt — add `score_explanation` table to the scoring pipeline

**Paste this into the `scoring-pipeline` repo (Cursor / Claude Code).**

---

## Context for the agent

This repo (`scoring-pipeline`) computes a Conviction score (0–100) for every QQQ-constituent filing and writes it to BigQuery. The downstream Next.js app (`redink-ui`) already reads the final score and pillar values via BigQuery APIs. We are now building an **"Explain the numbers"** feature in the UI: when an analyst clicks a button, a modal shows the exact arithmetic that produced the Conviction score — every raw feature value, every baseline used, every z-score, every intermediate rollup.

Your job here is to emit that intermediate data as a **sibling table** so the UI has something machine-readable to render. Do not change the existing scoring logic. Do not change the existing output table schemas. Only *add* a new table and populate it alongside the existing scoring run.

The current scoring model version is `brick3_q_v2_robust_mahalanobis_clipped` (displayed in the UI as `brick3_q_v2`). Keep using it — this work is additive.

---

## Deliverable

1. A new BigQuery table `score_explanation` keyed on `(ticker, calendar_quarter)`.
2. Python/SQL code in the pipeline that populates it during the same run that writes `quarterly_scores_detailed`. Read from the in-memory intermediates you already compute; do not re-compute features.
3. A backfill script that populates the new table for all historical quarters using data already in `quarterly_scores_detailed` and related tables.

---

## Table schema — `score_explanation`

Use `STRUCT`/`ARRAY` nested fields. Everything an analyst would ever need to reconstruct the score by hand should be in here.

```
ticker                         STRING      NOT NULL
calendar_quarter               STRING      NOT NULL   -- "2022-Q2"
report_date                    DATE        NOT NULL

-- Final rollup
conviction_score               FLOAT64     NOT NULL
final_equation                 STRING      NOT NULL
                                           -- Rendered: "Conviction 78.7 = 0.45*Statistical(82.1)
                                           --           + 0.30*Earnings(75.4) + 0.25*Narrative(76.0)"
pillar_weights                 STRUCT<
  statistical FLOAT64,
  earnings    FLOAT64,
  narrative   FLOAT64
>                              NOT NULL
pillar_scores                  STRUCT<
  statistical FLOAT64,
  earnings    FLOAT64,
  narrative   FLOAT64
>                              NOT NULL

-- Pillar 1: Statistical anomaly (Mahalanobis-based)
statistical_pillar             STRUCT<
  mahalanobis_distance_raw     FLOAT64,              -- before clipping
  mahalanobis_distance_clipped FLOAT64,              -- clip ceiling applied (typically 8.0)
  clip_ceiling                 FLOAT64,
  num_features_used            INT64,
  features                     ARRAY<STRUCT<
    name                       STRING,                -- "net_margin"
    display_name               STRING,                -- "Net Margin"
    raw_value                  FLOAT64,               -- -0.348
    raw_value_display          STRING,                -- "-34.8%"
    self_mean                  FLOAT64,               -- company's own historical mean
    self_sd                    FLOAT64,
    self_z                     FLOAT64,
    peer_median                FLOAT64,
    peer_mad                   FLOAT64,               -- median absolute deviation
    peer_z                     FLOAT64,
    combined_z                 FLOAT64,               -- post-clip, feeds Mahalanobis
    contribution_pct           FLOAT64                -- feature's share of total Mahalanobis
  >>,
  score_transform              STRING                 -- "d=18.34 → pillar=82.1 via 100*(1 - exp(-d/k))"
>                              NOT NULL

-- Pillar 2: Earnings quality (Beneish M-score)
earnings_pillar                STRUCT<
  beneish_m_score              FLOAT64,
  threshold                    FLOAT64,               -- -2.22 per Beneish (1999)
  crossed_threshold            BOOL,
  components                   ARRAY<STRUCT<
    name                       STRING,                -- "DSRI"
    display_name               STRING,                -- "Days Sales in Receivables Index"
    value                      FLOAT64,
    weight                     FLOAT64,               -- coefficient in the M-score formula
    contribution               FLOAT64,               -- weight * value
    interpretation             STRING                 -- "Receivables growing faster than sales — classic sign of premature revenue recognition."
  >>,
  score_transform              STRING                 -- "M=-2.01 is above -2.22 threshold by 0.21 → pillar=75.4"
>

-- Pillar 3: Narrative signal (MD&A / disclosure tone)
narrative_pillar               STRUCT<
  mda_tone                     STRING,                -- e.g. "neutral", "defensive", "celebratory"
  divergence_label             STRING,                -- "CONTRADICTS", "CORROBORATES", "SILENT"
  divergence_confidence        FLOAT64,               -- 0–1
  anomaly_acknowledged         BOOL,
  signal_sources               ARRAY<STRUCT<
    signal                     STRING,                -- "Management did not address the YoY revenue spike"
    weight                     FLOAT64,
    evidence                   STRING,                -- short excerpt or section reference
    filing_section             STRING                 -- "Item 2 · MD&A · paragraph 4"
  >>,
  score_transform              STRING
>

-- Metadata
model_version                  STRING      NOT NULL    -- "brick3_q_v2_robust_mahalanobis_clipped"
explanation_version            STRING      NOT NULL    -- "explain_v1" — bump when schema changes
computed_at                    TIMESTAMP   NOT NULL
```

---

## Population rules

- **Statistical pillar features**: include every feature the Mahalanobis computation used for this row (up to 8). Use `contribution_pct = ((z_i^2) / sum(z_j^2)) * 100` so the UI can highlight which feature dominated.
- **raw_value_display**: pre-format percentages as strings ("-34.8%") and ratios as strings ("1.34x") so the UI never has to guess formatting. Leave absolute dollar amounts as plain floats and let the UI format them.
- **score_transform**: a one-line human-readable formula with the actual numbers substituted. Don't try to be mathematically pure — be readable. Example: `"Mahalanobis 18.34 clipped at 8.0 per feature → pillar 82.1 via 100 * (1 - exp(-d/3.0))"`.
- **interpretation field (Beneish components)**: one plain-English sentence per component, keyed by `name`. Can be a lookup table since the interpretation is static per feature name.
- **Narrative pillar**: if you don't yet compute this fully (e.g. MD&A analysis is on a separate pipeline), leave the nested fields null but still write the row. The UI will render "Narrative pillar data not yet available" gracefully.

## Backfill

Write a standalone script `backfill_score_explanation.py` that:
1. Reads every row from `quarterly_scores_detailed` and related intermediate tables.
2. Recomputes the explanation fields using the same logic.
3. Batch-loads into `score_explanation` using `MERGE` on `(ticker, calendar_quarter)` so it's idempotent.

## Quality gate

Before marking this done, run the scoring job for the **WBD Q2 2022** row (the golden demo case — Conviction should be ~100, Revenue and Asset growth both clipped at z=8.0, Net Margin z≈-6.0) and verify:
- `final_equation` string renders correctly and the substituted values add up to `conviction_score`.
- `statistical_pillar.features` contains all 8 features with non-null z-scores.
- `contribution_pct` values sum to ~100.

If that row looks right, roll forward to populating the full dataset.

## Don't

- Don't change existing table schemas. Don't rename columns. Don't drop the existing `quarterly_scores_detailed` table.
- Don't ship this behind a feature flag in the scoring pipeline — the UI handles missing rows gracefully, so just write the data.
- Don't invent new weights, thresholds, or scoring logic. Read the existing config; if it isn't parameterised, lift the current hardcoded values into the config and reference them from both places.
