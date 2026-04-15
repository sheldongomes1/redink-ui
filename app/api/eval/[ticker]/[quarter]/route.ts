import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { EvalRow } from '@/types/redink';

export const dynamic = 'force-dynamic';

const QUERY = `
  SELECT
    ticker, calendar_quarter, conviction_tier,
    expected_direction, expected_narrative_alignment,
    model_direction, model_narrative_alignment,
    model_manipulation_risk,
    faithfulness_score, faithfulness_rationale,
    direction_accuracy_score, direction_label_match,
    direction_accuracy_rationale,
    actionability_score, actionability_rationale,
    avg_judge_score
  FROM \`qqq-anomaly-lab.qqq_finance.eval_scores\`
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
    const rows = await runQuery<EvalRow>(QUERY, {
      ticker: ticker.toUpperCase(),
      calendar_quarter: quarter,
    });

    if (rows.length === 0) {
      // Eval data is optional — return null, not 404
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error(`[/api/eval/${ticker}/${quarter}] BQ query failed:`, err);
    return NextResponse.json(
      { error: 'Failed to load eval data' },
      { status: 500 }
    );
  }
}
