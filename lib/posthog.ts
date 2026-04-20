// PostHog analytics — see event definitions in CLAUDE.md
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_nxfpy9cdozjLFf4UsdvZFXy4XNccJL9PCjCfGHLufRFB';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Stash on window so that code-split bundles (layout chunk vs page chunk) share
// the same initialised PostHog instance instead of each holding a private copy.
declare global {
  interface Window { posthog?: typeof posthog }
}

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (window.posthog) return;
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
  });
  window.posthog = posthog;
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const p = window.posthog;
  if (!p) return;
  p.capture(event, properties);
}

export function identify(distinctId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const p = window.posthog;
  if (!p) return;
  p.identify(distinctId, properties);
}

export function resetPostHog() {
  if (typeof window === 'undefined') return;
  const p = window.posthog;
  if (!p) return;
  p.reset();
}
