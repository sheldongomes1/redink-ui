// ─── List-level row (from top_anomaly_review_pack) ──────────────────────────

export interface AnomalyListRow {
  ticker: string;
  company_name: string | null;
  cik: number | null;
  report_date: string;         // DATE → serialised as "YYYY-MM-DD"
  calendar_quarter: string;    // e.g. "2022-Q2"
  gics_sector: string | null;
  form_type: string | null;
  filing_date: string | null;
  filing_url: string | null;
  anomaly_score_0_100: number;
  self_history_score: number | null;
  peer_relative_score: number | null;
  combined_signal_strength: number | null;
  peer_count: number | null;
  top_driver_1: string | null;
  top_driver_1_value: number | null;
  top_driver_2: string | null;
  top_driver_2_value: number | null;
  top_driver_3: string | null;
  top_driver_3_value: number | null;
  pillar_anomaly: number | null;
  pillar_earnings: number | null;
  pillar_transparency: number | null;
  conviction_score: number;
  conviction_tier: 'ALERT' | 'FLAG' | 'WATCH';
  pattern_name: string | null;
  pattern_summary: string | null;
  divergence_label: string | null;
  mda_tone: string | null;
  beneish_manipulation_flag: boolean | null;
  beneish_m_score: number | null;
  filing_url_valid: boolean;
}

// ─── Full detail row (from filing_intelligence view) ────────────────────────

export interface AnomalyDetailRow extends AnomalyListRow {
  mahalanobis_distance: number | null;
  beneish_components_available: number | null;
  beneish_dsri: number | null;
  beneish_gmi: number | null;
  beneish_aqi: number | null;
  beneish_sgi: number | null;
  beneish_depi: number | null;
  beneish_sgai: number | null;
  beneish_tata: number | null;
  beneish_lvgi: number | null;
  explanation_brief: string | null;
  divergence_confidence: number | null;
  anomaly_acknowledged: boolean | null;
  cited_passage: string | null;
  divergence_rationale: string | null;
  scoring_version: string | null;
  scored_at: string | null;
  conviction_computed_at: string | null;
  pattern_confidence: string | null;
  // Investigation Brief (from analyst_actions LEFT JOIN — null if no brief)
  investigation_path: string | null;
  key_question: string | null;
  persistence_test: string | null;
  priority_section: string | null;
  urgency_tier: 'CRITICAL' | 'INVESTIGATE' | 'CONTEXTUAL' | null;
  filing_section_rationale: string | null;
  investigation_model_version: string | null;
  investigation_generated_at: string | null;
  // Golden case anchor
  is_blow_up_case: boolean;
  case_notes: string | null;
}

// ─── Trend row (from company_trend) ─────────────────────────────────────────

export interface TrendRow {
  calendar_quarter: string;
  report_date: string;
  conviction_score: number | null;
  conviction_tier: string | null;
  pillar_anomaly: number | null;
  pillar_earnings: number | null;
  pillar_transparency: number | null;
  anomaly_score_0_100: number | null;
  beneish_m_score: number | null;
  beneish_manipulation_flag: boolean | null;
  z_revenue_growth_yoy:    number | null;
  z_net_margin:            number | null;
  z_ocf_to_net_income:     number | null;
  z_ocf_to_assets:         number | null;
  z_assets_growth_yoy:     number | null;
  z_debt_to_assets:        number | null;
  z_equity_to_assets:      number | null;
  z_equity_multiplier:     number | null;
  z_accrual_ratio:         number | null;
  z_net_income_growth_yoy: number | null;
  divergence_label: string | null;
  mda_tone: string | null;
  pattern_name: string | null;
}

// ─── Eval check (from eval_scores — one row per check per trace) ────────────
// Each anomaly trace has up to 3 checks: faithfulness, direction_accuracy, actionability.
// result is binary PASS/FAIL plus ABSTAIN for when the judge couldn't run.
// critique shape depends on result (see CheckResult below).

export type EvalCheckName = 'faithfulness' | 'direction_accuracy' | 'actionability';
export type EvalResult   = 'PASS' | 'FAIL' | 'ABSTAIN';

