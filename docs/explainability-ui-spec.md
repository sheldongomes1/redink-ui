# UI spec — "Explain the numbers" modal

**Paste this into the `redink-ui` repo to build the modal once `score_explanation` exists in BigQuery.**

---

## Context for the agent

The analyst-facing app currently shows a Conviction score (0–100) and three pillar bars on the right rail (file: `app/app/page.tsx`, `RightPanel` component). Readers complain it's a black box — they see the final number but not the arithmetic. The scoring pipeline now writes a sibling BigQuery table `score_explanation` containing every intermediate number. Your job is to expose that data through a modal triggered from the right rail.

**Do not re-implement scoring logic.** Everything you render comes from the BQ table. If a field is null in the source, render the field as `—` or skip the row gracefully.

Style must match the existing modals (`TrendModal`, `DriversModal` in `app/app/page.tsx`) — soft shadow, rounded corners, backdrop click closes. The overall aesthetic is Stripe-lite: clean whites, neutral greys, coral (`#C04830`) and indigo (`#635bff`) as accents.

---

## Deliverables

1. **New Next.js API route** `app/api/explain/[ticker]/[quarter]/route.ts` that queries BigQuery for the corresponding `score_explanation` row and returns it as `{ data: ... }`. Mirror the shape of `app/api/detail/[...]/route.ts`.

2. **New TypeScript type** `ScoreExplanation` in `types/redink.ts` that matches the BQ schema exactly (see `docs/explainability-scoring-prompt.md` for the schema).

3. **New modal component** `app/ExplainModal.tsx` (client component). Props: `{ open: boolean; ticker: string; calendar_quarter: string; onClose: () => void }`. The modal fetches its own data on open and caches by `(ticker, quarter)` key.

4. **New rail button** in the right-rail summary (inside `RightPanel`, below the Pattern card): a full-width button "Explain the numbers →" that opens the modal for the currently-selected row. Coral outline, white background, hover shifts border to the solid coral. Place it as the last item in the `summary-rail` flex column.

5. **PostHog event**: fire `explain_opened` with `{ ticker, anomaly_score, conviction_score }` when the modal opens. Piggyback on the existing `capture` helper from `@/lib/posthog`.

---

## Modal layout

Modal card is ~640px wide on desktop, max-height ~80vh with a scrollable body. Three vertical regions:

### 1. Top strip — the headline
- Title: "Conviction score — ALNY · 2025-Q2" (ticker + quarter inferred from props).
- Close button (×) top-right, same style as the existing TrendModal.
- One-line substituted equation rendered directly from `final_equation` — use a monospace accent font for the numbers so the arithmetic feels like math, not prose. Example render:

  `Conviction 78.7 = 0.45 × Statistical(82.1) + 0.30 × Earnings(75.4) + 0.25 × Narrative(76.0)`

  Style: `fontSize: 13`, operators muted `#9ca3af`, pillar labels in their pillar colour (Statistical indigo, Earnings amber, Narrative emerald — match the existing pillar bar colours in `RightPanel`). Numbers use `fontVariantNumeric: 'tabular-nums'`.

### 2. Pillar cards — expandable accordions
One card per pillar. Each card is collapsed by default showing just the pillar name, the pillar score, and a one-line transform summary. Expand on click. Cards render in weight order (highest-weight pillar first).

**Statistical pillar (expanded)**
- Subtitle: "Mahalanobis distance across company and peer baselines."
- One-line transform: `d_raw = 19.2 → d_clipped = 18.34 → pillar = 82.1`. Colour the `→` arrows `#9ca3af`.
- Features table — columns: Feature, Raw, Self z, Peer z, Combined z, Contribution %. Rows sorted by `contribution_pct` DESC. Use the existing driver-bar pattern for the contribution column: mini horizontal bar + percentage label. Clip-at-8 features get a small "MAX" chip next to the combined-z value.

**Earnings pillar (expanded)**
- Subtitle: "Beneish M-score composite."
- One-line transform rendered from `score_transform`.
- Threshold line: "Beneish fraud threshold: −2.22". If `crossed_threshold=true`, render in coral; otherwise muted grey.
- Components table — columns: Component, Display name, Value, Weight, Contribution, Interpretation. Sort by `|contribution|` DESC. Interpretation is a one-line italic explainer per component.

**Narrative pillar (expanded)**
- Subtitle: "Signal from MD&A disclosure tone."
- Three compact stat tiles side-by-side: Tone / Divergence / Acknowledgement. Tone shows `mda_tone`. Divergence shows the label + confidence percent. Acknowledgement shows a ✓ or ✗.
- Signal sources list — each item shows the signal sentence, the filing section as a small chip, and the short evidence excerpt in italics. If signal list is empty, render "No signal evidence recorded for this quarter."
- If the whole `narrative_pillar` is null, collapse the card and show a muted caption: "Narrative pillar data not yet available for this filing."

### 3. Footer
- Muted caption: `Model: {model_version} · Computed {computed_at}`.
- Link (coral): "What is a Mahalanobis distance?" that opens a short help drawer/tooltip. The help copy is intentionally short — 2 sentences max — and can live inline in the component as a constant.

---

## Behaviour

- **Open trigger**: the "Explain the numbers" button in the right rail.
- **Close triggers**: ×, backdrop click, Escape key.
- **Loading state**: spinner centered in the modal body (same spinner style as existing `RightPanel` loading state).
- **Error state**: if the fetch 404s or the row is missing, render a friendly "No explanation available for this filing. This usually means the scoring pipeline hasn't backfilled this quarter yet." Do not break the modal.
- **Caching**: the App component should cache explanations in state (`Record<string, ScoreExplanation>`) keyed by `${ticker}_${quarter}`, mirroring the existing `details` and `evals` caches, so reopening the modal for a previously-viewed row is instant.

---

## Non-goals

- Do not rebuild the existing pillar bars in the rail. Leave the rail as-is; the modal supplements, it doesn't replace.
- Do not change the scoring logic, the BQ schema, or the API routes for anomalies/detail/trend/eval.
- Do not add a "back to main" button inside the modal — a modal is a modal, closing it returns you to the main view.

---

## Quality gate

Open the modal on the WBD 2022-Q2 row. Verify:
- The equation string substitutes correctly and the arithmetic visibly adds up to the conviction score.
- The Statistical features table shows 8 features with `revenue_growth_yoy` and `assets_growth_yoy` both flagged as MAX (clipped at 8.0).
- `net_margin` appears in the features list with `raw_value_display: "-34.8%"`.
- Escape key and backdrop click both close the modal.
- PostHog shows one `explain_opened` event with the right properties.
