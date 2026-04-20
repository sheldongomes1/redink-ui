'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AnomalyListRow, AnomalyDetailRow, TrendRow, EvalChecks } from '@/types/redink';
// PostHog analytics — see event definitions in CLAUDE.md
import { capture } from '@/lib/posthog';
import WarningIcon from '../WarningIcon';
import ChallengeModal from '../ChallengeModal';
import SectionChallenges from '../SectionChallenges';
import FeedbackCard from '../FeedbackCard';
import EvalRailCard from '../EvalRailCard';
import ExplainModal from '../ExplainModal';
import Link from 'next/link';
import { useAuthGate } from '@/lib/useAuth';
import { signOutUser } from '@/lib/firebase';
import { subscribeToAllChallengeCounts, subscribeToChallengesForRow, type ChallengeSection, type ReviewComment } from '@/lib/comments';
import { useRouter } from 'next/navigation';

// ── Types (local) ────────────────────────────────────────────────────────────

type CalibrationTier = { conviction_tier: string; total: number; evaluated: number; mean_pass_pct: number | null };

// ── Constants ─────────────────────────────────────────────────────────────────

const DRIVER_LABELS: Record<string, string> = {
  revenue_growth_yoy:    'Revenue Growth (YoY)',
  assets_growth_yoy:     'Asset Growth (YoY)',
  net_income_growth_yoy: 'Net Income Growth (YoY)',
  net_margin:            'Net Margin',
  debt_to_assets:        'Debt / Assets',
  equity_to_assets:      'Equity / Assets',
  accrual_ratio:         'Accrual Ratio',
  ocf_to_net_income:     'OCF / Net Income',
  ocf_to_assets:         'OCF / Assets',
  equity_multiplier:     'Equity Multiplier',
};

