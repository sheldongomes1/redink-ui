import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { TrendRow } from '@/types/redink';

export const dynamic = 'force-dynamic';

const QUERY = `
  SELECT
    calendar_quarter,
    FORMAT_DATE('%Y-%m-%d', report_date) AS report_date,
    conviction_score, conviction_tier,
    pillar_anomaly, pillar_earnings, pillar_transparency,
    anomaly_score_0_100, beneish_m_score, beneish_manipulation_flag,
    z_revenue_growth_yoy, z_net_margin, z_ocf_to_net_income, z_ocf_to_assets,
    z_assets_growth_yoy, z_debt_to_assets, z_equity_to_assets, z_equity_multiplier,
    z_accrual_ratio, z_net_income_growth_yoy,
    divergence_label, mda_tone, pattern_name
  FROM \`qqq-anomaly-lab.qqq_finance.company_trend\`
  WHERE ticker = @ticker
  ORDER BY report_date ASC
`;

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params;

  if (!ticker) {
    return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
  }

  try {
    const rows = await runQuery<TrendRow>(QUERY, {
      ticker: ticker.toUpperCase(),
    });

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(`[/api/trend/${ticker}] BQ query failed:`, err);
    return NextResponse.json(
      { error: 'Failed to load trend data' },
      { status: 500 }
    );
  }
}
