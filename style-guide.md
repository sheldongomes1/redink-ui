# RedInk — Style Guide
*Derived from Stripe dashboard aesthetic. Target: junior equity analysts and hiring managers.*

---

## 1. Design Philosophy
RedInk is a precision triage tool for equity analysts — clean, structured, and evidence-first. The aesthetic is **white + soft grays + a single violet accent**: the kind of interface that reads as professional and trustworthy without feeling like a consumer app. Inspired by Stripe's dashboard — high information density, generous whitespace, no decorative clutter. Every element earns its space by surfacing data.

---

## 2. Target User & JTBD
**Primary:** Junior to mid-level equity analyst triaging 10-Q/10-K filings without Bloomberg or AlphaSense.
**Secondary viewer:** Hiring manager or PM evaluating this as a portfolio piece — must understand the product's value within 10 seconds.
**JTBD:** "Show me which filings are worth my time, and show me why — fast."

---

## 3. Layout, Grid & Spacing

- **Base unit:** 4px
- **Panel layout:** Fixed left sidebar (288px), flex-fill right detail panel
- **App background:** #ffffff (pure white)
- **Section padding:** 20–24px horizontal, 16–20px vertical
- **Component gap:** 8px between related elements, 16px between sections, 24px between major sections
- **Dividers:** 1px solid #e5e7eb — visible but lightweight
- **Whitespace rule:** Dense but not cluttered. Metrics and drivers get breathing room. Never stack elements without a gap.
- **Scrollbar:** 5px width, #e5e7eb thumb, #f9fafb track

---

## 4. Typography

| Role | Family | Size | Weight | Notes |
|------|--------|------|--------|-------|
| Ticker / Company name | Inter | 18–20px | 700 | High contrast, #111827 |
| Section label | Inter | 11px | 600 | ALL CAPS, 0.08em letter-spacing, #9ca3af |
| Body / Explanation | Inter | 13px | 400 | Line-height 1.6, #374151 |
| Score (large) | Inter | 28–32px | 700 | Score color (red/orange/yellow) |
| Metric value | Inter | 14px | 600 | #111827 or red for negatives |
| Metadata / Chips | Inter | 11–12px | 400–500 | Dates, trust chips, labels |
| Driver label | Inter | 13px | 400 | #374151 |
| Driver z-score | Inter | 13px | 600 | Monospace feel via tabular nums |

**Rules:**
- Single font family throughout: Inter (400, 500, 600, 700)
- Load from Google Fonts — never fall back to system fonts in production
- Negative financial values always in #dc2626 red
- Section headers: small caps, wide tracking, #9ca3af muted

---

## 5. Colors

```
Background (app):       #ffffff  (pure white)
Surface (sidebar):      #f9fafb  (gray-50)
Surface raised:         #f3f4f6  (gray-100, for hover states)
Border default:         #e5e7eb  (gray-200)
Border hover:           #d1d5db  (gray-300)

Text primary:           #111827  (gray-900)
Text secondary:         #374151  (gray-700)
Text muted:             #6b7280  (gray-500)
Text disabled:          #9ca3af  (gray-400)

Accent:                 #635bff  (violet — Stripe-inspired)
Accent hover:           #4f46e5
Accent bg:              #ede9fe
Accent border:          #c4b5fd

Score — Extreme (95+):
  Text:   #dc2626  (red-600)
  Bg:     #fef2f2  (red-50)
  Border: #fecaca  (red-200)

Score — High (85–94):
  Text:   #c2410c  (orange-700)
  Bg:     #fff7ed  (orange-50)
  Border: #fed7aa  (orange-200)

Score — Moderate (70–84):
  Text:   #a16207  (yellow-700)
  Bg:     #fefce8  (yellow-50)
  Border: #fef08a  (yellow-200)

Driver — Positive:      #f59e0b  (amber-500 — above baseline)
Driver — Negative:      #dc2626  (red-600 — below baseline)

Review — Good:
  Bg:     #f0fdf4, Border: #86efac, Text: #16a34a

Review — Needs Review:
  Bg:     #fffbeb, Border: #fcd34d, Text: #d97706

Review — Skip:
  Bg:     #f9fafb, Border: #d1d5db, Text: #6b7280
```

---

