import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type {
  CheckResult, EvalChecks, EvalCheckName, EvalClaim, EvalResult,
} from '@/types/redink';

export const dynamic = 'force-dynamic';

// One row per check per trace. We return all three (some may be missing if
// the judge hasn't evaluated this trace yet).
const QUERY = `
  SELECT \`check\`, result, critique
  FROM \`qqq-anomaly-lab.qqq_finance.eval_scores\`
  WHERE trace_id = @trace_id
  ORDER BY \`check\`
`;

interface RawEvalRow {
  check:    string;
  result:   string;
  critique: string | null;
}

const CHECK_NAMES: readonly EvalCheckName[] = ['faithfulness', 'direction_accuracy', 'actionability'];

function parseClaims(critique: string | null): EvalClaim[] | null {
  if (!critique) return null;
  try {
    const parsed = JSON.parse(critique);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((c: unknown): c is EvalClaim =>
        !!c && typeof c === 'object'
        && typeof (c as EvalClaim).text === 'string'
        && typeof (c as EvalClaim).verdict === 'string'
        && typeof (c as EvalClaim).evidence === 'string')
      .map(c => ({ text: c.text, verdict: c.verdict, evidence: c.evidence }));
  } catch {
    return null;
  }
}

function normaliseRow(raw: RawEvalRow): CheckResult | null {
  const check = raw.check as EvalCheckName;
  if (!CHECK_NAMES.includes(check)) return null;
  const result = (raw.result as EvalResult);
  const critique = raw.critique ?? '';
  return {
    check,
    result,
    critique,
    claims: result === 'PASS' ? parseClaims(critique) : null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string; quarter: string } }
) {
  const { ticker, quarter } = params;
  if (!ticker || !quarter) {
    return NextResponse.json({ error: 'ticker and quarter are required' }, { status: 400 });
  }

  const trace_id = `${ticker.toUpperCase()}_${quarter}`;

  try {
    const rows = await runQuery<RawEvalRow>(QUERY, { trace_id });

    if (rows.length === 0) {
      // No eval yet for this trace — return null so the UI hides the card.
      return NextResponse.json({ data: null });
    }

    const checks: EvalChecks = {
      trace_id,
      faithfulness:       null,
      direction_accuracy: null,
      actionability:      null,
    };

    for (const raw of rows) {
      const norm = normaliseRow(raw);
      if (!norm) continue;
      checks[norm.check] = norm;
    }

    return NextResponse.json({ data: checks });
  } catch (err) {
    console.error(`[/api/eval/${ticker}/${quarter}] BQ query failed:`, err);
    return NextResponse.json({ error: 'Failed to load eval data' }, { status: 500 });
  }
}
