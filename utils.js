// RedInk utility functions — pure logic, no React, no DOM
// Extracted from index.html so they can be tested independently

export const DRIVER_LABELS = {
  revenue_growth_yoy:    'Revenue Growth (YoY)',
  assets_growth_yoy:     'Asset Growth (YoY)',
  net_income_growth_yoy: 'Net Income Growth (YoY)',
  net_margin:            'Net Margin',
  debt_to_assets:        'Debt / Assets',
  equity_to_assets:      'Equity / Assets',
  accrual_ratio:         'Accrual Ratio',
  ocf_to_net_income:     'OCF / Net Income',
};

export const COMPANY_NAMES = {
  WBD:   'Warner Bros. Discovery',
  FANG:  'Diamondback Energy',
  MAR:   'Marriott International',
  ADP:   'Automatic Data Processing',
  BKNG:  'Booking Holdings',
  TSLA:  'Tesla',
  ALNY:  'Alnylam Pharmaceuticals',
  APP:   'AppLovin',
  STX:   'Seagate Technology',
  MSTR:  'MicroStrategy',
  EA:    'Electronic Arts',
  MELI:  'MercadoLibre',
  CEG:   'Constellation Energy',
  SHOP:  'Shopify',
  MDLZ:  'Mondelez International',
  ADBE:  'Adobe',
  GOOG:  'Alphabet (Class C)',
  GOOGL: 'Alphabet (Class A)',
};

export function getCompanyName(ticker) {
  return COMPANY_NAMES[ticker] || ticker;
}

export function scoreStyle(score) {
  if (score >= 95) return 'red';
  if (score >= 85) return 'orange';
  return 'yellow';
}

export function getBand(abs) {
  if (abs >= 8) return 'MAX';
  if (abs >= 5) return 'Extreme';
  if (abs >= 3) return 'Strong';
  if (abs >= 2) return 'Meaningful';
  if (abs >= 1) return 'Mild';
  return '';
}

export function fmtPct(val) {
  const n = parseFloat(val);
  if (isNaN(n) || val === '' || val === null || val === undefined) return '—';
  return (n * 100).toFixed(1) + '%';
}

export function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mo[parseInt(m, 10) - 1]} ${day}, ${y}`;
}

export function reviewKey(row) {
  return `${row.ticker}_${row.report_date}`;
}

export function parseSummary(s) {
  if (!s) return [];
  return s.split(' | ').map(x => x.trim()).filter(Boolean);
}

export function buildExplanation(row) {
  const clauses = parseSummary(row.driver_summary).join('. ') + '.';
  const score   = parseFloat(row.anomaly_score_0_100).toFixed(1);
  const self    = parseFloat(row.self_history_score);
  const peer    = parseFloat(row.peer_relative_score);
  const selfOk  = !isNaN(self);
  const peerOk  = !isNaN(peer);
  let cmp = '';
  if (selfOk && peerOk) {
    cmp = self > peer
      ? "The divergence is strongest relative to the company's own history."
      : 'The divergence is strongest relative to QQQ peers.';
  } else if (!selfOk && peerOk) {
    cmp = 'Scoring is based on peer comparison only (no self-history available).';
  }
  return `This quarter was flagged because ${clauses} The anomaly score of ${score} reflects divergence from both the company's own historical range and its QQQ peer group. ${cmp} Review the linked SEC filing for management commentary and financial statement detail.`;
}
