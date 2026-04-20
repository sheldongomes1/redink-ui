import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { ScoreExplanation } from '@/types/redink';

export const dynamic = 'force-dynamic';

// Reads the authoritative `score_explanation` row for a single filing.
// Do NOT recompute any of these values in the UI — the pipeline is the source of truth.
const QUERY = `
  SELECT
    ticker,
    calendar_quarter,
    FORMAT_DATE('%Y-%m-%d', report_date) AS report_date,
    conviction_score,
    conviction_tier,
    final_equation,
    model_version,
    explanation_version,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', computed_at) AS computed_at,
    pillar_contributions,
    statistical_pillar,
    earnings_pillar,
    narrative_pillar
  FROM \`qqq-anomaly-lab.qqq_finance.score_explanation\`
  WHERE ticker = @ticker
    AND calendar_quarter = @calendar_quarter
  LIMIT 1
`;

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string; quarter: string } }
) {
  const { ticker, quarter } = params;
  if (!ticker || !quarter) {
    return NextResponse.json({ error: 'ticker and quarter are required' }, { status: 400 });
  }

  try {
    const rows = await runQuery<ScoreExplanation>(QUERY, {
      ticker: ticker.toUpperCase(),
      calendar_quarter: quarter,
    });
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Score explanation not found' }, { status: 404 });
    }
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error(`[/api/explain/${ticker}/${quarter}] BQ query failed:`, err);
    return NextResponse.json({ error: 'Failed to load score explanation' }, { status: 500 });
  }
}