type TierKey = 'ALERT' | 'FLAG' | 'WATCH';
const TIER: Record<TierKey, { fg: string; bg: string; border: string; dot: string }> = {
  ALERT: { fg: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#dc2626' },
  FLAG:  { fg: '#c2410c', bg: '#fff7ed', border: '#fed7aa', dot: '#f97316' },
  WATCH: { fg: '#a16207', bg: '#fefce8', border: '#fef08a', dot: '#eab308' },
};

type UrgencyKey = 'CRITICAL' | 'INVESTIGATE' | 'CONTEXTUAL';
const URGENCY: Record<UrgencyKey, { label: string; fg: string; bg: string; border: string }> = {
  CRITICAL:    { label: 'High concern',        fg: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  INVESTIGATE: { label: 'Worth investigating', fg: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  CONTEXTUAL:  { label: 'Context only',        fg: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

// Trend data normalised for charting (API field names → chart field names)
// Keyed by the raw driver name (same string stored in row.top_driver_*) so the
// Driver History modal can look up any of the 10 features dynamically.
type ChartTrend = {
  q: string;
  score:                 number | null;
  net_margin:            number | null;
  debt_to_assets:        number | null;
  equity_to_assets:      number | null;
  ocf_to_net_income:     number | null;
  ocf_to_assets:         number | null;
  accrual_ratio:         number | null;
  equity_multiplier:     number | null;
  revenue_growth_yoy:    number | null;
  assets_growth_yoy:     number | null;
  net_income_growth_yoy: number | null;
};

function normalizeTrend(rows: TrendRow[]): ChartTrend[] {
  return rows
    .map(r => ({
      q: r.calendar_quarter,
      score:                 r.conviction_score,
      net_margin:            r.z_net_margin,
      debt_to_assets:        r.z_debt_to_assets,
      equity_to_assets:      r.z_equity_to_assets,
      ocf_to_net_income:     r.z_ocf_to_net_income,
      ocf_to_assets:         r.z_ocf_to_assets,
      accrual_ratio:         r.z_accrual_ratio,
      equity_multiplier:     r.z_equity_multiplier,
      revenue_growth_yoy:    r.z_revenue_growth_yoy,
      assets_growth_yoy:     r.z_assets_growth_yoy,
      net_income_growth_yoy: r.z_net_income_growth_yoy,
    }))
    .sort((a, b) => a.q.localeCompare(b.q));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBand(abs: number) {
  if (abs >= 8) return 'MAX';
  if (abs >= 5) return 'Extreme';
  if (abs >= 3) return 'Strong';
  if (abs >= 2) return 'Meaningful';
  return 'Mild';
}

function reviewKey(r: { ticker: string; calendar_quarter: string }) {
  return `${r.ticker}_${r.calendar_quarter}`;
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, valueKey, width = 524, height = 100, color = '#635bff', gradId = 'sg', yAxis = false, formatY = (v: number) => v.toFixed(1) }: any) {
  if (!data || data.length < 2) return null;
  const vals: number[] = data.map((d: any) => d[valueKey]).filter((v: number | null) => v != null);
  if (vals.length < 2) return null;

  const YW = yAxis ? 40 : 0;
  const chartW = width - YW;

  const padding = (Math.max(...vals) - Math.min(...vals)) * 0.18 || 0.8;
  const min = Math.min(...vals) - padding;
  const max = Math.max(...vals) + padding;
  const xStep = chartW / (vals.length - 1);
  const yScale = (v: number) => height - ((v - min) / (max - min)) * height;
  const pts = vals.map((v, i) => `${YW + i * xStep},${yScale(v)}`).join(' ');
  const area =
    `M${YW},${yScale(vals[0])} ` +
    vals.slice(1).map((v, i) => `L${YW + (i + 1) * xStep},${yScale(v)}`).join(' ') +
    ` L${YW + chartW},${height} L${YW},${height} Z`;

  const hasZero = min < 0 && max > 0;
  const zeroY = yScale(0);
  const ticks = [max - padding * 0.5, (min + max) / 2, min + padding * 0.5];

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yAxis && ticks.map((tick, i) => {
        const y = yScale(tick);
        return (
          <g key={i}>
            <line x1={YW} y1={y} x2={YW + chartW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={YW - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Inter, sans-serif">{formatY(tick)}</text>
          </g>
        );
      })}
      {yAxis && <line x1={YW} y1={0} x2={YW} y2={height} stroke="#f3f4f6" strokeWidth="1" />}
      {hasZero && <line x1={YW} y1={zeroY} x2={YW + chartW} y2={zeroY} stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 3" />}
      {hasZero && yAxis && <text x={YW - 6} y={zeroY + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Inter, sans-serif">0</text>}
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={YW + i * xStep} cy={yScale(v)} r={i === vals.length - 1 ? 4 : 3} fill={color} stroke="#fff" strokeWidth={i === vals.length - 1 ? 2 : 0} />
      ))}
    </svg>
  );
}

// ── Modal primitives ─────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, children }: any) {
  return (
    <div className="modal-bg" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: 580, maxWidth: '92vw', maxHeight: '85vh',
        boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }: any) {
  return (
    <div style={{ padding: '10px 16px 0', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 4, flexShrink: 0 }}>
      {tabs.map((t: any) => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 500,
          border: 'none', borderRadius: 6, cursor: 'pointer',
          background: active === t.key ? '#fff' : 'transparent',
          color: active === t.key ? '#111827' : '#6b7280',
          boxShadow: active === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function SparkPanel({ trend, valueKey, color, label, currentVal, gradId, isConviction = false, asOfQuarter }: any) {
  if (!trend || trend.length < 2) {
    return <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>No history available.</div>;
  }

  // Cut the chart at the as-of quarter so we only show what was knowable at
  // filing time. "What triggered the flag" is a retrospective framing, and
  // including future quarters silently mixes past and future.
  const scoped: ChartTrend[] = asOfQuarter
    ? (trend as ChartTrend[]).filter(d => d.q.localeCompare(asOfQuarter) <= 0)
    : (trend as ChartTrend[]);

  const vals: number[] = scoped.map((d: any) => d[valueKey]).filter((v: number | null) => v != null);
  if (vals.length < 2) {
    return <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Historical trend not available for this driver.</div>;
  }
  const last = vals[vals.length - 1];
  const first = vals[0];

  // Peak/trough with the quarter they occurred in (for the driver-history label).
  let peak = -Infinity, peakQ = '';
  let trough = +Infinity, troughQ = '';
  for (const d of scoped) {
    const v = (d as any)[valueKey];
    if (v == null) continue;
    if (v > peak)   { peak = v;   peakQ   = d.q; }
    if (v < trough) { trough = v; troughQ = d.q; }
  }

  const fmtY = isConviction
    ? (v: number) => v.toFixed(0)
    : (v: number) => (v > 0 ? '+' : '') + v.toFixed(1);

  const signedFixed = (v: number, n: number) => (v > 0 ? '+' : '') + v.toFixed(n);

  return (
    <div style={{ padding: '24px 24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.02em' }}>
              {currentVal != null
                ? (isConviction ? currentVal.toFixed(1) : (currentVal > 0 ? '+' : '') + currentVal.toFixed(2))
                : (isConviction ? last.toFixed(1) : last.toFixed(2))}
            </span>
            {isConviction ? (
              // Conviction is bounded [0,100] so the baseline delta reads cleanly
              (() => {
                const delta = last - first;
                const isUp = delta >= 0;
                return (
                  <span style={{ fontSize: 12, color: isUp ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                    {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} vs {scoped[0].q}
                  </span>
                );
              })()
            ) : (
              // Driver z-scores swing above/below zero — a signed ▲/▼ vs baseline
              // is ambiguous when current is below baseline and peak is above it.
              // Show peak + trough with their quarters instead.
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                Peak <strong style={{ color: '#d97706' }}>{signedFixed(peak, 2)}</strong> ({peakQ})
                {' · '}
                Trough <strong style={{ color: '#dc2626' }}>{signedFixed(trough, 2)}</strong> ({troughQ})
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{scoped.length} quarter{scoped.length === 1 ? '' : 's'}</div>
      </div>
      <Sparkline data={scoped} valueKey={valueKey} width={524} height={100} color={color} gradId={gradId} yAxis={true} formatY={fmtY} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingLeft: 40 }}>
        {scoped.map((d: any) => (
          <div key={d.q} style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.3 }}>
            {d.q.split('-')[1]}<br/><span style={{ opacity: 0.7 }}>{d.q.split('-')[0].slice(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────

function TrendModal({ row, trend, loading, onClose }: { row: any; trend: ChartTrend[]; loading: boolean; onClose: () => void }) {
  return (
    <ModalShell title={`${row.ticker} — Conviction History`} subtitle={`${row.company_name} · ${row.pattern_name || ''}`} onClose={onClose}>
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 22, height: 22, border: '2.5px solid #e5e7eb', borderTopColor: '#635bff', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 12, color: '#6b7280' }}>Loading trend…</div>
        </div>
      ) : (
        <>
          <SparkPanel trend={trend} valueKey="score" color="#635bff" label="Conviction Score Over Time" currentVal={row.conviction_score} gradId="conv-grad" isConviction={true} asOfQuarter={row.calendar_quarter} />
          {trend.length > 1 && trend[0].score != null && (
            <div style={{ margin: '0 24px 24px', padding: 14, background: '#f9fafb', borderRadius: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              Conviction moved from <strong style={{ color: '#111827' }}>{trend[0].score!.toFixed(1)}</strong> ({trend[0].q}) to <strong style={{ color: '#635bff' }}>{row.conviction_score.toFixed(1)}</strong> ({row.calendar_quarter}) — {trend.length} quarters of history.
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}

function DriversModal({ row, trend, loading, onClose }: { row: any; trend: ChartTrend[]; loading: boolean; onClose: () => void }) {
  const drivers = [
    { key: row.top_driver_1, val: row.top_driver_1_value },
    { key: row.top_driver_2, val: row.top_driver_2_value },
    { key: row.top_driver_3, val: row.top_driver_3_value },
  ].filter(d => d.key);

  const [activeTab, setActiveTab] = useState(drivers[0]?.key || '');
  const driverColor = (val: number) => val < 0 ? '#dc2626' : '#f59e0b';
  const tabs = drivers.map(d => ({ key: d.key, label: DRIVER_LABELS[d.key as string] || d.key }));
  const activeDriver = drivers.find(d => d.key === activeTab);

  return (
    <ModalShell title={`${row.ticker} — Driver History`} subtitle={`${row.company_name} · What triggered the flag, over time`} onClose={onClose}>
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 22, height: 22, border: '2.5px solid #e5e7eb', borderTopColor: '#635bff', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 12, color: '#6b7280' }}>Loading drivers…</div>
        </div>
      ) : activeDriver ? (
        <>
          <SparkPanel
            trend={trend} valueKey={activeTab as string}
            color={driverColor(activeDriver.val as number)}
            label={`${DRIVER_LABELS[activeTab as string] || activeTab} — z-score by quarter`}
            currentVal={activeDriver.val}
            gradId={`drv-grad-${activeTab}`}
            asOfQuarter={row.calendar_quarter}
          />
          <div style={{ margin: '0 24px 24px', padding: 14, background: '#f9fafb', borderRadius: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            Current z-score of <strong style={{ color: driverColor(activeDriver.val as number) }}>{(activeDriver.val as number) > 0 ? '+' : ''}{(activeDriver.val as number).toFixed(2)}</strong> — rated <strong style={{ color: '#111827' }}>{getBand(Math.abs(activeDriver.val as number))}</strong>.{' '}
            A positive z-score means this metric is unusually high relative to the company&apos;s own history and QQQ peers; negative means unusually low.
          </div>
        </>
      ) : null}
    </ModalShell>
  );
}

// ── Score Popover ────────────────────────────────────────────────────────────

function convictionContext(row: AnomalyListRow) {
  const s = row.conviction_score;
  if (s >= 75) return { headline: 'Top-tier alert',     detail: 'Elevated signal across all three scoring pillars — statistical, earnings quality, and narrative.' };
  if (s >= 65) return { headline: 'High conviction',    detail: 'Strong multi-pillar signal. Warrants prompt analyst review of the SEC filing.' };
  if (s >= 55) return { headline: 'Moderate signal',    detail: 'Flag-level conviction. One or two pillars driving the score — monitor for escalation.' };
  if (s >= 40) return { headline: 'Watch-tier signal',  detail: 'Early indicator. Below alert threshold but worth tracking across subsequent quarters.' };
  return              { headline: 'Low conviction',     detail: 'Routine statistical variation. Not yet at review-pack threshold.' };
}

function ScorePopover({ row, style }: { row: AnomalyListRow; style: React.CSSProperties }) {
  const t = TIER[(row.conviction_tier as TierKey)] || TIER.WATCH;
  const ctx = convictionContext(row);
  const pillars = [
    { label: 'Statistical', val: row.pillar_anomaly,      color: '#635bff' },
    { label: 'Earnings',    val: row.pillar_earnings,     color: '#f59e0b' },
    { label: 'Narrative',   val: row.pillar_transparency, color: '#10b981' },
  ];
  return (
    <div style={{
      position: 'fixed', zIndex: 60, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 230, padding: '14px 16px', pointerEvents: 'none',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.fg, letterSpacing: '-0.03em', lineHeight: 1 }}>{row.conviction_score.toFixed(0)}</div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: t.fg, marginTop: 3 }}>{row.conviction_tier}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{ctx.headline}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55, marginBottom: 12 }}>{ctx.detail}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pillars.map(p => {
          if (!p.val) return null;
          const pct = Math.min(p.val / 40, 1) * 100;
          return (
            <div key={p.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{p.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{p.val.toFixed(1)}</span>
              </div>
              <div style={{ height: 3, background: '#f3f4f6', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        position: 'absolute', left: -7, top: '50%', width: 12, height: 12, background: '#fff',
        border: '1px solid #e5e7eb', borderRight: 'none', borderTop: 'none',
        transform: 'translateY(-50%) rotate(45deg)',
      }} />
    </div>
  );
}

// ── Left Panel ───────────────────────────────────────────────────────────────

function LeftPanel({ rows, selected, onSelect, challengeCounts, user, onSignOut }: {
  rows: AnomalyListRow[];
  selected: AnomalyListRow | null;
  onSelect: (r: AnomalyListRow | null) => void;
  challengeCounts: Record<string, number>;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
  onSignOut: () => void;
}) {
  const [search, setSearch] = useState('');
  const [year, setYear]       = useState('2025');
  const [quarter, setQuarter] = useState('ALL');
  const [tier, setTier]       = useState('ALERT');

  // Debounced emit for ticker search (avoids per-keystroke noise)
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) return;
    const t = setTimeout(() => capture('filter_applied', { filter_type: 'ticker', filter_value: trimmed }), 600);
    return () => clearTimeout(t);
  }, [search]);

  const years = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => {
      const m = r.calendar_quarter && r.calendar_quarter.match(/^(\d{4})/);
      if (m) s.add(m[1]);
    });
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (q && !(r.ticker.toLowerCase().includes(q) || (r.company_name || '').toLowerCase().includes(q))) return false;
      if (tier !== 'ALL' && r.conviction_tier !== tier) return false;
      const m = r.calendar_quarter && r.calendar_quarter.match(/^(\d{4})-Q(\d)/);
      if (!m) return false;
      if (year !== 'ALL' && m[1] !== year) return false;
      if (quarter !== 'ALL' && `Q${m[2]}` !== quarter) return false;
      return true;
    });
  }, [rows, search, year, quarter, tier]);

  const grouped = useMemo(() => {
    const g: Record<TierKey, AnomalyListRow[]> = { ALERT: [], FLAG: [], WATCH: [] };
    filtered.forEach(r => { if (g[r.conviction_tier as TierKey]) g[r.conviction_tier as TierKey].push(r); });
    return g;
  }, [filtered]);

  useEffect(() => {
    if (filtered.length === 0) { onSelect(null); return; }
    const stillInList = selected && filtered.find(r => reviewKey(r) === reviewKey(selected));
    if (!stillInList) onSelect(filtered[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const selectStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '6px 8px',
    border: '1px solid #e5e7eb', borderRadius: 6,
    fontSize: 11, color: '#374151', background: '#f9fafb',
    fontFamily: 'inherit', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M2 4 L5 7 L8 4\' stroke=\'%239ca3af\' stroke-width=\'1.3\' fill=\'none\' stroke-linecap=\'round\'/></svg>")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
    paddingRight: 22,
  };

  return (
    <div style={{ width: 272, flexShrink: 0, borderRight: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '14px 20px 12px' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {user.displayName || user.email}
            </span>
            <button
              onClick={onSignOut}
              title={user.email || ''}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                border: '1px solid #e5e7eb', background: '#fff',
                fontSize: 11, fontWeight: 500, color: '#4B4540',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C04830'; e.currentTarget.style.color = '#C04830'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#4B4540'; }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" width={16} height={16} style={{ borderRadius: '50%' }} />
              ) : (
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#6b7280' }}>
                  {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              Sign out
            </button>
          </div>
        )}
        <input
          type="text"
          placeholder="Search ticker or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '7px 12px',
            border: '1px solid #e5e7eb', borderRadius: 8,
            fontSize: 12, color: '#374151', background: '#f9fafb',
            transition: 'border-color 0.15s',
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <select value={year} onChange={e => { setYear(e.target.value); capture('filter_applied', { filter_type: 'year', filter_value: e.target.value }); }} style={selectStyle}>
            <option value="ALL">All yrs</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={quarter} onChange={e => { setQuarter(e.target.value); capture('filter_applied', { filter_type: 'quarter', filter_value: e.target.value }); }} style={selectStyle}>
            <option value="ALL">All Q</option>
            <option value="Q1">Q1</option><option value="Q2">Q2</option>
            <option value="Q3">Q3</option><option value="Q4">Q4</option>
          </select>
          <select value={tier} onChange={e => { setTier(e.target.value); capture('filter_applied', { filter_type: 'tier', filter_value: e.target.value }); }} style={selectStyle}>
            <option value="ALL">All tiers</option>
            <option value="ALERT">Alert</option>
            <option value="FLAG">Flag</option>
            <option value="WATCH">Watch</option>
          </select>
        </div>
      </div>
      <div className="panel-scroll" style={{ flex: 1 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>No filings match these filters</div>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>Try a different year, quarter, or tier — or clear the search.</div>
          </div>
        )}
        {(['ALERT', 'FLAG', 'WATCH'] as TierKey[]).map(tk => {
          const tierRows = grouped[tk];
          if (!tierRows || tierRows.length === 0) return null;
          const t = TIER[tk];
          return (
            <div key={tk}>
              <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.dot }}>{tk}</span>
                <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 2 }}>{tierRows.length}</span>
              </div>
              {tierRows.map(row => {
                const key = reviewKey(row);
                const challengeCount = challengeCounts[key] || 0;
                const isSelected = !!(selected && reviewKey(selected) === key);
                return (
                  <div key={key} className={`row-item${isSelected ? ' selected' : ''}`} onClick={() => onSelect(row)} style={{ padding: '10px 20px', borderBottom: '1px solid #f9fafb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.ticker}</span>
                          {challengeCount > 0 && (
                            <span title={`${challengeCount} challenge${challengeCount === 1 ? '' : 's'}`} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 9, fontWeight: 600,
                              color: '#C04830', background: '#fff5f1',
                              border: '1px solid #F3E2DB',
                              padding: '1px 5px', borderRadius: 4,
                            }}>
                              <span style={{ fontSize: 8 }}>⚠</span>
                              {challengeCount}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {row.company_name ? row.company_name.split(' ').slice(0, 2).join(' ') : row.ticker} · {row.calendar_quarter}
                        </div>
                        {row.divergence_label && (
                          <div style={{
                            marginTop: 5, display: 'inline-block',
                            fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                            color: row.divergence_label === 'CONTRADICTS' ? '#dc2626' : row.divergence_label === 'CORROBORATES' ? '#16a34a' : '#9ca3af',
                            background: row.divergence_label === 'CONTRADICTS' ? '#fef2f2' : row.divergence_label === 'CORROBORATES' ? '#f0fdf4' : '#f9fafb',
                            padding: '2px 6px', borderRadius: 4,
                          }}>
                            {row.divergence_label}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: t.fg }}>{row.conviction_score.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// ── Right Panel ──────────────────────────────────────────────────────────────

function CalibrationBadge({ calibration }: { calibration: CalibrationTier[] }) {
  const alert = calibration.find(c => c.conviction_tier === 'ALERT');
  if (!alert || !alert.evaluated) return null;
  const passPct = alert.mean_pass_pct;
  const passLabel = passPct == null ? '—' : `${passPct}% pass`;
  return (
    <div title={`${alert.evaluated}/${alert.total} ALERT-tier traces have been independently evaluated. Mean per-trace PASS rate across faithfulness / direction / actionability checks: ${passLabel}.`}
      style={{
        fontSize: 10, color: '#6b7280', background: '#f9fafb', border: '1px solid #f3f4f6',
        padding: '4px 10px', borderRadius: 16, cursor: 'help',
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
      <span style={{ color: '#16a34a' }}>●</span>
      <span>Calibrated: {alert.evaluated}/{alert.total} ALERT · {passLabel}</span>
    </div>
  );
}

const railLinkStyle: React.CSSProperties = { fontSize: 11, color: '#635bff', background: 'none', border: 'none', fontWeight: 500, padding: 0, cursor: 'pointer' };

function ChallengeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Challenge this section — tell the team what's wrong with the AI's reasoning"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: '#C04830', background: 'none',
        border: 'none', fontWeight: 500, padding: 0, cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 10 }}>⚠</span>
      Challenge
    </button>
  );
}

type ChallengesBySection = Record<ChallengeSection, ReviewComment[]>;

const EMPTY_CHALLENGES: ChallengesBySection = { conviction: [], drivers: [], pattern: [], eval: [] };

function RightPanel({ row, detailLoading, evalChecks, calibration, trends, fetchTrend, challengesBySection }: {
  row: AnomalyDetailRow | null;
  detailLoading: boolean;
  evalChecks: EvalChecks | null;
  calibration: CalibrationTier[];
  trends: Record<string, ChartTrend[]>;
  fetchTrend: (ticker: string) => void;
  challengesBySection: ChallengesBySection;
}) {
  const [showTrend, setShowTrend] = useState(false);
  const [showDriverTrend, setShowDriverTrend] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [challengeSection, setChallengeSection] = useState<ChallengeSection | null>(null);

  useEffect(() => { setShowTrend(false); setShowDriverTrend(false); setShowExplain(false); setChallengeSection(null); }, [row]);

  if (!row && !detailLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e5e7eb', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, color: '#9ca3af' }}>Select a filing to review</div>
        </div>
      </div>
    );
  }

  if (detailLoading || !row) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 22, height: 22, border: '2.5px solid #e5e7eb', borderTopColor: '#635bff', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading detail…</div>
        </div>
      </div>
    );
  }

  const t = TIER[row.conviction_tier as TierKey] || TIER.WATCH;

  const drivers = [
    { key: row.top_driver_1, val: row.top_driver_1_value },
    { key: row.top_driver_2, val: row.top_driver_2_value },
    { key: row.top_driver_3, val: row.top_driver_3_value },
  ].filter(d => d.key && d.val != null);

  const trend = trends[row.ticker] || [];

  const openTrend = () => { fetchTrend(row.ticker); setShowTrend(true); };
  const openDriverTrend = () => { fetchTrend(row.ticker); setShowDriverTrend(true); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Top strip */}
      <div style={{ padding: '20px 32px 16px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{row.ticker}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: t.fg, background: t.bg, border: `1px solid ${t.border}`,
                padding: '3px 9px', borderRadius: 20,
              }}>{row.conviction_tier}</span>
              {row.is_blow_up_case && (
                <span title={row.case_notes || ''} style={{
                  fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fffbeb',
                  border: '1px solid #fed7aa', padding: '3px 9px', borderRadius: 20, cursor: 'default',
                }}>★ Confirmed Signal</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {row.company_name} · {row.gics_sector} · {row.calendar_quarter} · {row.form_type}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <CalibrationBadge calibration={calibration} />
          </div>
        </div>
      </div>

      {/* Scrollable body — two-column: narrative left, summary rail right */}
      <div className="panel-scroll section-fade" style={{ flex: 1, padding: '0 32px 32px' }}>
        <div className="detail-grid">

          {/* ── Left column: narrative ─────────────────────────────────── */}
          <div style={{ minWidth: 0 }}>

            {/* The Anomaly */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 14 }}>The Anomaly</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{row.explanation_brief}</p>
              {row.cited_passage && (
                <div style={{ marginTop: 18, padding: '14px 18px', background: '#f9fafb', borderLeft: '3px solid #635bff', borderRadius: '0 8px 8px 0' }}>
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: '#6b7280', lineHeight: 1.6 }}>&ldquo;{row.cited_passage}&rdquo;</p>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>— MD&amp;A, {row.form_type} · {row.calendar_quarter}</div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                {row.divergence_label && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: row.divergence_label === 'CONTRADICTS' ? '#dc2626' : row.divergence_label === 'CORROBORATES' ? '#16a34a' : '#6b7280',
                    background: row.divergence_label === 'CONTRADICTS' ? '#fef2f2' : row.divergence_label === 'CORROBORATES' ? '#f0fdf4' : '#f9fafb',
                    border: `1px solid ${row.divergence_label === 'CONTRADICTS' ? '#fecaca' : row.divergence_label === 'CORROBORATES' ? '#86efac' : '#e5e7eb'}`,
                    padding: '4px 10px', borderRadius: 6,
                  }}>{row.divergence_label}</span>
                )}
                {row.divergence_confidence != null && (
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{Math.round(row.divergence_confidence * 100)}% confidence</span>
                )}
                {row.anomaly_acknowledged === false && (
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>· Not acknowledged by management</span>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: '#f3f4f6', margin: '28px 0' }} />

            {/* Investigation Brief */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af' }}>Investigation Brief</div>
                {row.urgency_tier && URGENCY[row.urgency_tier as UrgencyKey] && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: URGENCY[row.urgency_tier as UrgencyKey].fg,
                    background: URGENCY[row.urgency_tier as UrgencyKey].bg,
                    border: `1px solid ${URGENCY[row.urgency_tier as UrgencyKey].border}`,
                    padding: '3px 9px', borderRadius: 20,
                  }}>{URGENCY[row.urgency_tier as UrgencyKey].label}</span>
                )}
              </div>
              {row.investigation_path ? (
                <>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{row.investigation_path}</p>
                  {row.key_question && (
                    <div style={{ marginTop: 18, padding: '14px 18px', background: '#fff', borderLeft: '3px solid #635bff' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#635bff', marginBottom: 6 }}>Key question</div>
                      <p style={{ fontSize: 15, fontWeight: 500, color: '#111827', lineHeight: 1.55 }}>{row.key_question}</p>
                    </div>
                  )}
                  {row.persistence_test && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>What would escalate this</div>
                      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{row.persistence_test}</p>
                    </div>
                  )}
                  <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {row.priority_section && (
                      <span title={row.filing_section_rationale || ''} style={{
                        fontSize: 11, color: '#374151', background: '#f9fafb',
                        border: '1px solid #e5e7eb', padding: '5px 12px', borderRadius: 6,
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        cursor: row.filing_section_rationale ? 'help' : 'default',
                      }}>
                        <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Start here</span>
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <span style={{ fontWeight: 500 }}>{row.priority_section}</span>
                      </span>
                    )}
                    {row.investigation_model_version && (
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>Generated by {row.investigation_model_version}</span>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>Investigation Brief not available for this filing.</p>
              )}
            </div>
          </div>

          {/* ── Right column: sticky summary rail ──────────────────────── */}
          <aside className="summary-rail">

            {/* Conviction card */}
            <div className="rail-card">
              <div className="rail-card-title">
                <span>Conviction</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <ChallengeButton onClick={() => setChallengeSection('conviction')} />
                  <button onClick={openTrend} style={railLinkStyle}>History →</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: t.fg, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{row.conviction_score.toFixed(1)}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>/ 100</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { label: 'Statistical',    val: row.pillar_anomaly,      color: '#635bff' },
                  { label: 'Earnings',       val: row.pillar_earnings,     color: '#f59e0b' },
                  { label: 'Narrative',      val: row.pillar_transparency, color: '#10b981' },
                ].map(p => {
                  if (p.val == null) return null;
                  const pct = Math.min(p.val / 40, 1) * 100;
                  return (
                    <div key={p.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{p.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{p.val.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 4, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
                        <div className="bar-fill" style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => { setShowExplain(true); capture('explain_opened', { ticker: row.ticker, calendar_quarter: row.calendar_quarter, conviction_score: row.conviction_score }); }}
                style={{
                  marginTop: 14, width: '100%',
                  padding: '7px 12px',
                  background: '#fff',
                  border: '1px solid #D4CCC2',
                  borderRadius: 8,
                  fontSize: 11, fontWeight: 500, color: '#4B4540',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'border-color 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#C04830'; e.currentTarget.style.color = '#C04830'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#D4CCC2'; e.currentTarget.style.color = '#4B4540'; }}
              >
                Explain the numbers <span style={{ fontSize: 12 }}>→</span>
              </button>
              <SectionChallenges comments={challengesBySection.conviction} />
            </div>

            {/* What triggered it? (statistical drivers) */}
            <div className="rail-card">
              <div className="rail-card-title">
                <span>What triggered it?</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <ChallengeButton onClick={() => setChallengeSection('drivers')} />
                  <button onClick={openDriverTrend} style={railLinkStyle}>History →</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {drivers.map((d, i) => {
                  const v = d.val as number;
                  const abs = Math.abs(v);
                  const isPos = v > 0;
                  const band = getBand(abs);
                  const barPct = Math.min(abs / 8, 1) * 100;
                  const barColor = isPos ? '#f59e0b' : '#dc2626';
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ fontSize: 13, color: isPos ? '#f59e0b' : '#dc2626', flexShrink: 0 }}>{isPos ? '↑' : '↓'}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DRIVER_LABELS[d.key as string] || d.key}</span>
                        </span>
                        <span style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isPos ? '#d97706' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                            {isPos ? '+' : ''}{v.toFixed(2)}
                          </span>
                          <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{band}</span>
                        </span>
                      </div>
                      <div style={{ height: 3, background: '#eef0f2', borderRadius: 2, overflow: 'hidden' }}>
                        <div className="bar-fill" style={{ height: '100%', width: `${barPct}%`, background: barColor, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <SectionChallenges comments={challengesBySection.drivers} />
            </div>

            {/* Pattern / Beneish flags */}
            {(row.pattern_name || row.beneish_manipulation_flag) && (
              <div className="rail-card">
                <div className="rail-card-title">
                  <span>Pattern</span>
                  <ChallengeButton onClick={() => setChallengeSection('pattern')} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {row.pattern_name && (
                    <span style={{ fontSize: 11, color: '#374151', background: '#fff', border: '1px solid #e5e7eb', padding: '5px 10px', borderRadius: 6, display: 'inline-block', alignSelf: 'flex-start' }}>{row.pattern_name}</span>
                  )}
                  {row.beneish_manipulation_flag && (
                    <span style={{ fontSize: 11, color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', padding: '5px 10px', borderRadius: 6, display: 'inline-block', alignSelf: 'flex-start' }}>
                      ⚠ Beneish M-score {row.beneish_m_score?.toFixed(1)}
                    </span>
                  )}
                </div>
                <SectionChallenges comments={challengesBySection.pattern} />
              </div>
            )}

            {/* AI Quality Check — rendered only when eval_scores returned something */}
            <div>
              <EvalRailCard checks={evalChecks} onChallenge={() => setChallengeSection('eval')} />
              <SectionChallenges comments={challengesBySection.eval} />
            </div>

            {/* General feedback — not tied to any row */}
            <FeedbackCard />

          </aside>
        </div>

        <div style={{ height: 40 }} />
      </div>

      {/* Bottom action bar — trust chips + filing link (review verbs moved to per-section Challenge) */}
      <div style={{ padding: '14px 32px', borderTop: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['8 features', 'brick3_q_v2', row.filing_url ? 'Filing ✓' : 'Filing ✗'].map(chip => (
            <span key={chip} style={{ fontSize: 10, color: '#9ca3af', background: '#f9fafb', border: '1px solid #f3f4f6', padding: '3px 8px', borderRadius: 5 }}>{chip}</span>
          ))}
        </div>
        <a href={row.filing_url || '#'} target="_blank" rel="noopener noreferrer"
          onClick={() => {
            if (row.filing_url) capture('filing_link_clicked', {
              ticker: row.ticker,
              anomaly_score: row.anomaly_score_0_100,
              filing_url: row.filing_url,
            });
          }}
          style={{
            padding: '8px 18px', borderRadius: 8,
            background: row.filing_url ? '#635bff' : '#f3f4f6',
            color: row.filing_url ? '#fff' : '#9ca3af',
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
            letterSpacing: '-0.01em',
            pointerEvents: row.filing_url ? 'auto' : 'none',
          }}>Open SEC Filing →</a>
      </div>

      {showTrend && <TrendModal row={row} trend={trend} loading={!trends[row.ticker]} onClose={() => setShowTrend(false)} />}
      {showDriverTrend && <DriversModal row={row} trend={trend} loading={!trends[row.ticker]} onClose={() => setShowDriverTrend(false)} />}

      <ExplainModal
        open={showExplain}
        ticker={row.ticker}
        calendar_quarter={row.calendar_quarter}
        onClose={() => setShowExplain(false)}
      />

      <ChallengeModal
        open={challengeSection !== null}
        section={challengeSection}
        ticker={row.ticker}
        anomaly_score={row.anomaly_score_0_100}
        report_date={row.report_date}
        onClose={() => setChallengeSection(null)}
      />
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const router = useRouter();
  const { status: authStatus, user } = useAuthGate();
  const [rows, setRows] = useState<AnomalyListRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnomalyListRow | null>(null);
  const [details, setDetails] = useState<Record<string, AnomalyDetailRow>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [evals, setEvals] = useState<Record<string, EvalChecks | null>>({});
  const [calibration, setCalibration] = useState<CalibrationTier[]>([]);
  const [trends, setTrends] = useState<Record<string, ChartTrend[]>>({});
  const [challengeCounts, setChallengeCounts] = useState<Record<string, number>>({});
  const [challengesBySection, setChallengesBySection] = useState<ChallengesBySection>(EMPTY_CHALLENGES);

  // Redirect unauthenticated users to the landing page.
  useEffect(() => {
    if (authStatus === 'unauthed' || authStatus === 'unconfigured') router.replace('/');
  }, [authStatus, router]);

  // Global: total challenges per row (left-panel ⚠ dot).
  useEffect(() => {
    if (authStatus !== 'authed') return;
    return subscribeToAllChallengeCounts(setChallengeCounts);
  }, [authStatus]);

  // Per-selected-row: one listener, partitioned by section client-side.
  useEffect(() => {
    if (authStatus !== 'authed' || !selected) {
      setChallengesBySection(EMPTY_CHALLENGES);
      return;
    }
    return subscribeToChallengesForRow(selected.ticker, selected.report_date, setChallengesBySection);
  }, [authStatus, selected?.ticker, selected?.report_date]);

  // Load anomaly list + calibration stats once
  useEffect(() => {
    fetch('/api/anomalies')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`anomalies HTTP ${r.status}`)))
      .then(payload => {
        const data: AnomalyListRow[] = payload.data || [];
        setRows(data);
      })
      .catch(err => { setLoadError(err.message || String(err)); setRows([]); });

    fetch('/api/eval/calibration')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('calibration failed')))
      .then(payload => setCalibration(payload.data || []))
      .catch(() => {});
  }, []);

  // Track time spent on each anomaly detail view
  const viewStartRef = useRef<{ key: string; ticker: string; score: number; startedAt: number } | null>(null);

  // Lazy-load detail + eval when selection changes
  useEffect(() => {
    if (!selected) return;
    const key = reviewKey(selected);

    // Emit time-spent for the previous selection (if any)
    const prev = viewStartRef.current;
    if (prev && prev.key !== key) {
      capture('anomaly_time_spent', {
        ticker: prev.ticker,
        anomaly_score: prev.score,
        duration_seconds: Math.round((Date.now() - prev.startedAt) / 1000),
      });
    }

    // Start new view timer + emit anomaly_viewed
    const rankPosition = rows ? rows.findIndex(r => reviewKey(r) === key) : -1;
    viewStartRef.current = {
      key,
      ticker: selected.ticker,
      score: selected.anomaly_score_0_100,
      startedAt: Date.now(),
    };
    capture('anomaly_viewed', {
      ticker: selected.ticker,
      anomaly_score: selected.anomaly_score_0_100,
      report_date: selected.report_date,
      rank_position: rankPosition >= 0 ? rankPosition + 1 : null,
    });

    if (!details[key]) {
      setDetailLoading(true);
      fetch(`/api/detail/${encodeURIComponent(selected.ticker)}/${encodeURIComponent(selected.calendar_quarter)}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`detail HTTP ${r.status}`)))
        .then(payload => {
          if (payload.data) setDetails(prev => ({ ...prev, [key]: payload.data }));
        })
        .catch(err => console.error('detail fetch failed:', err))
        .finally(() => setDetailLoading(false));
    }

    if (evals[key] === undefined) {
      fetch(`/api/eval/${encodeURIComponent(selected.ticker)}/${encodeURIComponent(selected.calendar_quarter)}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`eval HTTP ${r.status}`)))
        .then(payload => setEvals(prev => ({ ...prev, [key]: payload.data })))
        .catch(() => setEvals(prev => ({ ...prev, [key]: null })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Lazy-load trend on demand (cached by ticker)
  const fetchTrend = useCallback((ticker: string) => {
    if (trends[ticker]) return;
    fetch(`/api/trend/${encodeURIComponent(ticker)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`trend HTTP ${r.status}`)))
      .then(payload => {
        const norm = normalizeTrend(payload.data || []);
        setTrends(prev => ({ ...prev, [ticker]: norm }));
      })
      .catch(err => console.error('trend fetch failed:', err));
  }, [trends]);

  // Flush time-spent on page unload so we don't lose the last view
  useEffect(() => {
    const flush = () => {
      const v = viewStartRef.current;
      if (!v) return;
      capture('anomaly_time_spent', {
        ticker: v.ticker,
        anomaly_score: v.score,
        duration_seconds: Math.round((Date.now() - v.startedAt) / 1000),
      });
      viewStartRef.current = null;
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  if (authStatus !== 'authed') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#635bff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (rows === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#635bff', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 13, color: '#6b7280' }}>Loading anomalies from BigQuery…</div>
        </div>
      </div>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Could not load anomalies</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{loadError}</div>
        </div>
      </div>
    );
  }

  const selectedKey = selected ? reviewKey(selected) : null;
  const selectedDetail = selectedKey ? details[selectedKey] || null : null;
  const selectedEval = selectedKey ? evals[selectedKey] ?? null : null;

  const handleSignOut = async () => {
    await signOutUser();
    router.replace('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar — logo + research-only disclaimer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 20px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fff',
        flexShrink: 0,
      }}>
        <img src="/logo/redink-wordmark.svg" alt="RedInk" style={{ height: 28, display: 'block' }} />
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#4B4540', lineHeight: 1.5,
          background: '#fff5f1',
          border: '1px solid #F3E2DB',
          padding: '6px 14px',
          borderRadius: 999,
        }}>
          <WarningIcon size={15} />
          <span>For research and educational purposes only. Not investment advice.</span>
          <Link href="/terms" style={{ fontSize: 12, color: '#8F8880', textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: '#D4CCC2', marginLeft: 4 }}>
            Terms
          </Link>
        </div>
      </div>

      {/* Two-panel content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanel
          rows={rows}
          selected={selected}
          onSelect={setSelected}
          challengeCounts={challengeCounts}
          user={user ? { displayName: user.displayName, email: user.email, photoURL: user.photoURL } : null}
          onSignOut={handleSignOut}
        />
        <RightPanel
          row={selectedDetail}
          detailLoading={detailLoading}
          evalChecks={selectedEval}
          calibration={calibration}
          trends={trends}
          fetchTrend={fetchTrend}
          challengesBySection={challengesBySection}
        />
      </div>
    </div>
  );
}
