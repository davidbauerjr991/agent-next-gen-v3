import * as React from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Tag } from "@nicecxone/lyra-ui";

/* ── useCustomerAiSummaryPanelContent ──
   Per explicit follow-up request ("customer information, details and
   customer summary are all opening in separate panels, they should all
   open in one side panel and just replace the current information in the
   side panel with the selected information" — refined further: "mimic
   Claude's own navigation paradigm of having the Details... open closable
   and full-screenable overlays that have the content selected"): this used
   to be `CustomerAiSummaryPanel`, a self-contained component that rendered
   its OWN separate `SidePanel` (see git history for that version's own doc
   comment on why it was split out from `CustomerInformationSidePanel`/
   `useCustomerDetailsInteriorPanel` in the first place — that reasoning,
   a purpose-built narrative view rather than the tabbed record-editing UI,
   still holds). Converted into a HOOK, following the EXACT same shape
   `useCustomerDetailsInteriorPanel` (agent-next-gen-customer-info-panel.tsx)
   and `useSessionDetailsTabContent` already established for this: the
   caller's own single, already-existing "Details" `SidePanel` owns the one
   physical panel per page now, and swaps ITS headerIcon/headerTitle/
   headerSubhead/body between whichever of the three content modes
   (Session Details, Customer Information, AI Summary) is currently active,
   rather than each mode opening a second/third physical panel of its own.

   No `headerTabs`/`footer` in the returned shape (unlike
   `useCustomerDetailsInteriorPanel`) — this view has no tab row and no
   edit/save state of its own, just a scrolling read-only narrative.

   `headerIcon` is a back arrow (same `ArrowLeft`/"Back to Details" idiom
   `useCustomerDetailsInteriorPanel`'s own `onBack` already uses) rather
   than a close (X): per the same "swap in place" paradigm, dismissing THIS
   view should reveal whatever the panel was showing before AI Summary took
   over (Session Details, or Customer Information if that's where "View
   customer info" was clicked from) — the caller's own priority-ordered
   ternary chain (aiSummaryPanelOpen > customerDetailsOpen > base content)
   makes that fall out for free once this hook's `onBack` just flips
   `aiSummaryPanelOpen` back off, without this hook needing to know or care
   which of the other two modes it's returning to. The panel's own single
   "Close Details" button (unchanged, still built by hand at each render
   site) remains the one control that dismisses the WHOLE panel outright,
   resetting all three modes' state at once — see that button's own
   `onToggle` for the full reset list. */
export function useCustomerAiSummaryPanelContent({
  onBack,
  customerName,
  subtitle,
  tags,
  summary,
  nextBestAction,
}: {
  /** Fired by the returned `headerIcon` (the back arrow) — the caller is
   *  expected to swap this view back off (e.g. `setAiSummaryPanelOpen(false)`),
   *  which naturally reveals whichever OTHER content the panel's own
   *  priority chain says should show next. */
  onBack: () => void;
  customerName?: string;
  /** `customerCard.subtitle` from `buildCustomerContextOverviewInfo` — e.g.
   *  "Platinum Tier · 6 yrs tenure" — shown under the customer name. */
  subtitle?: string;
  tags?: string[];
  /** The AI-style narrative paragraphs — `detailedSummary` from
   *  `buildCustomerContextOverviewInfo`. */
  summary?: string[];
  nextBestAction?: string;
}): { headerIcon: React.ReactNode; headerTitle: string; headerSubhead?: string; body: React.ReactNode } {
  return {
    headerIcon: (
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-6 w-6 items-center justify-center rounded-lyra-sm text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
    ),
    headerTitle: "AI Customer Summary",
    headerSubhead: customerName,
    body: (
      <div className="flex flex-col gap-4 p-4">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Tag key={tag} label={tag} shape="pill" />
            ))}
          </div>
        )}
        {subtitle && <p className="lyra-body-sm text-lyra-fg-secondary">{subtitle}</p>}
        <div className="flex flex-col gap-3">
          {(summary && summary.length > 0
            ? summary
            : ["No AI-generated summary is available for this customer yet."]
          ).map((paragraph, i) => (
            <p key={i} className="lyra-body-sm text-lyra-fg-default">
              {paragraph}
            </p>
          ))}
        </div>
        {nextBestAction && (
          <div className="rounded-lyra-md border border-[color-mix(in_srgb,var(--lyra-color-status-info-strong)_25%,transparent)] bg-lyra-status-info-subtle p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-lyra-fg-secondary">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              <span className="lyra-body-sm-emphasis">Suggested Next Best Action</span>
            </div>
            <p className="lyra-body-sm text-lyra-fg-default">{nextBestAction}</p>
          </div>
        )}
      </div>
    ),
  };
}
