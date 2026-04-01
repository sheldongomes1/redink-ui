# RedInk — Style Guide
*Derived from Vercel dashboard aesthetic. Target: impress Google hiring managers.*

---

## 1. Design Philosophy
RedInk is a precision instrument for equity analysts — not a dashboard, not a consumer app. Every element earns its space. The aesthetic is **true black + high contrast + surgical typography**: the kind of interface that signals deep craft to a hiring manager who has seen a thousand AI-generated clones. Inspired by Vercel's dark mode — clean, unornamented, technically authoritative.

---

## 2. Target User & JTBD
**Primary:** Junior to mid-level equity analyst triaging 10-Q/10-K filings without Bloomberg or AlphaSense.
**Secondary viewer:** Google hiring manager or PM evaluating this as a portfolio piece — must understand the product's value within 10 seconds.
**JTBD:** "Show me which filings are worth my time, and show me why — fast."

---

## 3. Layout, Grid & Spacing

- **Base unit:** 4px
- **Panel layout:** Fixed left sidebar (288px), flex-fill right panel
- **Section padding:** 24px horizontal, 20px vertical
- **Component gap:** 8px between related elements, 16px between sections
- **Dividers:** 1px solid, extremely subtle — use border opacity not thick lines
- **Whitespace rule:** When in doubt, add more. Dense ≠ cluttered. Every metric needs room to breathe.

---

## 4. Typography

| Role | Family | Size | Weight | Notes |
|------|--------|------|--------|-------|
| Ticker / Hero | Geist Mono | 30px | 700 | Tickers, scores, key numbers |
| Section label | Geist Sans | 10px | 500 | ALL CAPS, 0.15em letter-spacing |
| Body / Explanation | Geist Sans | 12px | 400 | Line-height 1.6 |
| Metric value | Geist Mono | 14px | 600 | Numbers always in mono |
| Metadata / Chips | Geist Mono | 10px | 400 | Dates, labels, trust chips |
| Driver label | Geist Sans | 12px | 400 | Normal case |

**Rules:**
- Tickers, scores, z-scores, percentages → always monospace
- Section headers → small caps, wide tracking, muted color
- Body text → never pure white; use off-white (#a1a1aa) for readability
- No Inter. No Roboto. No system fonts. Load Geist.

---

## 5. Colors

```
Background (app):     #000000  (true black — Vercel's signature)
Surface (panel):      #0a0a0a  (near-black for right panel)
Surface raised:       #111111  (cards, sub-panels)
Border default:       #1a1a1a  (hairline — very subtle)
Border hover:         #2a2a2a  (slightly visible on interaction)

Text primary:         #fafafa  (ticker, score, company name)
Text secondary:       #a1a1aa  (body, explanation)
Text muted:           #52525b  (labels, metadata, dates)
Text disabled:        #27272a  (placeholders, inactive)

Score — Extreme:      #ef4444  (red-500 — 95+)
Score — High:         #f97316  (orange-500 — 85-94)
Score — Moderate:     #eab308  (yellow-500 — 70-84)

Driver — Positive:    #f59e0b  (amber-500 — above baseline)
Driver — Negative:    #ef4444  (red-500 — below baseline)

Success:              #22c55e  (green-500)
Warning:              #f59e0b  (amber-500)

SEC button:           #fafafa text on #000000 bg with #3f3f46 border
                      → on hover: #ffffff text, #52525b border
```

---

## 6. Components

### Score Badge
- Large number (30px+) in score color — NOT a pill/badge
- Label below: `ANOMALY SCORE` in 9px muted small caps
- Severity label beside ticker: `EXTREME` / `HIGH` / `MODERATE` — monospace, score color, 10px

### Driver Bar
- Track: 1px height, #1a1a1a background, fully rounded
- Fill: gradient — positive: amber-700 → amber-400, negative: red-700 → red-400
- Label: left-aligned, 12px secondary text
- Value: right-aligned monospace, direction arrow (↑ ↓)
- Band label: 10px muted, right of value

### Sub-score Triptych
- Three columns in a single bordered container
- Border: 1px #1a1a1a, rounded-md
- Dividers between columns: 1px #1a1a1a vertical
- Labels: 9px muted all-caps
- Values: 14px mono semi-bold primary text

### Metric Card
- Border only: 1px #1a1a1a (no background fill)
- Rounded-md
- Label: 9px muted all-caps uppercase wide-tracking
- Value: 14px mono bold — red for negative, primary for positive

### Trust Chip
- 10px mono, border 1px #1a1a1a, transparent bg, muted text
- Error state: border red-900/60, text red-500
- No background fill on default chips

### SEC Filing Button
- Full width
- Style: border 1px #3f3f46, transparent bg, text #fafafa
- Hover: bg #111111, border #52525b
- Text: 12px semibold tracking-wide

### Review Buttons (Good / Needs Review / Skip)
- Default: border #1a1a1a, text muted, transparent bg
- Active Good: bg #052e16 (green-950), border #166534 (green-800), text #4ade80
- Active Needs Review: bg #451a03 (amber-950), border #92400e (amber-800), text #fbbf24
- Active Skip: bg #18181b, border #3f3f46, text #a1a1aa
- Height: 40px, rounded-md, 12px semibold

### Left Panel Row
- Selected: bg #0a0a0a, left border 1px score-color
- Hover: bg #0a0a0a transition-colors
- Border-bottom: 1px #0f0f0f (barely visible)

---

## 7. Content Style

- **Tone:** Authoritative, precise, zero fluff. An analyst's tool, not a consumer product.
- **Labels:** ALL CAPS with tracking for section headers. Normal case for data labels.
- **Numbers:** Always formatted — percentages to 1 decimal, z-scores to 2 decimal.
- **Empty states:** Single sentence, muted, no emoji.
- **Error messages:** State the problem, not the cause. "No filing URL available" not "Error: null value detected."
- **Microcopy:** "Marked as needs review · click again to clear" — lowercase, minimal punctuation.

---

## 8. Accessibility

- All text meets WCAG AA contrast against black backgrounds
- Focus states: 1px outline in #3f3f46, offset 2px
- Touch targets: minimum 36px height on interactive elements
- Keyboard nav: tab order follows visual hierarchy
- Screen reader labels on icon-only elements
- Color is never the only signal — direction arrows (↑ ↓) supplement driver bar colors

---

## 9. Do / Don't

| ✓ Do | ✗ Don't |
|------|---------|
| True black backgrounds (#000000) | Dark gray backgrounds (#1a1a1a as base) |
| Geist Mono for all numbers | Inter or system fonts for anything |
| Hairline borders (1px #1a1a1a) | Thick borders or heavy dividers |
| Score as large standalone number | Score in a colored pill/badge |
| Border-only metric cards | Filled gray metric cards |
| Full-width ghost-style SEC button | Small inline blue filled button |
| 9px section labels with wide tracking | 12px gray uppercase section labels |
| Gradient driver bar fills | Solid color driver bar fills |
