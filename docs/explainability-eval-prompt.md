# Prompt — rewrite judge rubric to emit claim-level rationales

**Paste this into the `qqq-eval-suite` repo.**

---

## Context for the agent

The eval suite scores every anomaly's analyst narrative on three rubrics — **Faithfulness**, **Direction accuracy**, and **Actionability** — and writes the results to BigQuery (`eval_scores` table). The scores are numeric (1–5), but the rationales are currently canned or generic. The UI's "AI Quality Check" panel surfaces those rationales directly, and analysts correctly complain that lines like *"Claims traceable to driver values and MD&A"* or *"Direction correctly identified"* don't actually explain anything — they're credibility theater, not explanation.

Your job is to rewrite the judge so every rationale is **claim-level** and **evidence-linked**: a bulleted list where each bullet pairs a specific claim from the analyst narrative with the exact driver value, filing passage, or direction label that supports (or contradicts) it.

Do not change the score scale. Do not rename rubrics. The UI reads `faithfulness_score`, `direction_accuracy_score`, `actionability_score` and their `*_rationale` columns — keep those names.

---

## What's wrong today (examples)

Current judge output for a typical row:

```
{
  "faithfulness_score": 4,
  "faithfulness_rationale": "Claims traceable to driver values and MD&A.",
  "direction_accuracy_score": 5,
  "direction_accuracy_rationale": "Direction correctly identified.",
  "actionability_score": 4,
  "actionability_rationale": "Action names specific filing section."
}
```

These rationales are templates, not evaluations. They're indistinguishable from row to row. An analyst reading them has no way to know whether the score was actually earned.

---

## What we want instead

The judge should emit, per rubric, a bulleted list in a new markdown-ish format where each bullet pairs one *claim* from the narrative with its *evidence*. Scores remain 1–5 numeric. Rationales become structured. Example for WBD 2022-Q2:

```
{
  "faithfulness_score": 5,
  "faithfulness_rationale": "- Claim: \"Revenue growth far above baseline (8.0)\" → Grounded. Matches top_driver_1 = revenue_growth_yoy, z=+8.0 (clipped). Raw YoY growth 213% driven by Discovery merger.\n- Claim: \"Asset growth far above baseline (8.0)\" → Grounded. Matches top_driver_2 = assets_growth_yoy, z=+8.0 (clipped). Raw assets grew from $34B to $127B post-merger.\n- Claim: \"Net margin deeply negative (-5.99)\" → Grounded. Matches top_driver_3 = net_margin, z=-5.99. Raw net_margin = -34.8% vs sector median ~12%. Confirmed by 10-Q filing Item 2, loss from continuing operations of $3.4B.",
  "direction_accuracy_score": 5,
  "direction_accuracy_rationale": "- Expected direction: divergent (revenue up + margin collapse is a classic mismatch pattern). Model labeled CONTRADICTS. ✓ Match.\n- Model identified this as a self-history outlier (z=4.29) AND a peer-relative outlier (z=3.85). Both directions correct.",
  "actionability_score": 4,
  "actionability_rationale": "- \"Review the linked SEC filing for management commentary\" → Specific enough. Filing URL present.\n- Priority section \"Item 2 — MD&A\" → Correctly identified as the section where revenue rec policy changes would be disclosed.\n- Missing: no specific question to pose to management (e.g. \"what's the pro-forma combined revenue excluding acquisition effects?\"). Loses 1 point on actionability."
}
```

---

## Deliverable

1. Update the judge prompt (the LLM call that produces these rationales) so it:
   - Is given the full narrative, the three top drivers with values, the raw metric values (revenue growth, margins, etc.), and the `divergence_label`/`divergence_confidence`.
   - Produces a bulleted list per rubric, ≤4 bullets each, each bullet following the shape: `- Claim: "<exact claim text>" → <Grounded | Unsupported | Contradicted>. <evidence sentence with specific numbers or filing section>`.
   - Is explicitly told: "Do not emit generic sentences like 'Claims traceable to driver values.' Always cite a specific driver name, z-score, raw percentage, or filing section."
   - Returns a JSON object with the six fields above (scores + rationales).

2. Add schema/column-type notes — the rationale columns may need to be widened (e.g. to `STRING` with no length limit, or `TEXT`). Confirm in the DDL.

3. Add a validation pass after the LLM call: if a rationale is shorter than 50 characters OR contains none of the words {`driver`, `z=`, `Item`, `MD&A`, `filing`, `raw`, `%`}, flag the row for re-evaluation and log it. This catches lazy judge outputs.

4. Backfill: re-run the judge across all previously-evaluated rows. The score will mostly stay the same; the rationales will become useful.

---

## Rubric definitions (keep these stable — just add them to the judge prompt verbatim)

**Faithfulness (1–5).** Does every claim in the narrative map to a concrete driver value, raw metric, or passage from the filing? 5 = every claim grounded. 3 = at least one claim unsupported. 1 = narrative invents or contradicts the evidence.

**Direction accuracy (1–5).** Does the model's divergence label (`CONTRADICTS` / `CORROBORATES` / `SILENT`) match what a human would pick given the driver values and MD&A tone? 5 = full match, including sign of z-scores. 3 = label right but confidence miscalibrated. 1 = label wrong.

**Actionability (1–5).** Would a junior analyst reading this narrative know *exactly* what to do next? 5 = names a specific filing section AND a specific question to ask management. 3 = generic guidance ("review the filing"). 1 = no next step.

---

## Hard constraints

- Rationales must be **specific to this row**. If the same rationale text could apply to a different ticker/quarter with just a name swap, it's too generic — retry.
- Rationales must fit in a 2000-char column. If the judge runs long, truncate the bullet list at 4 bullets.
- Don't change the score scale, the column names, or which model version is recorded in the `eval_model_version` field.
- Don't send filing HTML to the judge — send only the structured driver data and the narrative. The judge's job is to cross-check claims against structured evidence, not to re-read the filing.

## Quality gate

Before rolling out, re-judge these three rows and manually inspect the output:
1. **WBD 2022-Q2** (golden case — high score expected).
2. A `SILENT` divergence row where the model said nothing happened (judge should either confirm silence is correct or flag a missed signal).
3. A row with `num_features_used < 5` (low-signal row — judge should note the limited evidence).

If all three produce bullet-level rationales that cite specific numbers, ship it.
