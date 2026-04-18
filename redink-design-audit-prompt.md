# RedInk UI Design Audit — Claude Code Prompt

Paste this into Claude Code:

---

```
You are a senior product designer with Stripe-level craft and the product sense frameworks of Shreyas Doshi. Your job is to audit every pixel of the RedInk UI, identify what's working and what's not, and produce specific design improvement instructions I can feed back to Claude Code for implementation.

## Step 1: Setup

Install Puppeteer if not already installed:
npm install puppeteer

Launch the RedInk dev server (check package.json for the start command — likely `npm run dev` or `npm start`). Wait for it to be ready.

## Step 2: Comprehensive Screenshot Capture

Using Puppeteer, open the app and systematically capture EVERY state of the UI. Save all screenshots to `./design-audit/screenshots/`.

Capture these in order:

### 2a. Full Page States
- `01-landing-default.png` — Initial load, default state, no anomaly selected
- `02-landing-mobile.png` — Same page at 375px width (mobile viewport)
- `03-landing-tablet.png` — Same page at 768px width (tablet viewport)

### 2b. Anomaly List (Left Panel)
- `04-list-top.png` — Top of anomaly list, first 5-8 items visible
- `05-list-scrolled.png` — Scrolled to middle of list
- `06-list-bottom.png` — Bottom of list

### 2c. Anomaly Detail (Right Panel) — Use WBD as the hero example
- `07-detail-wbd-full.png` — Click into WBD, capture full detail panel
- `08-detail-wbd-top.png` — Detail panel scrolled to top (score, drivers)
- `09-detail-wbd-bottom.png` — Detail panel scrolled to bottom (trust indicators, filing link, review buttons)

### 2d. Click a DIFFERENT anomaly to show variation
- `10-detail-second-anomaly.png` — Click into the 2nd highest anomaly, full detail

### 2e. Filters & Search
- `11-filter-ticker-search.png` — Type a ticker into search, capture dropdown/results
- `12-filter-year.png` — Open year filter, capture state
- `13-filter-score-threshold.png` — Adjust score threshold if it exists
- `14-filter-status.png` — Filter by review status (Good/Needs Review/Skip) if available
- `15-filters-applied.png` — Multiple filters active, capture the filtered list

### 2f. Review Actions
- `16-review-buttons-default.png` — Close-up of Good / Needs Review / Skip in default state
- `17-review-good-selected.png` — Click "Good", capture the selected state
- `18-review-needs-review.png` — Click "Needs Review" on a different anomaly, capture modal if it exists
- `19-review-skip.png` — Click "Skip", capture the state change

### 2g. Interactive Elements & Hover States
- `20-hover-anomaly-row.png` — Hover over an anomaly row in the list
- `21-hover-filing-link.png` — Hover over "View SEC Filing" button
- `22-hover-review-button.png` — Hover over a review button

### 2h. Edge Cases & Empty States
- `23-empty-search.png` — Search for a ticker that doesn't exist (e.g., "ZZZZZ")
- `24-all-reviewed.png` — If possible, filter to show only reviewed items
- `25-no-results-filter.png` — Apply filters that return zero results

### 2i. Logo, Header, Footer
- `26-logo-header.png` — Close crop of the logo/header area
- `27-footer.png` — Close crop of the footer/disclaimer area if it exists

### 2j. Comments & Auth (if Firebase is integrated)
- `28-needs-review-modal.png` — The comment modal after clicking Needs Review
- `29-google-signin-button.png` — Close-up of Google sign-in button
- `30-comment-textarea.png` — The comment input area
- `31-existing-comments.png` — Any previously submitted comments displayed

For each screenshot, use viewport width 1440px (desktop) unless specified otherwise. Use `page.screenshot({ fullPage: true })` for full-page captures and element-specific screenshots for close-ups.

## Step 3: Design Analysis

Now view EVERY screenshot you captured. For each one, evaluate against these three lenses:

### Lens 1: Stripe Dashboard Aesthetic
Stripe's design language is defined by:
- **Data density without clutter** — lots of information visible, but breathing room between elements
- **Warm neutrals** — not cold gray/blue corporate. Warm off-whites, subtle warm grays
- **Typography hierarchy that guides the eye** — the most important number is the biggest and highest contrast. Secondary info is smaller and muted. You can tell what matters by squinting.
- **Subtle borders, not boxes** — content is separated by thin lines and whitespace, not heavy bordered cards
- **Interactive elements feel tactile** — buttons have clear hover states, clickable things look clickable, selected states are unambiguous
- **Consistent spacing** — padding and margins follow a system (4px, 8px, 12px, 16px, 24px, 32px)
- **Color used sparingly and with purpose** — accent color draws attention to the ONE thing that matters on each view. Not scattered everywhere.

### Lens 2: Shreyas Doshi Product Sense
Apply these concepts from Shreyas's frameworks:

**Motivation → Friction → Satisfaction → Nudge:**
- What MOTIVATES the analyst to use this screen? Is that motivation visually reinforced? (The anomaly score should create urgency. Does it?)
- What FRICTION exists in the current UI? Where does the user hesitate, get confused, or have to think about what to do next? Every moment of confusion is a product failure.
- What SATISFACTION does the user feel after completing an action? When they click "Good" or "Needs Review," does the UI reward them? Or does it just quietly change a dot color?
- What NUDGES exist to guide behavior? Is the "View SEC Filing" button prominent enough that analysts actually click it? Is the next logical action always obvious?

**Cognitive Empathy:**
- Put yourself in the analyst's shoes. They have 40 filings to triage. They're tired. They're looking for the ones that matter. Does the UI HELP them decide quickly, or does it make them work?
- The anomaly score should be the first thing the eye hits. Is it?
- The drivers should explain WHY this matters in 2 seconds of scanning. Do they?
- The trust indicators should give confidence without requiring investigation. Do they?

**High Craft / Product Taste:**
- Does every element earn its place on the screen? If you removed it, would the analyst notice?
- Is there anything that looks "default" — unstyled dropdowns, browser-default focus rings, generic placeholder text? Defaults signal "nobody cared about this."
- Does the product feel like it was built by someone who uses financial tools, or by someone who built a React app?

### Lens 3: RedInk Brand Alignment
- Does the UI use the RedInk palette consistently? (#C04830 accent, #1A1816 dark, #F5F0EB warm off-white, #6B6560 warm gray, #4A7C6F sage green for trust/positive)
- Does the divergence logo concept feel integrated, or pasted on?
- Does the overall feeling match "surgical precision on financial data" or does it feel like a generic dashboard?

## Step 4: Produce the Design Improvement Document

Create `./design-audit/improvements.md` with this structure:

```markdown
# RedInk UI Design Improvements

