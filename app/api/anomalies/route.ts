import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { AnomalyListRow } from '@/types/redink';

export const dynamic = 'force-dynamic';

const QUERY = `
  SELECT
    ticker, company_name, cik,
    FORMAT_DATE('%Y-%m-%d', report_date) AS report_date,
    calendar_quarter, gics_sector, form_type,
    CAST(filing_date AS STRING) AS filing_date,
    filing_url,
    anomaly_score_0_100,
    self_history_score, peer_relative_score,
    combined_signal_strength, peer_count,
    top_driver_1, top_driver_1_value,
    top_driver_2, top_driver_2_value,
    top_driver_3, top_driver_3_value,
    pillar_anomaly, pillar_earnings, pillar_transparency,
    conviction_score, conviction_tier,
    pattern_name, pattern_summary,
    divergence_label, mda_tone,
    beneish_manipulation_flag, beneish_m_score,
    filing_url IS NOT NULL AS filing_url_valid
  FROM \`qqq-anomaly-lab.qqq_finance.top_anomaly_review_pack\`
  ORDER BY conviction_score DESC
`;

export async function GET() {
  try {
    const rows = await runQuery<AnomalyListRow>(QUERY);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[/api/anomalies] BQ query failed:', err);
    return NextResponse.json(
      { error: 'Failed to load anomaly list' },
      { status: 500 }
    );
  }
}
