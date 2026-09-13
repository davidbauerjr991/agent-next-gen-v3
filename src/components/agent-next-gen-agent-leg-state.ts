// Shared, cross-page "agent leg" (softphone/telephony connection) status —
// per explicit request ("keep the state of the agent leg consistent if the
// user goes from premium to advanced to basic"): "Agent Workspace 2.0
// Premium" (AgentWorkspace2WithDeskPage.tsx), "Agent Workspace 2.0 Advanced"
// (AgentWorkspaceAdvancedPage.tsx), and the plain "agent" page
// (AgentNextGenPage.tsx) are each their own separate top-level route/
// component (App.tsx) — switching between them via the app-picker dropdown
// fully unmounts one and mounts the other, not a re-render of a shared
// component. `AgentProfile` (lyra-ui) has always owned `agentLegStatus`
// itself, as plain internal `useState` defaulting to `"disconnected"` on
// every mount — so a genuinely CONNECTED agent leg on Premium looked
// disconnected again the instant they switched to Advanced, with nothing
// having actually changed about the leg itself.
//
// This module is the fix: each page seeds `AgentProfile`'s new
// `initialAgentLegStatus` prop (agent-profile.tsx) from `readAgentLegStatus()`
// at mount, and calls `saveAgentLegStatus()` every time `onAgentLegStatusChange`
// reports a real connect/disconnect, so the NEXT page mount (whichever tier
// the agent switches to) picks up right where this one left off.
//
// IMPORTANT — deliberately in-memory ONLY, never `localStorage`. An earlier
// version of this module persisted `cache` to `localStorage`, which caused a
// real, reported bug back when a fresh login was supposed to start
// disconnected: `localStorage` survives an actual browser reload/new tab, not
// just an in-app tier switch, so once the agent leg had ever been connected
// once, every future fresh login kept reading that stale value back, with no
// way to distinguish "the agent just switched tiers a moment ago" from "this
// is a brand new login." A plain in-memory module singleton still fixes that
// same class of bug today, just aimed at the opposite default (see `cache`'s
// own doc comment below for the current, connected-by-default behavior):
// `App.tsx`'s own top-level `App` component never unmounts across a tier
// switch (Premium → Advanced → Basic just swaps which page component it
// renders — see App.tsx's own hash-router), so a real connect/disconnect
// still correctly survives every in-session switch; a genuine browser reload
// creates a fresh JS module instance, resetting `cache` back to its default
// regardless of whatever the leg was doing in a previous tab/session. See
// `consumeInitialAgentLegAnnouncement` below for the matching "announce once
// per login, not on every tier switch" half of the same fix.
//
// Deliberately only ever stores the two SETTLED states — `"connecting"` is a
// transient, in-flight animation with no meaning as a starting point for a
// fresh mount (see `AgentProfile`'s own `initialAgentLegStatus` doc comment)
// — so this module's own type is narrower than `AgentProfile`'s full
// `agentLegStatus` union on purpose.
//
// Importantly, seeding a value here is NOT itself a connect/disconnect
// event: `AgentProfile`'s own `isFirstAgentLegRender` mount-skip guard means
// `onAgentLegStatusChange` (and therefore any consumer's own toast) never
// fires just from hydrating this seeded value on mount — switching tiers
// must silently carry the status over, never re-announce it as if it had
// just happened again. The actual "announce on login" behavior is handled
// separately, by each page explicitly calling `fireAgentLegStatusToast`
// itself when `consumeInitialAgentLegAnnouncement()` says this mount is a
// fresh login.

export type AgentLegSettledStatus = "disconnected" | "connected";

// Always starts `"connected"` — per explicit request ("have the agent leg
// connected when the app loads - only display the toast that it's
// disconnected if the user purposely disconnects from the status menu").
// This used to start `"disconnected"` (matching `AgentProfile`'s own
// pre-existing default), with each page announcing that on first mount via
// `consumeInitialAgentLegAnnouncement`/`fireAgentLegStatusToast` below — a
// deliberate "you're not connected, here's a toast" landing experience. That
// announce-on-login machinery is left in place (still only ever fires for a
// `"disconnected"` initial status, never `"connected"` — see
// `consumeInitialAgentLegAnnouncement`'s own doc comment), but is now
// effectively dormant on a genuine fresh login: starting `"connected"` means
// there's nothing disconnected to announce. The toast the agent actually
// sees now comes from exactly one place — `AgentProfile`'s own real
// connect/disconnect flow (`onAgentLegStatusChange`, fired by
// `handleAgentLegToggle` when the agent clicks the leg row in their own
// status menu) — never automatically on load. (Per the fix above) this is
// never seeded from `localStorage`, so every genuinely fresh browser session
// starts here regardless of what any earlier session left the leg in.
let cache: AgentLegSettledStatus = "connected";

/** Reads the agent leg's current settled status for THIS browser tab's
 *  session — call once at mount to seed `AgentProfile`'s
 *  `initialAgentLegStatus` prop. */
export function readAgentLegStatus(): AgentLegSettledStatus {
  return cache;
}

/** Persists a real, settled connect/disconnect — called from each page's
 *  own `fireAgentLegStatusToast`/`onAgentLegStatusChange` handler, so the
 *  very next page mount (whichever tier the agent switches to, within this
 *  same browser tab) picks up the change. Never called with `"connecting"`;
 *  see this module's own top-of-file doc comment. */
export function saveAgentLegStatus(status: AgentLegSettledStatus) {
  cache = status;
}

// Whether the "you're not connected" toast has already been shown once in
// this browser tab's lifetime. Per the original explicit request behind this
// mechanism: "I want it to display a not connected toast [on login] but if
// connected, keep it connected when going to premium, advanced, basic (and
// likewise keep it disconnected but don't fire the toast again)." `cache`
// above now defaults to `"connected"` instead of `"disconnected"` (per a
// later explicit request), which leaves this flag/function effectively
// dormant on a genuine fresh login — there's nothing disconnected to
// announce — but it's kept rather than removed: it's still exactly correct
// if `cache`'s own default ever changes back, and nothing about "don't
// re-announce on a tier switch" stopped being true. Same in-memory-module-
// singleton reasoning as
// `cache` above — survives every in-session tier switch, resets on a real
// reload. Deliberately consumed only from inside a mount-only `useEffect` in
// each page, never a `useState` lazy initializer — React 18 StrictMode (this
// app runs under it, see main.tsx) double-invokes lazy initializers during
// render as an impurity check, which would silently burn this exactly once
// on a throwaway, discarded render. Effects don't have that problem the same
// way: StrictMode's dev-only effect double-invoke is mount → cleanup →
// mount, so the second call here still correctly sees the flag already
// consumed by the first, and the user only ever sees the toast once either
// way.
let hasAnnouncedInitialStatus = false;

/** Returns `true` the first time this is ever called in this browser tab's
 *  lifetime, and `false` every time after. Call once from a mount-only
 *  `useEffect` in each Agent Workspace page: `true` means this mount is a
 *  fresh login (announce the current status, if it's `"disconnected"`);
 *  `false` means this mount is a tier switch (stay silent — the status
 *  itself still carries over via `readAgentLegStatus`, only the
 *  announcement doesn't repeat). See this file's own top-of-file doc
 *  comment. */
export function consumeInitialAgentLegAnnouncement(): boolean {
  if (hasAnnouncedInitialStatus) return false;
  hasAnnouncedInitialStatus = true;
  return true;
}
