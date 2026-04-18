# RedInk Integration Prompts for Claude Code

---

## PROMPT 1: PostHog Event Tracking Integration

Paste this into Claude Code:

---

```
PostHog MCP is connected. Now integrate PostHog into the RedInk React app so we capture meaningful product analytics events.

Read the existing codebase in redink-ui/ first. Understand the component structure before adding anything.

## What to install

npm install posthog-js

## Initialize PostHog

In the app's entry point (likely main.jsx or App.jsx), initialize PostHog with my project API key and host. Check the PostHog MCP connection for the project details, or ask me for the API key if you can't find it.

```javascript
import posthog from 'posthog-js'

posthog.init('<API_KEY>', {
  api_host: 'https://us.i.posthog.com', // or eu. depending on my project
  capture_pageview: true,
  capture_pageleave: true
})
```

## Events to track — only these, nothing else

Track these 6 events. Each one maps to a real product question I want to answer:

1. **anomaly_viewed** — When an analyst clicks into an anomaly detail view
   - Properties: { ticker, anomaly_score, report_date, rank_position }
   - Product question: "Which anomalies are analysts actually investigating?"

2. **filing_link_clicked** — When they click "View SEC Filing"
   - Properties: { ticker, anomaly_score, filing_url }
   - Product question: "Are analysts trusting the detection enough to go to the source?"

3. **review_action** — When they click Good / Needs Review / Skip
   - Properties: { ticker, anomaly_score, action, report_date }
   - Product question: "What's the quality distribution of our anomaly explanations?"

4. **filter_applied** — When they use any filter (ticker search, year, score threshold, status)
   - Properties: { filter_type, filter_value }
   - Product question: "How are analysts narrowing down the anomaly list?"

5. **session_start** — Automatic (PostHog handles this with capture_pageview)
   - Product question: "How often do analysts return?"

6. **anomaly_time_spent** — Time spent on each anomaly detail view (track on unmount or navigation away)
   - Properties: { ticker, anomaly_score, duration_seconds }
   - Product question: "How long does it take an analyst to evaluate an anomaly?"

## Implementation rules

- Use posthog.capture('event_name', { properties }) for each event
- For anomaly_time_spent, record a timestamp when the detail view mounts and calculate duration when it unmounts or when the user navigates to a different anomaly
- Do NOT track every click or scroll — only the 6 events above
- Do NOT add any UI elements for PostHog — it should be invisible to the user
- Add a single comment block at the top of wherever you add tracking: "// PostHog analytics — see event definitions in CLAUDE.md"

## Verify

After adding, open the app in the browser and click through a few anomalies. Then check PostHog (via MCP or the dashboard) to confirm events are arriving. Tell me what you see.
```

---

## PROMPT 2: Google Auth + Firebase Comments on "Needs Review"

Paste this into Claude Code:

---

```
Add Google Authentication and a Firebase-backed comment system to RedInk. When an analyst clicks "Needs Review", a modal should appear where they can log in with Google and leave a comment explaining why.

Read the existing codebase in redink-ui/ first. Understand how the review buttons (Good / Needs Review / Skip) currently work and where review state is stored (likely localStorage).

## Step 1: Firebase Setup

I will create the Firebase project manually. You tell me exactly what to do in the Firebase Console, step by step:
- Create project (name: redink or redink-app)
- Enable Authentication → Google sign-in provider
- Create Firestore database (start in test mode for now, we'll add rules later)
- Get the Firebase config object

Once I give you the config, proceed with code.

## Step 2: Install dependencies

npm install firebase

## Step 3: Create firebase config file

Create a file `src/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  // I will paste my config here after creating the project
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
```

## Step 4: The UX Flow

Current behavior: User clicks "Needs Review" → review status saves to localStorage.

New behavior:
1. User clicks "Needs Review" → modal appears
2. Modal shows:
   - If NOT logged in: "Sign in with Google" button (the familiar Google OAuth popup)
   - If logged in: Shows user's name/avatar at top, then a text area for their comment
3. User types comment (required, minimum 10 characters) and clicks "Submit"
4. Comment saves to Firestore with: { ticker, anomaly_score, report_date, comment_text, user_email, user_name, timestamp }
5. Review status also saves (keep localStorage for review status, add Firestore for comments)
6. Modal closes, "Needs Review" button shows as selected (same as current behavior)
7. If user clicks "Good" or "Skip" — no modal, behaves exactly as before (no comment needed)

## Step 5: Auth Implementation

Use Firebase Auth with popup (not redirect — popup is faster and more familiar):

```javascript
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

const signIn = async () => {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}
```

Persist auth state so they don't have to log in every time:

```javascript
import { onAuthStateChanged } from 'firebase/auth'

onAuthStateChanged(auth, (user) => {
  if (user) {
    // user is signed in — store in React state
  }
})
```

## Step 6: Firestore Comment Storage

Collection: `reviews`

Document structure:
```javascript
{
  ticker: "WBD",
  anomaly_score: 100.0,
  report_date: "2022-06-30",
  comment_text: "Net margin collapse not addressed in narrative. Need to cross-check Q3.",
  user_email: "analyst@example.com",
  user_name: "Jane Smith",
  user_photo: "https://...",
  created_at: serverTimestamp(),
  status: "needs_review"
}
```

## Step 7: Display Previous Comments

In the anomaly detail view, below the review buttons, show any existing comments for that ticker+report_date:
- Show each comment with: user name, avatar, date, comment text
- Sort by newest first
- Only show if comments exist (don't show empty section)
- Style: subtle, not dominant — the anomaly data should still be the focus

## Step 8: PostHog Event

If PostHog is already integrated, add one more event:

```javascript
posthog.capture('comment_submitted', {
  ticker,
  anomaly_score,
  has_comment: true,
  comment_length: comment_text.length
})
```

## Design Rules

- The modal should match RedInk's existing design language (warm palette, clean typography)
- "Sign in with Google" button should use Google's official branding guidelines (white background, Google logo, "Sign in with Google" text)
- The comment text area should be simple — no rich text editor, just a plain textarea
- Mobile-friendly: modal should work on mobile screens
- Loading states: show a spinner while auth is in progress and while comment is saving
- Error states: show a clear message if auth fails or comment fails to save

## Security Note (for later)

For now, use Firestore test mode rules. Before any real deployment, we need to add proper security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.user_uid;
    }
  }
}
```

Add a TODO comment in the firebase.js file reminding us to switch from test mode to production rules before real launch.

## What NOT to do

- Don't migrate all localStorage state to Firestore — only comments go to Firestore. Review status (Good/Needs Review/Skip) stays in localStorage for now.
- Don't require login for Good or Skip — only Needs Review triggers the auth flow.
- Don't add a separate login page or login button in the header — auth happens in-context when needed.
- Don't add user profile features, settings, or account management — keep it minimal.
```

---

## Order of Operations

1. Run Prompt 1 first (PostHog) — it's simpler and doesn't depend on anything
2. Verify PostHog events are arriving
3. Then run Prompt 2 (Google Auth + Firebase) — more complex, takes longer
4. After Firebase is working, verify the comment_submitted PostHog event also fires

Both integrations are additive — they don't change existing functionality, only add new capabilities on top.