## 6. Components

### Score Badge
- Large number (28–32px) in score color with matching bg + border
- Displayed as a pill: padding 4px 12px, rounded-full
- Label above or beside: small muted caps e.g. `ANOMALY SCORE`

### Driver Bar
- Track: 4px height, #e5e7eb background, fully rounded
- Fill: solid amber (#f59e0b) for positive, red (#dc2626) for negative
- Animated on load: 0.45s cubic-bezier(0.4, 0, 0.2, 1)
- Bar capped at 100% width for MAX (±8) values
- Label: left-aligned 13px secondary text
- Value + direction arrow (↑ ↓): right-aligned, 13px semibold
- Band label (Mild / Strong / Extreme / MAX): 11px muted, right of value

### Metric Card
- Border: 1px #e5e7eb, rounded-lg (8px)
- Background: white
- Label: 11px muted all-caps wide-tracking
- Value: 14px semibold — #dc2626 for negatives, #111827 for positives

### Trust Chip
- 11px, border 1px #e5e7eb, background #f9fafb, text #6b7280
- Error state: border #fecaca, text #dc2626
- Inline row, gap 6px between chips

### SEC Filing Button
- Full width, prominent
- Primary style: bg #635bff, text white, rounded-lg
- Hover: bg #4f46e5
- If filing URL missing: disabled, bg #f3f4f6, text #9ca3af, cursor not-allowed

### Review Buttons (Good / Needs Review / Skip)
- Default: border #e5e7eb, text #6b7280, bg white
- Active Good: bg #f0fdf4, border #86efac, text #16a34a
- Active Needs Review: bg #fffbeb, border #fcd34d, text #d97706
- Active Skip: bg #f9fafb, border #d1d5db, text #6b7280
- Height: 36px, rounded-lg, 13px medium, flex-1 equal width

### Left Panel Row
- Default: bg white, border-bottom 1px #f3f4f6
- Hover: bg #f9fafb (transition 0.1s ease)
- Selected: bg #f9fafb, left border 2px accent (#635bff)
- Review status dot: 7px circle, color matches review state

### Filter Controls
- Text inputs + selects: border 1px #e5e7eb, bg white, rounded-md
- Height: 32px, 12px text, #374151
- Focus: border #635bff, outline none
- Select: no native appearance, custom dropdown arrow

---

## 7. Content Style

- **Tone:** Direct and analytical. An analyst's tool — not a marketing page, not a consumer app.
- **Labels:** ALL CAPS with tracking for section headers (ANOMALY SCORE, TOP DRIVERS, etc.). Normal case for data labels.
- **Numbers:** Always formatted — percentages to 1 decimal, z-scores to 2 decimal.
- **Empty states:** Single sentence, muted, no emoji. "Select a row to view details."
- **Error messages:** State the problem plainly. "No filing URL available" not "Error: null."
- **Microcopy:** Lowercase, minimal punctuation. "8 features used" not "8 Features Used."
- **Driver direction:** Always pair arrow (↑ ↓) with value — never rely on color alone.

---

## 8. Accessibility

- All text meets WCAG AA contrast against white backgrounds
- Focus states: 2px outline in #635bff (accent), offset 2px
- Touch targets: minimum 36px height on all interactive elements
- Keyboard nav: tab order follows visual reading order (top → down, left panel → right panel)
- Screen reader labels on icon-only and color-coded elements
- Color is never the only signal — arrows supplement driver bar colors, labels supplement score badges
- Scrollbars styled but remain functional — never hidden entirely

---

## 9. Do / Don't

| ✓ Do | ✗ Don't |
|------|---------|
| White (#ffffff) app background | Dark or near-black backgrounds |
| Inter for all text | Geist, Roboto, system fonts, or monospace for body |
| Violet accent (#635bff) for interactive elements | Blue, teal, or multiple accent colors |
| Soft gray borders (#e5e7eb) | Heavy borders or thick dividers |
| Score as colored pill with bg tint | Score as plain unstyled number |
| Animated driver bars (0.45s ease) | Instant or jarring bar transitions |
| Muted all-caps section labels | Large bold section headers |
| Red for negative financial values only | Red for decorative or non-critical elements |
| Full-width violet SEC filing button | Small inline or ghost filing link |
