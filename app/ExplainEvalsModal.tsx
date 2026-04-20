'use client';

// "Explain the evals" modal — three horizontal check tabs + a single detail
// panel below, mirroring the ExplainModal (Explain the numbers) layout.

import { useEffect, useRef, useState } from 'react';
import { capture } from '@/lib/posthog';
import {
  CheckBadge, ClaimList, FailPoints,
  DISPLAY_NAME, CHECK_ORDER,
} from './EvalRailCard';
import type { CheckResult, EvalChecks, EvalCheckName } from '@/types/redink';

const CHECK_INTRO: Record<EvalCheckName, string> = {
  faithfulness:
    'Does every factual claim trace back to the filing, score data, or drivers? Catches hallucination.',
  direction_accuracy:
    'Did the AI call the direction of the anomaly correctly — margin collapsed vs expanded, revenue surged vs fell?',
  actionability:
    'Is the next-step guidance specific enough to act on, or is it vague boilerplate?',
};

// Per-check accent colour driven by the PASS/FAIL/ABSTAIN result.
function accentFor(result: CheckResult['result']): string {
  if (result === 'PASS') return '#16a34a';
  if (result === 'FAIL') return '#dc2626';
  return '#9ca3af';
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

function CheckTab({ item, expanded, onToggle }: {
  item: CheckResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const accent = accentFor(item.result);
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: 14,
      background: '#fff',
      border: `1px solid ${expanded ? accent : '#e5e7eb'}`,
      borderRadius: 10,
      transition: 'border-color 0.12s',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 8 }}>
        <CheckBadge result={item.result} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
        {DISPLAY_NAME[item.check]}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, marginBottom: 10, flex: 1 }}>
        {CHECK_INTRO[item.check]}
      </div>
      <button onClick={onToggle} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 500, color: accent,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      }}>
        {expanded ? 'Hide details' : 'Show details'}
        <ChevronRight down={expanded} />
      </button>
    </div>
  );
}

function CheckDetail({ item }: { item: CheckResult }) {
  if (item.result === 'PASS' && item.claims && item.claims.length > 0) {
    return (
      <div style={{ padding: '16px 18px', background: '#fafbfc', borderRadius: 10, border: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, marginBottom: 10 }}>
          Each factual claim the AI made, paired with the evidence the judge checked it against.
        </div>
        <ClaimList claims={item.claims} />
      </div>
    );
  }
  if (item.result === 'FAIL' && item.critique) {
    return (
      <div style={{ padding: '16px 18px', background: '#fef8f8', borderRadius: 10, border: '1px solid #fecaca' }}>
        <div style={{ fontSize: 11, color: '#7f1d1d', lineHeight: 1.5, marginBottom: 10 }}>
          The judge flagged the following problems:
        </div>
        <FailPoints critique={item.critique} />
      </div>
    );
  }
  if (item.result === 'ABSTAIN') {
    return (
      <div style={{ padding: '16px 18px', background: '#fafafa', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', lineHeight: 1.55 }}>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Check unavailable</div>
        {item.critique || 'The judge could not evaluate this check for this trace.'}
      </div>
    );
  }
  return (
    <div style={{ padding: '16px 18px', background: '#fafafa', borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 11, color: '#6b7280' }}>
      No additional detail available for this check.
    </div>
  );
}

interface Props {
  open: boolean;
  checks: EvalChecks | null;
  ticker: string;
  calendar_quarter: string;
  onClose: () => void;
}

export default function ExplainEvalsModal({ open, checks, ticker, calendar_quarter, onClose }: Props) {
  const [expanded, setExpanded] = useState<EvalCheckName | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (!open) setExpanded(null); }, [open, ticker, calendar_quarter]);

  useEffect(() => {
    if (expanded && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  if (!open || !checks) return null;

  const rows = CHECK_ORDER
    .map(name => checks[name])
    .filter((r): r is CheckResult => !!r);

  const expandedItem = expanded ? checks[expanded] : null;

  const toggle = (check: EvalCheckName) => {
    setExpanded(prev => {
      const next = prev === check ? null : check;
      if (next) capture('eval_claim_expanded', { check, result: checks[check]?.result });
      return next;
    });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(760px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 80px)',
        background: '#fafafa',
        borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid #f3f4f6',
          background: '#fff',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Explain the evals</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, letterSpacing: '0.02em' }}>
              {ticker} · {calendar_quarter}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', color: '#6b7280', fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 22px 22px', overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55, marginBottom: 14 }}>
            Three independent LLM-judge checks run on every AI-generated anomaly explanation. Click &ldquo;Show details&rdquo; on a check to see the specific claims or failure points.
          </div>

          {/* Horizontal tab strip — three checks side by side */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {rows.map(r => (
              <CheckTab
                key={r.check}
                item={r}
                expanded={expanded === r.check}
                onToggle={() => toggle(r.check)}
              />
            ))}
          </div>

          {/* Expanded detail — one at a time, below the strip */}
          {expandedItem && (
            <div ref={detailRef} style={{ scrollMarginTop: 12 }}>
              <CheckDetail item={expandedItem} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
