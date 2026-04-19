'use client';

// "Explain the numbers" modal. Reads from the authoritative `score_explanation`
// BQ table via /api/explain. Every intermediate value that produced the
// conviction score, rendered read-only.

import { useEffect, useRef, useState } from 'react';
import type {
  ScoreExplanation, StatisticalPillar, StatisticalFeature,
  EarningsPillar, EarningsComponent, NarrativePillar,
} from '@/types/redink';

type PillarKey = 'statistical' | 'earnings' | 'narrative';

// ── Colour tokens — kept in sync with rail card pillar colours ──────────────
const PILLAR_COLOR = {
  statistical: '#635bff',  // indigo
  earnings:    '#f59e0b',  // amber
  narrative:   '#10b981',  // emerald
} as const;

const TIER_STYLE: Record<string, { fg: string; bg: string; border: string }> = {
  ALERT: { fg: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  FLAG:  { fg: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  WATCH: { fg: '#a16207', bg: '#fefce8', border: '#fef08a' },
};

// Remove internal analyst cross-refs like "(per [EM-38])" or "[EM-38]" from
// user-facing strings. Keep the rationale readable.
function stripInternalRefs(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/\s*\(per \[EM-\d+\]\)/gi, '')
    .replace(/\s*\[EM-\d+\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const diffHours = Math.round((Date.now() - then) / 1000 / 3600);
  if (diffHours < 1)     return 'just now';
  if (diffHours < 24)    return `${diffHours}h ago`;
  const days = Math.round(diffHours / 24);
  if (days < 30)         return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
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

// ── Sub-component: one pillar summary card ──────────────────────────────────
function PillarSummaryCard({
  pillarKey, label, contribution, maxPoints, headline, expanded, onToggle, enabled, emptyStateMessage,
}: {
  pillarKey: 'statistical' | 'earnings' | 'narrative';
  label: string;
  contribution: number;
  maxPoints: number;
  headline: string;
  expanded: boolean;
  onToggle: () => void;
  enabled: boolean;
  emptyStateMessage?: string;
}) {
  const color = PILLAR_COLOR[pillarKey];
  const sign = contribution >= 0 ? '+' : '';

  if (!enabled) {
    return (
      <div style={{
        flex: 1, minWidth: 0,
        padding: 14,
        background: '#fafafa',
        border: '1px dashed #e5e7eb',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#9ca3af', marginBottom: 8 }}>
          0 <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>/ {maxPoints}</span>
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
          {emptyStateMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: 14,
      background: '#fff',
      border: `1px solid ${expanded ? color : '#e5e7eb'}`,
      borderRadius: 10,
      transition: 'border-color 0.12s',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#1A1816', marginBottom: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        <span style={{ color }}>{sign}{contribution.toFixed(1)}</span>
        <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500, marginLeft: 6 }}>/ {maxPoints}</span>
      </div>
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 10, minHeight: 36 }}>
        {headline}
      </div>
      <button onClick={onToggle} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 500, color,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      }}>
        {expanded ? 'Hide details' : 'Show details'}
        <ChevronRight down={expanded} />
      </button>
    </div>
  );
}

// ── Sub-component: Statistical pillar detail ───────────────────────────────
function StatisticalDetail({ pillar }: { pillar: StatisticalPillar }) {
  const sorted = [...pillar.features].sort((a, b) => b.contribution_pct - a.contribution_pct);
  const baselinesPending = pillar.baseline_availability === 'baseline_unavailable_v1';

  return (
    <div style={{ padding: '16px 18px', background: '#fafbfc', borderRadius: 10, border: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 11, color: '#6b7280' }}>
        <span>D² = <strong style={{ color: '#1A1816' }}>{pillar.mahalanobis_distance.toFixed(2)}</strong></span>
        <span>Percentile rank = <strong style={{ color: '#1A1816' }}>{pillar.anomaly_score_0_100.toFixed(1)}</strong></span>
        <span>{pillar.num_features_used}/10 features</span>
        <span>{pillar.peer_count} peers</span>
        <span>· {pillar.gics_sector}</span>
      </div>

      {/* Features table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(f => <FeatureRow key={f.name} f={f} baselinesPending={baselinesPending} />)}
      </div>

      {/* Percentile-rank warning + transform note */}
      <div style={{ marginTop: 14, padding: '10px 12px', background: '#fff8f3', border: '1px solid #fde4d3', borderRadius: 8, fontSize: 11, color: '#7c3f19', lineHeight: 1.5 }}>
        <strong>Percentile rank, not probability.</strong> A score of {pillar.anomaly_score_0_100.toFixed(1)} means this filing is in the top {(100 - pillar.anomaly_score_0_100).toFixed(1)}% of statistical anomalies across the QQQ scoring universe — <em>not</em> a {pillar.anomaly_score_0_100.toFixed(0)}% probability of manipulation.
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>
        <strong style={{ color: '#374151' }}>How was this computed?</strong> {pillar.score_transform_note}
      </div>
    </div>
  );
}

function FeatureRow({ f, baselinesPending }: { f: StatisticalFeature; baselinesPending: boolean }) {
  const contribPct = Math.max(0, Math.min(f.contribution_pct, 100));
  const combinedZ = f.combined_z;
  const isPos = combinedZ >= 0;
  const zColor = Math.abs(combinedZ) >= 3 ? '#dc2626' : Math.abs(combinedZ) >= 1.5 ? '#d97706' : '#6b7280';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px', gap: 10, alignItems: 'center', padding: '6px 0' }}>
      {/* Name */}
      <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
        {f.display_name}
      </div>

      {/* Combined z + contribution bar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: zColor, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 11 }}>{isPos ? '↑' : '↓'}</span>
            {isPos ? '+' : ''}{combinedZ.toFixed(2)}
            {f.z_clip_applied && (
              <span style={{ fontSize: 8, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 4px', borderRadius: 3, letterSpacing: '0.05em' }}>MAX</span>
            )}
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
            {contribPct.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 3, background: '#eef0f2', borderRadius: 2, overflow: 'hidden' }}>
          <div className="bar-fill" style={{ height: '100%', width: `${contribPct}%`, background: PILLAR_COLOR.statistical, borderRadius: 2 }} />
        </div>
      </div>

      {/* Self / peer z */}
      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right', fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>
        {baselinesPending ? (
          <span style={{ fontStyle: 'italic' }}>Baseline coming in v2</span>
        ) : (
          <>
            <div>self z={f.self_z.toFixed(2)}</div>
            <div>peer z={f.peer_z.toFixed(2)}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: Earnings pillar detail ───────────────────────────────────
function EarningsDetail({ pillar }: { pillar: EarningsPillar }) {
  const available   = pillar.components.filter(c => c.available);
  const unavailable = pillar.components.filter(c => !c.available);
  return (
    <div style={{ padding: '16px 18px', background: '#fafbfc', borderRadius: 10, border: '1px solid #f3f4f6' }}>
      {/* Header: M-score + threshold + flag */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>M-score</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1816', fontVariantNumeric: 'tabular-nums' }}>{pillar.beneish_m_score.toFixed(3)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Threshold</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{pillar.threshold_used.toFixed(2)}</div>
          {pillar.threshold_rationale && (
            <div style={{ marginTop: 3, fontSize: 10, color: '#6b7280', lineHeight: 1.45, fontStyle: 'italic' }}>
              {stripInternalRefs(pillar.threshold_rationale)}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: pillar.manipulation_flag ? '#b91c1c' : '#166534',
          background: pillar.manipulation_flag ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${pillar.manipulation_flag ? '#fecaca' : '#bbf7d0'}`,
          padding: '4px 9px', borderRadius: 4,
          flexShrink: 0,
        }}>
          {pillar.manipulation_flag ? 'FLAGGED' : 'NOT FLAGGED'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        {pillar.components_available}/8 components computed
      </div>

      {/* Available components */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {available.map(c => <ComponentRow key={c.name} c={c} />)}
      </div>

      {/* Unavailable components — grey grouping */}
      {unavailable.length > 0 && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', border: '1px dashed #e5e7eb', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>
            Not available for this filing
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unavailable.map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', minWidth: 46, letterSpacing: '0.04em' }}>{c.name}</span>
                  <span style={{ flex: 1, fontSize: 11, color: '#6b7280', fontWeight: 500, lineHeight: 1.4 }}>{c.display_name}</span>
                </div>
                {c.interpretation && (
                  <div style={{ marginLeft: 54, marginTop: 3, fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                    {c.interpretation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>
        <strong style={{ color: '#374151' }}>How was this computed?</strong> {pillar.score_transform_note}
      </div>
    </div>
  );
}

function ComponentRow({ c }: { c: EarningsComponent }) {
  return (
    <div style={{ padding: '9px 10px', background: '#fff', border: '1px solid #f3f4f6', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 70px 70px', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3f19', background: '#fff8f3', border: '1px solid #fde4d3', padding: '2px 5px', borderRadius: 4, textAlign: 'center', letterSpacing: '0.04em' }}>
          {c.name}
        </span>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
          {c.display_name}
        </span>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {c.value != null ? c.value.toFixed(3) : '—'}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          × {c.coefficient.toFixed(3)}
        </span>
      </div>
      {/* Always-visible plain-English interpretation */}
      {c.interpretation && (
        <div style={{ marginTop: 5, marginLeft: 70, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
          {c.interpretation}
        </div>
      )}
      {/* Contribution math as a small secondary line */}
      {c.contribution != null && c.value != null && (
        <div style={{ marginTop: 4, marginLeft: 70, fontSize: 10, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
          contribution: {c.contribution >= 0 ? '+' : ''}{c.contribution.toFixed(3)} = {c.coefficient.toFixed(3)} × {c.value.toFixed(3)}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: Narrative pillar detail ──────────────────────────────────
function NarrativeDetail({ pillar }: { pillar: NarrativePillar }) {
  const labelColor =
    pillar.divergence_label === 'CONTRADICTS'  ? { fg: '#dc2626', bg: '#fef2f2', border: '#fecaca' } :
    pillar.divergence_label === 'CORROBORATES' ? { fg: '#166534', bg: '#f0fdf4', border: '#bbf7d0' } :
    { fg: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
  const confPct = Math.max(0, Math.min(1, pillar.confidence_score)) * 100;

  return (
    <div style={{ padding: '16px 18px', background: '#fafbfc', borderRadius: 10, border: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: labelColor.fg, background: labelColor.bg, border: `1px solid ${labelColor.border}`,
          padding: '4px 10px', borderRadius: 4,
        }}>
          {pillar.divergence_label}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          MD&A tone: <strong style={{ color: '#374151' }}>{pillar.mda_tone}</strong>
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          {pillar.anomaly_acknowledged ? '✓ Acknowledged by management' : '✗ Not acknowledged'}
        </span>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Confidence</span>
          <span style={{ fontSize: 11, color: '#374151', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{(pillar.confidence_score * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: 5, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
          <div className="bar-fill" style={{ height: '100%', width: `${confPct}%`, background: PILLAR_COLOR.narrative, borderRadius: 3 }} />
        </div>
      </div>

      {/* Cited passage */}
      {pillar.cited_passage && (
        <div style={{ padding: '12px 14px', background: '#fff', borderLeft: `3px solid ${PILLAR_COLOR.narrative}`, borderRadius: '0 8px 8px 0', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontStyle: 'italic', color: '#4B4540', lineHeight: 1.6 }}>
            &ldquo;{pillar.cited_passage}&rdquo;
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: '#9ca3af' }}>— from the company&apos;s MD&amp;A</div>
        </div>
      )}

      {/* Rationale — the LLM's reasoning for its verdict */}
      {pillar.rationale && (
        <div style={{ padding: '12px 14px', background: '#f6f9f7', border: '1px solid #dcead2', borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#166534', marginBottom: 6 }}>
            Why this verdict
          </div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {pillar.rationale}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>
        <strong style={{ color: '#374151' }}>How was this computed?</strong> {pillar.score_transform_note}
      </div>
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  ticker: string;
  calendar_quarter: string;
  onClose: () => void;
}

export default function ExplainModal({ open, ticker, calendar_quarter, onClose }: Props) {
  const [data, setData] = useState<ScoreExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  // Only one pillar expanded at a time. Clicking another replaces it; clicking
  // the open one closes it. Keeps the detail area unambiguously tied to the last click.
  const [expandedPillar, setExpandedPillar] = useState<PillarKey | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const togglePillar = (key: PillarKey) => {
    setExpandedPillar(curr => (curr === key ? null : key));
  };

  // After a pillar is expanded, scroll its detail into view so the click has
  // an obvious visual consequence (the detail appears below the row of cards,
  // which on narrower screens lives below the fold).
  useEffect(() => {
    if (expandedPillar && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expandedPillar]);

  // Fetch when the modal opens or the row changes
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setData(null);
    setExpandedPillar(null);
    fetch(`/api/explain/${encodeURIComponent(ticker)}/${encodeURIComponent(calendar_quarter)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(payload => setData(payload.data))
      .catch(e => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [open, ticker, calendar_quarter]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tier = data?.conviction_tier ? TIER_STYLE[data.conviction_tier] : null;

  return (
    <div onClick={onClose} className="modal-bg" style={{
      position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} className="modal-card" style={{
        width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto',
        background: '#fff', borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        fontFamily: 'inherit',
      }}>
        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '20px 24px 14px', background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
                Explain the numbers
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                {ticker} · {calendar_quarter}
              </div>
              {data && (
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                  model: {data.model_version} · explanation {data.explanation_version} · computed {formatRelativeTime(data.computed_at)}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontSize: 20, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>×</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>

          {/* Loading / error */}
          {loading && (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, border: '2.5px solid #e5e7eb', borderTopColor: '#635bff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading explanation…</div>
            </div>
          )}
          {error && !loading && (
            <div style={{ padding: 24, fontSize: 13, color: '#b91c1c' }}>
              {error.includes('404')
                ? 'No score explanation has been computed for this filing yet.'
                : `Failed to load explanation: ${error}`}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Headline strip: big score + equation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 44, fontWeight: 700, color: tier?.fg || '#1A1816', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {data.conviction_score.toFixed(1)}
                  </span>
                  {tier && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: tier.fg, background: tier.bg, border: `1px solid ${tier.border}`,
                      padding: '3px 9px', borderRadius: 4,
                    }}>
                      {data.conviction_tier}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Short colored summary — faster to scan than the full equation */}
                  <div style={{ fontSize: 13, color: '#6b7280', fontVariantNumeric: 'tabular-nums', lineHeight: 1.5 }}>
                    = <span style={{ color: PILLAR_COLOR.statistical, fontWeight: 600 }}>+{data.pillar_contributions.statistical.toFixed(1)} statistical</span>
                    {' '}+{' '}
                    <span style={{ color: PILLAR_COLOR.earnings, fontWeight: 600 }}>{data.pillar_contributions.earnings >= 0 ? '+' : ''}{data.pillar_contributions.earnings.toFixed(1)} earnings</span>
                    {' '}+{' '}
                    <span style={{ color: PILLAR_COLOR.narrative, fontWeight: 600 }}>{data.pillar_contributions.narrative >= 0 ? '+' : ''}{data.pillar_contributions.narrative.toFixed(1)} narrative</span>
                  </div>
                  {/* Full equation verbatim, muted */}
                  <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-word' }}>
                    {data.final_equation}
                  </div>
                </div>
              </div>

              {/* Pillar summary cards */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <PillarSummaryCard
                  pillarKey="statistical"
                  label="Statistical"
                  contribution={data.pillar_contributions.statistical}
                  maxPoints={40}
                  headline={
                    data.statistical_pillar.anomaly_score_0_100 >= 95 ? `Top ${(100 - data.statistical_pillar.anomaly_score_0_100).toFixed(1)}% anomaly across QQQ universe` :
                    data.statistical_pillar.anomaly_score_0_100 >= 80 ? `Top ${(100 - data.statistical_pillar.anomaly_score_0_100).toFixed(0)}% — high statistical signal` :
                    data.statistical_pillar.anomaly_score_0_100 >= 50 ? `Percentile ${data.statistical_pillar.anomaly_score_0_100.toFixed(0)} — moderate signal vs QQQ universe` :
                    `Percentile ${data.statistical_pillar.anomaly_score_0_100.toFixed(0)} — low statistical signal`
                  }
                  expanded={expandedPillar === 'statistical'}
                  onToggle={() => togglePillar('statistical')}
                  enabled={true}
                />
                <PillarSummaryCard
                  pillarKey="earnings"
                  label="Earnings"
                  contribution={data.pillar_contributions.earnings}
                  maxPoints={35}
                  headline={data.earnings_pillar
                    ? (data.earnings_pillar.manipulation_flag
                        ? `Beneish M=${data.earnings_pillar.beneish_m_score.toFixed(3)} above ${data.earnings_pillar.threshold_used.toFixed(2)} threshold — flagged`
                        : `Beneish M=${data.earnings_pillar.beneish_m_score.toFixed(3)} below ${data.earnings_pillar.threshold_used.toFixed(2)} threshold`)
                    : 'Beneish M-Score not computable'}
                  expanded={expandedPillar === 'earnings'}
                  onToggle={() => data.earnings_pillar && togglePillar('earnings')}
                  enabled={!!data.earnings_pillar}
                  emptyStateMessage="Beneish M-Score not computable — insufficient prior-year balance sheet data. Pillar contributed 0 points."
                />
                <PillarSummaryCard
                  pillarKey="narrative"
                  label="Narrative"
                  contribution={data.pillar_contributions.narrative}
                  maxPoints={25}
                  headline={data.narrative_pillar
                    ? `Management ${data.narrative_pillar.divergence_label} at ${(data.narrative_pillar.confidence_score * 100).toFixed(0)}% confidence`
                    : 'Narrative analysis pending'}
                  expanded={expandedPillar === 'narrative'}
                  onToggle={() => data.narrative_pillar && togglePillar('narrative')}
                  enabled={!!data.narrative_pillar}
                  emptyStateMessage="Narrative analysis pending — this pillar contributed 0 points. Will populate once the LLM has scored this filing's MD&A."
                />
              </div>

              {/* Expanded pillar detail — one at a time, replacing the previous */}
              {expandedPillar && (
                <div ref={detailRef} style={{ scrollMarginTop: 12 }}>
                  {expandedPillar === 'statistical' && <StatisticalDetail pillar={data.statistical_pillar} />}
                  {expandedPillar === 'earnings'    && data.earnings_pillar  && <EarningsDetail  pillar={data.earnings_pillar}  />}
                  {expandedPillar === 'narrative'   && data.narrative_pillar && <NarrativeDetail pillar={data.narrative_pillar} />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
