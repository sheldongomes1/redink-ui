import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { GoldenCase } from '@/types/redink';

// Fetched once on page load and cached client-side — rarely changes
export const dynamic = 'force-dynamic';

const QUERY = `
  SELECT ticker, calendar_quarter, case_notes
  FROM \`qqq-anomaly-lab.qqq_finance.golden_cases\`
  WHERE is_blow_up_case = TRUE
`;

export async function GET() {
  try {
    const rows = await runQuery<GoldenCase>(QUERY);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[/api/golden] BQ query failed:', err);
    return NextResponse.json(
      { error: 'Failed to load golden cases' },
      { status: 500 }
    );
  }
}
