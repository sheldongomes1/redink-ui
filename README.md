# RedInk

**AI-powered financial anomaly detection for equity analysts.**

RedInk identifies quarters where a company's financial metrics diverged sharply from its own historical baseline and its QQQ peer group — flagging SEC filings that warrant closer analyst review.

## What It Does

Junior analysts review dozens of 10-Q and 10-K filings each quarter. RedInk surfaces the ones worth reading first — scored, explained, and linked directly to the SEC filing.

Every flag shows:
- **Anomaly score** (0–100) — how unusual this quarter is relative to history and peers
- **Top drivers** — which financial metrics are behaving unusually, and by how much
- **Plain-English explanation** — what the model found and why it matters
- **Direct SEC filing link** — so analysts can verify the evidence themselves

No black boxes. No trading signals. Just triage.

## Demo

**WBD (Warner Bros. Discovery) — Q2 2022 — Score: 100.0**

Revenue and assets surged post-merger while net margin collapsed to -34.8%. Exactly the kind of divergence a junior analyst should catch but would likely miss without a tool.

## Tech Stack

- React (functional components + hooks)
- Tailwind CSS
- PapaParse (CSV loading)
- localStorage (review state persistence)
- Data: SEC EDGAR filings scored via Robust Mahalanobis Distance (`brick3_q_v2`)

## Scoring Model

`brick3_q_v2_robust_mahalanobis_clipped` — scores QQQ constituent 10-Q and 10-K filings across 8 financial features. Built in BigQuery. UI consumes pre-scored CSV output.

## Status

v0 — loads top 30 highest-confidence anomaly flags. Review interface with localStorage persistence.

