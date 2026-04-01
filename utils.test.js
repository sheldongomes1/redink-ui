import { describe, it, expect } from 'vitest';
import {
  scoreStyle, getBand, fmtPct, fmtDate,
  getCompanyName, reviewKey, parseSummary, buildExplanation,
  DRIVER_LABELS,
} from './utils.js';

// ── scoreStyle ────────────────────────────────────────────────────────────────
// Does a score of 95+ get flagged red? 85–94 orange? below 85 yellow?
// If this breaks, the wrong rows get urgent visual treatment in the UI.

describe('scoreStyle', () => {
  it('returns red for scores 95 and above', () => {
    expect(scoreStyle(100)).toBe('red');
    expect(scoreStyle(95)).toBe('red');
  });

  it('returns orange for scores 85–94', () => {
    expect(scoreStyle(94)).toBe('orange');
    expect(scoreStyle(85)).toBe('orange');
  });

  it('returns yellow for scores below 85', () => {
    expect(scoreStyle(84)).toBe('yellow');
    expect(scoreStyle(70)).toBe('yellow');
  });
});

// ── getBand ───────────────────────────────────────────────────────────────────
// Maps z-score magnitude to interpretation label shown on driver bars.
// If this breaks, analysts see wrong severity labels on their drivers.

describe('getBand', () => {
  it('returns MAX for 8 and above (model ceiling)', () => {
    expect(getBand(8)).toBe('MAX');
    expect(getBand(10)).toBe('MAX');
  });

  it('returns Extreme for 5–7.9', () => {
    expect(getBand(5)).toBe('Extreme');
    expect(getBand(7.9)).toBe('Extreme');
  });

  it('returns Strong for 3–4.9', () => {
    expect(getBand(3)).toBe('Strong');
    expect(getBand(4.9)).toBe('Strong');
  });

  it('returns Meaningful for 2–2.9', () => {
    expect(getBand(2)).toBe('Meaningful');
  });

  it('returns Mild for 1–1.9', () => {
    expect(getBand(1)).toBe('Mild');
  });

  it('returns empty string for below 1 (normal variation)', () => {
    expect(getBand(0.5)).toBe('');
    expect(getBand(0)).toBe('');
  });
});

// ── fmtPct ────────────────────────────────────────────────────────────────────
// Formats raw decimal values (e.g. -0.348) as percentages (-34.8%).
// If this breaks, the metrics table shows wrong numbers to analysts.

describe('fmtPct', () => {
  it('formats a decimal as a percentage', () => {
    expect(fmtPct('0.25')).toBe('25.0%');
    expect(fmtPct('-0.348')).toBe('-34.8%');
  });

  it('returns a dash for missing or empty values', () => {
    expect(fmtPct('')).toBe('—');
    expect(fmtPct(null)).toBe('—');
    expect(fmtPct(undefined)).toBe('—');
    expect(fmtPct('N/A')).toBe('—');
  });
});

// ── fmtDate ───────────────────────────────────────────────────────────────────
// Converts ISO dates (2022-06-30) to readable form (Jun 30, 2022).

describe('fmtDate', () => {
  it('formats an ISO date to readable form', () => {
    expect(fmtDate('2022-06-30')).toBe('Jun 30, 2022');
    expect(fmtDate('2023-12-31')).toBe('Dec 31, 2023');
  });

  it('returns a dash for missing date', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('')).toBe('—');
  });
});

// ── getCompanyName ────────────────────────────────────────────────────────────
// Maps tickers to company names. Falls back to the ticker if unknown.

describe('getCompanyName', () => {
  it('returns the full company name for known tickers', () => {
    expect(getCompanyName('WBD')).toBe('Warner Bros. Discovery');
    expect(getCompanyName('TSLA')).toBe('Tesla');
  });

  it('returns the ticker itself for unknown tickers', () => {
    expect(getCompanyName('UNKN')).toBe('UNKN');
  });
});

// ── reviewKey ─────────────────────────────────────────────────────────────────
// Generates the localStorage key for a row's review state.
// If this breaks, review state won't persist or will collide between rows.

describe('reviewKey', () => {
  it('generates a unique key from ticker and report_date', () => {
    expect(reviewKey({ ticker: 'WBD', report_date: '2022-06-30' })).toBe('WBD_2022-06-30');
  });
});

// ── parseSummary ──────────────────────────────────────────────────────────────
// Splits the pipe-delimited driver_summary into individual clauses.

describe('parseSummary', () => {
  it('splits a pipe-delimited summary into clauses', () => {
    const result = parseSummary('Revenue surged | Margin collapsed | Asset growth extreme');
    expect(result).toEqual(['Revenue surged', 'Margin collapsed', 'Asset growth extreme']);
  });

  it('returns empty array for missing summary', () => {
    expect(parseSummary(null)).toEqual([]);
    expect(parseSummary('')).toEqual([]);
  });
});

// ── buildExplanation ──────────────────────────────────────────────────────────
// Generates the plain-English explanation paragraph shown in the detail panel.
// Uses the WBD hero example as the reference case.

describe('buildExplanation', () => {
  const wbd = {
    ticker: 'WBD',
    report_date: '2022-06-30',
    anomaly_score_0_100: '100.0',
    self_history_score: '4.29',
    peer_relative_score: '3.85',
    driver_summary: 'Revenue growth far above baseline | Asset growth far above baseline | Net margin deeply negative',
  };

  it('includes the anomaly score in the explanation', () => {
    expect(buildExplanation(wbd)).toContain('100.0');
  });

  it('mentions strongest relative to history when self > peer', () => {
    // WBD: self (4.29) > peer (3.85) → history framing
    expect(buildExplanation(wbd)).toContain("strongest relative to the company's own history");
  });

  it('mentions strongest relative to peers when peer > self', () => {
    const row = { ...wbd, self_history_score: '2.0', peer_relative_score: '5.0' };
    expect(buildExplanation(row)).toContain('strongest relative to QQQ peers');
  });

  it('mentions peer-only when self score is missing', () => {
    const row = { ...wbd, self_history_score: '' };
    expect(buildExplanation(row)).toContain('peer comparison only');
  });
});

// ── DRIVER_LABELS ─────────────────────────────────────────────────────────────
// Ensures every column name maps to a human-readable label.
// If a label is missing, the UI shows raw column names to analysts.

describe('DRIVER_LABELS', () => {
  const required = [
    'revenue_growth_yoy', 'assets_growth_yoy', 'net_income_growth_yoy',
    'net_margin', 'debt_to_assets', 'equity_to_assets',
    'accrual_ratio', 'ocf_to_net_income',
  ];

  it('has a human-readable label for every driver column', () => {
    for (const key of required) {
      expect(DRIVER_LABELS[key]).toBeTruthy();
      expect(DRIVER_LABELS[key]).not.toBe(key); // not just the raw column name
    }
  });
});
