'use client';

// "Explain the evals" modal — three tabs/cards (one per eval check), exclusive
// expansion pattern matching ExplainModal. The rail card stays minimal; all
// detail lives here.

import { useEffect, useRef, useState } from 'react';
import { capture } from '@/lib/posthog';
import {
  CheckBadge, ClaimList, FailPoints,
  DISPLAY_NAME, CHECK_ORDER,
} from './EvalRailCard';
import type { CheckResult, EvalChecks, EvalCheckName } from '@/types/redink';

// Plain-English one-liners for each check — shown under the check name so
// users don't have to infer what each judge is actually measuring.
const CHECK_INTRO: Record<EvalCheckName, string> = {
  faithfulness:
    'Does every factual claim in the explanation trace back to the filing, the score data, or the anomaly drivers? Catches hallucination.',
  direction_accuracy:
    'Did the AI call the direction of the anomaly correctly — e.g. margin collapsed vs expanded, revenue surged vs fell?',
  actionability:
    'Is the next-step guidance specific enough that an analyst can act on it, or is it vague boilerplate?',
};

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

function CheckSection({
  item, expanded, onToggle, sectionRef,
}: {
  item: CheckResult;
  expanded: boolean;
  onToggle: () => void;
  sectionRef: (el: HTMLDivElement | null) => void;
}) {
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
    <div ref={sectionRef} style={{
      border: '1px solid #f3f4f6', borderRadius: 10,
      background: '#fff', padding: '14px 16px',
      scrollMarginTop: 16,
    }}>
      <div
        onClick={canExpand ? onToggle : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: canExpand ? 'pointer' : 'default',
        }}
      >
        <CheckBadge result={item.result} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            {DISPLAY_NAME[item.check]}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.5 }}>
            {CHECK_INTRO[item.check]}
          </div>
        </div>
        {canExpand && (
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {toggleLabel}
            <ChevronRight down={expanded} />
          </span>
        )}
      </div>

      {/* ABSTAIN: inline muted note — check didn't run */}
      {item.result === 'ABSTAIN' && item.critique && (
        <div style={{
          marginTop: 10, fontSize: 11, color: '#6b7280', fontStyle: 'italic',
          background: '#f9fafb', border: '1px solid #f3f4f6',
          borderRadius: 6, padding: '8px 10px',
        }}>
          Check unavailable — {item.critique}
        </div>
      )}

      {canExpand && expanded && item.result === 'PASS' && (
        <ClaimList claims={item.claims!} />
      )}
      {canExpand && expanded && item.result === 'FAIL' && (
        <FailPoints critique={item.critique} />
      )}
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
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { if (!open) setExpanded(null); }, [open, ticker, calendar_quarter]);

  if (!open || !checks) return null;

  const rows = CHECK_ORDER
    .map(name => checks[name])
    .filter((r): r is CheckResult => !!r);

  const toggle = (check: EvalCheckName) => {
    setExpanded(prev => {
      const next = prev === check ? null : check;
      if (next) {
        capture('eval_claim_expanded', { check, result: checks[check]?.result });
        // Scroll into view after layout settles
        setTimeout(() => sectionRefs.current[check]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
      }
      return next;
    });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(640px, calc(100vw - 32px))',
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
        <div style={{ padding: '16px 22px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55 }}>
            Three independent LLM-judge checks run on every AI-generated anomaly explanation. Click a row to see the specific claims or failure points the judge produced.
          </div>
          {rows.map(r => (
            <CheckSection
              key={r.check}
              item={r}
              expanded={expanded === r.check}
              onToggle={() => toggle(r.check)}
              sectionRef={el => { sectionRefs.current[r.check] = el; }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
