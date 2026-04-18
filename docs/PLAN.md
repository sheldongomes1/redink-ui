# RedInk — Driver Score Explainer + DriverBar Upgrade

## Context
Junior equity analysts don't understand what z-scores or driver scores mean. When they see "▲ 8.00" next to "Revenue Growth (YoY)" they have no frame of reference. The `instructions.md` file was updated with a full section defining driver score interpretation bands, color rules, direction labels, tooltip copy, and a plain-English explainer. This plan incorporates all of it.

Two things changed:
1. A **smart summary banner** appears at the top of the Drivers section — a small plain-English callout explaining what driver scores are and how to read them.
2. The **DriverBar component** was upgraded: band labels, correct colors, MAX indicator, hover tooltips.

## Changes Made to index.html

### 1. Added `getBand(absZ)` helper
```js
function getBand(absZ) {
  if (absZ >= 8) return { label: 'MAX',       color: 'text-red-300' };
  if (absZ >= 5) return { label: 'Extreme',   color: 'text-red-400' };
  if (absZ >= 3) return { label: 'Strong',    color: 'text-amber-400' };
  if (absZ >= 2) return { label: 'Meaningful',color: 'text-amber-300' };
  if (absZ >= 1) return { label: 'Mild',      color: 'text-gray-400' };
  return         { label: '',                 color: 'text-gray-500' };
}
```

### 2. Added `DriverSummaryBanner` component
Plain-English callout above driver bars explaining what driver scores are, direction symbols, and band meanings.

### 3. Upgraded `DriverBar` component
- Direction symbols: `↑` (above baseline) and `↓` (below baseline)
- Bar colors: positive = amber, negative = red
- Band label shown alongside z-score value
- Full-width bar for MAX (±8) values
- Hover tooltip from instructions.md spec

### 4. Inserted `<DriverSummaryBanner />` in detail panel
Placed after the "Top Drivers" section header, before the first DriverBar.

## Critical File
- `/home/sheldongomes/AIProjects/redink-ui/index.html`

## Status
✅ Implemented
