# RedInk — UI Wireframes

## Left Panel Row (with Company Name)

```
┌──────────────┬─────────────────────────────────────┐
│ 🔴 REDINK    │  WBD                        [100] 🔴 │
├──────────────┤  Warner Bros. Discovery              │
│ [Search ___] │  Q2 2022 · Filed: Aug 05, 2022       │
│ (searches    │  Self: 4.29  |  Peer: 3.85           │
│  ticker AND  ├─────────────────────────────────────┤
│  company)    │  Drivers...                          │
│ [Year ▼]     │                                     │
│ [Score ▼]    │                                     │
│ [Status ▼]   │                                     │
├──────────────┤                                     │
│ WBD    [100] │                                     │
│ Warner Bros. │                                     │
│ Jun 30, 2022 │                                     │
│ Revenue...   │                                     │
├──────────────┤                                     │
│ FANG   [99]  │                                     │
│ Diamondback  │                                     │
│ Mar 31, 2022 │                                     │
│ Revenue...   │                                     │
└──────────────┴─────────────────────────────────────┘
```

## Right Panel — Driver Section (with Smart Summary)

```
┌─────────────────────────────────────────────────────┐
│  TOP DRIVERS                                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ ℹ Driver scores show how unusually each       │  │
│  │   metric moved vs. company history & QQQ      │  │
│  │   peers. ↑ above baseline  ↓ below baseline   │  │
│  │   Mild (1–2) · Strong (3–5) · Extreme (5+)   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Revenue Growth (YoY)       ↑ 8.00  MAX            │
│  ████████████████████████████████████████ (amber)  │
│                                                     │
│  Asset Growth (YoY)         ↑ 8.00  MAX            │
│  ████████████████████████████████████████ (amber)  │
│                                                     │
│  Net Margin                 ↓ 6.00  Extreme        │
│  ████████████████████████████████████     (red)    │
└─────────────────────────────────────────────────────┘
```

## Notes
- Driver banner is always visible, not collapsible
- ↑ = above baseline (amber bar), ↓ = below baseline (red bar)
- Band labels: Mild (1–2), Meaningful (2–3), Strong (3–5), Extreme (5+), MAX (8)
- Hover any driver bar to see tooltip explaining what the score means
- Search searches both ticker AND company name (case-insensitive)
