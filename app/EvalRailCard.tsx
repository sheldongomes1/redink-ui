'use client';

// "AI Quality Check" rail card. Reads from the /api/eval payload shape
// (3 binary PASS/FAIL/ABSTAIN checks per trace, with claim-level critique).
//
// Display rules:
//   PASS    → green badge; click to expand the claim-evidence list
//   FAIL    → red badge; critique rendered inline (no click required)
//   ABSTAIN → grey badge; reason on hover
//   missing → row hidden entirely

import { useState } from 'react';
import { capture } from '@/lib/posthog';
import type { CheckResult, EvalChecks, EvalCheckName, EvalClaim } from '@/types/redink';

const DISPLAY_NAME: Record<EvalCheckName, string> = {
  faithfulness:       'Grounded in filing',
  direction_accuracy: 'Signal read',
  actionability:      'Next step clarity',
};

const CHECK_ORDER: EvalCheckName[] = ['faithfulness', 'direction_accuracy', 'actionability'];

// Each check uses different verdict vocabulary. Positive verdicts mean the claim
// was upheld; negative verdicts mean the judge found a problem.
//   faithfulness       → Grounded / Unsupported / Contradicted
//   direction_accuracy → Identified / Confirmed / Missed / Wrong
//   actionability      → Verified / Correct / Unsupported
const NEGATIVE_VERDICTS = new Set(['Unsupported', 'Contradicted', 'Missed', 'Wrong', 'Incorrect']);
function isPositive(verdict: string): boolean {
  return !NEGATIVE_VERDICTS.has(verdict);
}

function ChevronRight({ down = false }: { down?: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{
      transition: 'transform 0.12s',
      transform: down ? 'rotate(90deg)' : 'rotate(0deg)',
      flexShrink: 0,
    }}>
      <path d="M3.5 2 L6.5 5 L3.5 8" stroke="#9ca3af" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckBadge({ result }: { result: CheckResult['result'] }) {
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

function ClaimList({ claims }: { claims: EvalClaim[] }) {
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

function FailPoints({ critique }: { critique: string }) {
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
  const [expanded, setExpanded] = useState(false);

  // Expandable if we have something to show on click.
  const passCount = item.result === 'PASS' && item.claims ? item.claims.length : 0;
  const failPoints = item.result === 'FAIL' && item.critique
    ? item.critique.split(' | ').map(s => s.trim()).filter(Boolean)
    : [];
  const canExpand =
    (item.result === 'PASS' && passCount > 0) ||
    (item.result === 'FAIL' && failPoints.length > 0);

  const toggleLabel =
    item.result === 'PASS' ? `${passCount} claim${passCount === 1 ? '' : 's'}` :
    item.result === 'FAIL' ? `${failPoints.length} point${failPoints.length === 1 ? '' : 's'}` :
    '';

  return (
    <div style={{
      padding: '10px 12px',
      background: '#fff',
      border: '1px solid #f3f4f6',
      borderRadius: 8,
    }}>
      <div
        onClick={canExpand ? () => {
          setExpanded(v => {
            const next = !v;
            if (next) capture('eval_claim_expanded', { check: item.check, result: item.result });
            return next;
          });
        } : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: canExpand ? 'pointer' : 'default',
        }}
      >
        <CheckBadge result={item.result} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', flex: 1 }}>
          {DISPLAY_NAME[item.check]}
        </span>
        {canExpand && (
          <span style={{ fontSize: 10, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {toggleLabel}
            <ChevronRight down={expanded} />
          </span>
        )}
      </div>

      {/* ABSTAIN: keep reason inline but muted — no click affordance */}
      {item.result === 'ABSTAIN' && item.critique && (
        <div title={item.critique} style={{
          marginTop: 6, fontSize: 10, color: '#9ca3af', fontStyle: 'italic',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help',
        }}>
          Check unavailable — {item.critique}
        </div>
      )}

      {/* Expanded content: PASS shows claim list with evidence; FAIL shows bulleted points */}
      {canExpand && expanded && item.result === 'PASS' && (
        <ClaimList claims={item.claims!} />
      )}
      {canExpand && expanded && item.result === 'FAIL' && (
        <FailPoints critique={item.critique} />
      )}
    </div>
  );
}

export default function EvalRailCard({ checks, onChallenge }: {
  checks: EvalChecks | null;
  onChallenge: () => void;
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
    </div>
  );
}