export interface EvalClaim {
  text: string;     // the specific factual claim extracted from the AI's explanation
  verdict: string;  // 'Grounded' | 'Unsupported' | 'Contradicted'
  evidence: string; // the input field or passage that supports/contradicts it
}

// Normalised per-check payload. Server parses critique JSON for PASS rows and
// passes the raw string through for FAIL/ABSTAIN.
export interface CheckResult {
  check: EvalCheckName;
  result: EvalResult;
  critique: string;            // raw string from BQ
  claims: EvalClaim[] | null;  // populated when result === 'PASS' and critique parsed cleanly
}

export interface EvalChecks {
  trace_id: string;                                     // "{TICKER}_{CALENDAR_QUARTER}"
  faithfulness:       CheckResult | null;
  direction_accuracy: CheckResult | null;
  actionability:      CheckResult | null;
}

// ─── Golden case (from golden_cases) ─────────────────────────────────────────

export interface GoldenCase {
  ticker: string;
  calendar_quarter: string;
  case_notes: string | null;
}

// ─── Score Explanation (from score_explanation) ──────────────────────────────
// Powers the "Explain the numbers" modal. Every intermediate value that fed
// into conviction_score, pre-rendered and ready to read-only display.

export interface PillarContributions {
  statistical: number;  // 0..40
  earnings:    number;  // 0..35
  narrative:   number;  // −10..+25  (CAN BE NEGATIVE — CORROBORATES reduces conviction)
}

export interface StatisticalFeature {
  name:             string;   // canonical: "net_margin"
  display_name:     string;   // human-readable: "Net Margin"
  self_z:           number;
  self_median:      number | null;  // v1: null, populates in v2
  self_iqr:         number | null;
  peer_z:           number;
  peer_median:      number | null;
  peer_iqr:         number | null;
  combined_z:       number;   // clipped to ±8
  z_clip_applied:   boolean;  // true if |combined_z| hit the ±8 ceiling
  contribution_pct: number;   // feature's share of total Mahalanobis signal (sums ~100)
}

export interface StatisticalPillar {
  anomaly_score_0_100:   number;   // PERCENTILE RANK, not a probability
  mahalanobis_distance:  number;
  num_features_used:     number;
  peer_count:            number;
  gics_sector:           string;
  features:              StatisticalFeature[];
  score_transform_note:  string;
  baseline_availability: string;   // "baseline_unavailable_v1" in v1
}

export interface EarningsComponent {
  name:          string;          // e.g. "DSRI"
  display_name:  string;          // e.g. "Days Sales in Receivables Index"
  value:         number | null;   // null when unavailable
  coefficient:   number;
  contribution:  number | null;   // coefficient × value (additive term)
  interpretation: string;
  available:     boolean;
}

export interface EarningsPillar {
  beneish_m_score:      number;
  threshold_used:       number;   // sector-aware: -1.5 or -2.22
  threshold_rationale:  string;
  manipulation_flag:    boolean;
  components_available: number;
  components_missing:   string[];
  components:           EarningsComponent[];
  score_transform_note: string;
}

export interface NarrativePillar {
  divergence_label:     string;   // "CONTRADICTS" | "CORROBORATES" | "NEUTRAL"
  confidence_score:     number;   // 0..1
  mda_tone:             string;   // "BULLISH" | "DEFENSIVE" | etc.
  anomaly_acknowledged: boolean;
  cited_passage:        string;
  rationale:            string | null;  // LLM's full reasoning for the verdict
  score_transform_note: string;
}

export interface ScoreExplanation {
  ticker:               string;
  calendar_quarter:     string;
  report_date:          string;               // "YYYY-MM-DD"
  conviction_score:     number;
  conviction_tier:      'ALERT' | 'FLAG' | 'WATCH' | null;
  final_equation:       string;               // pre-rendered formula, render verbatim
  model_version:        string;
  explanation_version:  string;               // "v1" | "v2" | ...
  computed_at:          string;               // ISO8601
  pillar_contributions: PillarContributions;
  statistical_pillar:   StatisticalPillar;    // always present
  earnings_pillar:      EarningsPillar  | null;
  narrative_pillar:     NarrativePillar | null;
}
