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
  z_revenue_growth_yoy: number | null;
  z_net_margin: number | null;
  z_ocf_to_net_income: number | null;
  z_assets_growth_yoy: number | null;
  z_debt_to_assets: number | null;
  z_accrual_ratio: number | null;
  divergence_label: string | null;
  mda_tone: string | null;
  pattern_name: string | null;
}

// ─── Eval row (from eval_scores) ─────────────────────────────────────────────

export interface EvalRow {
  ticker: string;
  calendar_quarter: string;
  conviction_tier: string | null;
  expected_direction: string | null;
  expected_narrative_alignment: string | null;
  model_direction: string | null;
  model_narrative_alignment: string | null;
  model_manipulation_risk: string | null;
  faithfulness_score: number | null;
  faithfulness_rationale: string | null;
  direction_accuracy_score: number | null;
  direction_label_match: boolean | null;
  direction_accuracy_rationale: string | null;
  actionability_score: number | null;
  actionability_rationale: string | null;
  avg_judge_score: number | null;
}

// ─── Golden case (from golden_cases) ─────────────────────────────────────────

export interface GoldenCase {
  ticker: string;
  calendar_quarter: string;
  case_notes: string | null;
}