## Summary
- Total screenshots analyzed: [N]
- Critical issues (breaks usability): [N]
- High-impact improvements (noticeable quality jump): [N]
- Polish items (craft details): [N]

## Critical Issues
[For each: screenshot reference, what's wrong, why it matters for the analyst, specific fix instruction with CSS/component changes]

## High-Impact Improvements
[Same format — these are the changes that would make someone say "this looks like a real product"]

## Polish Items
[Same format — the craft details that separate good from great]

---

## Per-Screen Analysis

### Landing / Default State (screenshots 01-03)
**What's working:**
[Specific things that are well done]

**Shreyas lens — Motivation:**
[Does the first screen motivate the analyst to start triaging? What creates urgency?]

**Shreyas lens — Friction:**
[What's confusing or unclear on first load?]

**Improvements:**
1. [Specific change with implementation detail]
2. [Specific change with implementation detail]
...

### Anomaly List (screenshots 04-06)
[Same structure]

### Anomaly Detail — WBD (screenshots 07-09)
[Same structure]

### Filters & Search (screenshots 11-15)
[Same structure]

### Review Actions (screenshots 16-19)
[Same structure]

### Comments & Auth Modal (screenshots 28-31)
[Same structure]

### Mobile & Tablet (screenshots 02-03)
[Same structure]

### Logo, Header, Footer (screenshots 26-27)
[Same structure]

---

## Implementation Priority

### Do First (30 minutes, biggest visual impact)
1. [Change]
2. [Change]
3. [Change]

### Do Second (1-2 hours, significant quality lift)
1. [Change]
2. [Change]
...

### Do Third (nice-to-have polish)
1. [Change]
2. [Change]
...
```

## Step 5: Generate Implementation Prompts

For each improvement in the "Do First" and "Do Second" categories, write a Claude Code-ready prompt that I can paste directly to implement the fix. Save these to `./design-audit/implementation-prompts.md`.

Each prompt should:
- Reference the specific component/file to modify
- Include exact CSS values, colors, spacing, typography changes
- Include before/after description so Claude Code can verify
- Be self-contained (doesn't depend on reading the full audit)

Format:
```markdown
## Fix [N]: [Short title]
**File(s):** [component path]
**Screenshot:** [reference number]
**Before:** [what it looks like now]
**After:** [what it should look like]

### Prompt for Claude Code:
\`\`\`
[paste-ready prompt]
\`\`\`
```

## Rules

- Be brutally honest. This is a design audit, not a compliment sandwich.
- Every criticism must come with a specific fix, not just "this could be better."
- Every fix must include exact values — hex colors, pixel sizes, font weights, padding values.
- Reference Stripe's actual dashboard (stripe.com/docs or dashboard screenshots) for comparison when relevant.
- If something is genuinely well-designed, say so and explain WHY it works — don't manufacture problems.
- The analyst persona is always present: "Would a junior equity analyst at 10pm, triaging their 35th filing, find this helpful or frustrating?"
- Mobile is not optional — this should work on a phone even if desktop is primary.
- If the logo, disclaimer, or any text elements don't match RedInk's brand (palette: #C04830, #1A1816, #F5F0EB, #6B6560, #4A7C6F), flag them specifically.
```
