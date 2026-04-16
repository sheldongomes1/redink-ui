import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

interface CalibrationRow {
  conviction_tier: string;
  total: number;
  evaluated: number;
  mean_judge: number | null;
  direction_match_pct: number | null;
}

const QUERY = `
  SELECT
    p.conviction_tier,
    COUNT(*) AS total,
    COUNTIF(e.ticker IS NOT NULL) AS evaluated,
    ROUND(AVG(IF(e.ticker IS NOT NULL, e.avg_judge_score, NULL)), 2) AS mean_judge,
    ROUND(SAFE_DIVIDE(
      COUNTIF(e.ticker IS NOT NULL AND e.direction_label_match),
      COUNTIF(e.ticker IS NOT NULL)
    ) * 100, 0) AS direction_match_pct
  FROM \`qqq-anomaly-lab.qqq_finance.top_anomaly_review_pack\` p
  LEFT JOIN \`qqq-anomaly-lab.qqq_finance.eval_scores\` e
    USING (ticker, calendar_quarter)
  GROUP BY p.conviction_tier
  ORDER BY p.conviction_tier
`;

export async function GET() {
  try {
    const rows = await runQuery<CalibrationRow>(QUERY);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[/api/eval/calibration] BQ query failed:', err);
    return NextResponse.json(
      { error: 'Failed to load calibration data' },
      { status: 500 }
    );
  }
}
