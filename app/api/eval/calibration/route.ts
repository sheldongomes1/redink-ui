import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

interface CalibrationRow {
  conviction_tier: string;
  total: number;           // total rows in the pack for this tier
  evaluated: number;       // distinct traces that have at least one eval check
  mean_pass_pct: number | null;  // average per-trace PASS rate, in percent
}

// For each tier: how many traces exist vs how many were evaluated, and the
// mean per-trace PASS rate across PASS+FAIL (ABSTAIN excluded from denominator).
const QUERY = `
  WITH trace_pass AS (
    SELECT
      SUBSTR(trace_id, 1, STRPOS(trace_id, '_') - 1)  AS ticker,
      SUBSTR(trace_id, STRPOS(trace_id, '_') + 1)     AS calendar_quarter,
      SAFE_DIVIDE(
        COUNTIF(result = 'PASS'),
        COUNTIF(result IN ('PASS', 'FAIL'))
      ) AS pass_rate
    FROM \`qqq-anomaly-lab.qqq_finance.eval_scores\`
    GROUP BY trace_id
  )
  SELECT
    p.conviction_tier,
    COUNT(*)                                                                      AS total,
    COUNTIF(t.ticker IS NOT NULL)                                                 AS evaluated,
    ROUND(AVG(IF(t.ticker IS NOT NULL, t.pass_rate, NULL)) * 100, 0)              AS mean_pass_pct
  FROM \`qqq-anomaly-lab.qqq_finance.top_anomaly_review_pack\` p
  LEFT JOIN trace_pass t
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
    return NextResponse.json({ error: 'Failed to load calibration data' }, { status: 500 });
  }
}
