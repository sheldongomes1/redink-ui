'use client';

// "AI Quality Check" rail card. Reads from the /api/eval payload shape
// (3 binary PASS/FAIL/ABSTAIN checks per trace, with claim-level critique).
//
// The rail is intentionally minimal: badge + check name only. The
// "Explain the evals" button opens ExplainEvalsModal for the details.

import type { CheckResult, EvalChecks, EvalCheckName, EvalClaim } from '@/types/redink';

export const DISPLAY_NAME: Record<EvalCheckName, string> = {
  faithfulness:       'Grounded in filing',
  direction_accuracy: 'Direction read',
  actionability:      'Next step clarity',
};

export const CHECK_ORDER: EvalCheckName[] = ['faithfulness', 'direction_accuracy', 'actionability'];

// Each check uses different verdict vocabulary. Positive verdicts mean the claim
// was upheld; negative verdicts mean the judge found a problem.
//   faithfulness       → Grounded / Unsupported / Contradicted
//   direction_accuracy → Identified / Confirmed / Missed / Wrong
//   actionability      → Verified / Correct / Unsupported
const NEGATIVE_VERDICTS = new Set(['Unsupported', 'Contradicted', 'Missed', 'Wrong', 'Incorrect']);
export function isPositive(verdict: string): boolean {
  return !NEGATIVE_VERDICTS.has(verdict);
}

export function CheckBadge({ result }: { result: CheckResult['result'] }) {
  const styles = {
    PASS:    { fg: '#166534', bg: '#f0fdf4', border: '#86efac' },
    FAIL:    { fg: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    ABSTAIN: { fg: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  }[result];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      color: styles.fg, background: styles.bg,
      border: `1px solid ${styles.border}`,
      padding: '2px 7px', borderRadius: 4,
    }}>
      {result}
    </span>
  );
}

function VerdictTag({ verdict }: { verdict: string }) {
  const positive = isPositive(verdict);
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
      color: positive ? '#166534' : '#b91c1c',
      padding: '1px 6px', borderRadius: 3,
      background: positive ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`,
      flexShrink: 0,
    }}>
      {verdict}
    </span>
  );
}

export function ClaimList({ claims }: { claims: EvalClaim[] }) {
  if (!claims || claims.length === 0) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {claims.map((c, i) => {
        const positive = isPositive(c.verdict);
        return (
          <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: '#1A1816' }}>
              <span style={{ color: positive ? '#16a34a' : '#dc2626', flexShrink: 0, paddingTop: 1 }}>
                {positive ? '✓' : '✗'}
              </span>
              <span style={{ flex: 1 }}>{c.text}</span>
            </div>
            <div style={{ marginLeft: 14, marginTop: 2, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <VerdictTag verdict={c.verdict} />
              <span style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.5, flex: 1 }}>
                {c.evidence}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FailPoints({ critique }: { critique: string }) {
  const points = critique.split(' | ').map(s => s.trim()).filter(Boolean);
  if (points.length === 0) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {points.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, lineHeight: 1.55, color: '#7f1d1d' }}>
          <span style={{ color: '#dc2626', flexShrink: 0, paddingTop: 1 }}>✗</span>
          <span style={{ flex: 1 }}>{p}</span>
        </div>
      ))}
    </div>
  );
}

function CheckRow({ item }: { item: CheckResult }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: '#fff',
      border: '1px solid #f3f4f6',
      borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <CheckBadge result={item.result} />
      <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', flex: 1 }}>
        {DISPLAY_NAME[item.check]}
      </span>
    </div>
  );
}

export default function EvalRailCard({ checks, onChallenge, onExplain }: {
  checks: EvalChecks | null;
  onChallenge: () => void;
  onExplain: () => void;
}) {
  if (!checks) return null;

  const rows = CHECK_ORDER
    .map(name => checks[name])
    .filter((r): r is CheckResult => !!r);

  if (rows.length === 0) return null;

  return (
    <div className="rail-card">
      <div className="rail-card-title">
        <span>AI Quality Check</span>
        <button
          onClick={onChallenge}
          title="Challenge an eval result — tell the team where the judge got this wrong"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#C04830', background: 'none',
            border: 'none', fontWeight: 500, padding: 0, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 10 }}>⚠</span>
          Challenge
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => <CheckRow key={r.check} item={r} />)}
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onExplain}
          style={{
            fontSize: 11, color: '#635bff', background: 'none',
            border: 'none', fontWeight: 500, padding: 0, cursor: 'pointer',
          }}
        >
          Explain the evals →
        </button>
      </div>
    </div>
  );
}
