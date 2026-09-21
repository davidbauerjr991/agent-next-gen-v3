import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronRight, CornerDownLeft, MessageSquareText, XCircle } from "lucide-react";
import {
  Accordion,
  AIInput,
  AIProcess,
  type AIProcessStep,
  AttachmentThumbnail,
  Button,
  Container,
  Label,
  RadioGroup,
  RadioGroupItem,
  Spinner,
  Textarea,
  cn,
} from "@nicecxone/lyra-ui";
import { formatElapsedTime } from "@/components/agent-next-gen-shared-utils";
import damagedHeadphonesImg from "@/assets/headphones.jpg";
import {
  KnowledgeArticleSummaryRow,
  type KnowledgeArticleCardData,
} from "@/components/agent-next-gen-knowledge-article-card";
import { MarcusWebbTransactionsTable } from "@/components/agent-next-gen-marcus-webb-transactions-panel";

// Placeholder content for the "Do Something" scaffold — per explicit
// request, verbatim from the reference screenshot, so this actually
// looks like the intended reference rather than generic lorem ipsum.
// Every submission currently shows this SAME card (see `suggestedArticles`
// below) — real, per-command content is a separate, later, saved-for-now
// piece of work (the local-LLM plan).
const PLACEHOLDER_KNOWLEDGE_ARTICLE: KnowledgeArticleCardData = {
  id: "tablet-warranty-coverage",
  title: "Tablet Warranty Coverage",
  body:
    "Tablet units on the OneTread x1000 carry a 24-month parts warranty. A blinking red light with a frozen " +
    "display is a documented board fault and qualifies for replacement, not repair.",
  internalNote: "If the unit is outside 24 months, quote the paid replacement price before opening a claim.",
  webLinks: [
    { title: "Warranty policy — tablets", copyValue: "https://example.com/kb/warranty-policy-tablets" },
    { title: "Board fault diagnostic guide", copyValue: "https://example.com/kb/board-fault-diagnostic-guide" },
  ],
  processSteps: ["Verify serial number", "Confirm fault matches diagnostic guide", "Submit replacement claim"],
};

/* ── MarcusWebbNextBestActionCard ──
   Per explicit request ("i want the next best action content ... to
   populate like the way claude asks questions ... with a way to add
   something else"): replaces the plain one-sentence "Next Best Action"
   text (`ContactOverview`'s own `nextBestAction` string prop,
   lyra-ui/contact-overview.tsx) for Marcus Webb's refund-escalation
   interaction specifically, via that component's new `nextBestActionContent`
   prop — see that prop's own doc comment for why a rich-content override was
   added there rather than widening `nextBestAction` itself.

   Scoped to Marcus Webb only (per explicit decision) — every other
   interaction keeps the original plain-sentence Next Best Action untouched;
   this component is never rendered for them. The three context bullets
   below are a more detailed expansion of the two already shown in Marcus's
   "Contact Snapshot" accordion just above this one (same call,
   AgentWorkspaceAdvancedPage.tsx `MARCUS_WEBB_ID` branch) — grounded in the
   same scripted facts as `MARCUS_WEBB_CALL_TRANSCRIPT` (order #48213,
   noise-cancelling headphones, cracked ear cup, $200 refund, $100
   auto-approval limit, placed last Tuesday), not invented ones.

   Built from lyra-ui's `RadioGroup`/`RadioGroupItem` (radio.tsx) for real
   radio semantics/keyboard nav — its `label` prop was widened from `string`
   to `React.ReactNode` to allow the stacked title+description block used
   here, rather than hand-rolling a fresh Radix radio group locally (no
   existing lyra-ui component already has this "option card with a
   description" shape to reuse as-is). Each option's own bordered wrapper
   (not part of `RadioGroupItem` itself) reuses the same selected-state
   token pair (`bg-lyra-bg-active-subtle`/`border-lyra-border-active`)
   `ToggleGroup` and the (currently disabled) Marcus decision card in
   `AgentWorkspace2WithDeskPage.tsx` already use for "this option is
   picked," for visual consistency with those existing patterns.

   Per a later explicit follow-up ("we need a button to do the command when
   it's selected kind of like the enter button... in screenshot 2"),
   selecting an option alone is no longer the end of the interaction — an
   inline confirm button (Rule Zero: never a hand-rolled `<button>` —
   `InlineSubmitButton` below, `CornerDownLeft` echoing Claude Code's own
   `AskUserQuestion` "Enter to submit" affordance; originally a ghost
   `ActionIconButton`, later made solid-filled per explicit request — see
   `InlineSubmitButton`'s own doc comment) appears on the currently
   selected row. Confirming locks that choice in (`confirmed`) and
   replaces the option list with a
   static summary of the command that was "issued," plus a `Spinner` +
   elapsed-timer status line simulating the AI agent acting on it — per
   explicit clarification, still no real backend wiring, just a convincing
   completed/in-progress look (same "simulate, don't actually call
   anything" convention this app already uses elsewhere, e.g. the customer
   auto-reply timer). There's no way to reopen/change the answer once
   confirmed — "lock in" was explicit, and this stays intentionally simple.

   Per a later explicit bug report ("it's still hung up" — the performing/
   spinner row never resolved), the simulated action now actually finishes:
   4 real seconds after confirming, `completed` flips true, the elapsed
   timer freezes (its own interval simply stops being recreated — see that
   effect's own guard), and the spinner/status text swap to a finished
   look. Still no real backend call — just a bounded simulated duration
   instead of an indefinite one, same "simulate, don't actually call
   anything" convention as the rest of this card.

   Per a later explicit bug report ("the transcript doesn't appear to have
   updated") — completing the action now DOES have one real, visible
   effect outside this card: `onComplete` (new prop, called once, the same
   moment `completed` flips true) hands the caller a follow-up line for the
   AI agent to "say" back on the call, reflecting whatever was decided.
   This is the one deliberate exception to this card's earlier "no
   callback prop, nothing wired to real interaction state" design — the
   caller (`AgentWorkspaceAdvancedPage.tsx`) appends it to Marcus's own
   scripted `MARCUS_WEBB_CALL_TRANSCRIPT`-seeded `liveMessages`, the same
   mechanism `handleSendMessage` already uses for the composer, so the
   transcript actually shows the call being wrapped up instead of staying
   frozen on "please hold." The message text itself is still just static,
   hand-written copy per option (or the agent's own typed note for
   "something else") — no real generation involved.

   Per a later explicit request, "Approve" specifically (not Reject/
   Something else — scoped to just this one option) drops the generic
   `Spinner`+elapsed-timer row for lyra-ui's own `AIProcess` step list
   (ai-process.tsx — already a generic, caller-driven component with no
   timers of its own; this file supplies the `steps`/statuses and drives
   them forward itself, same pattern `App.tsx` already uses it with). Each
   of the three steps completing fires its own named callback
   (`onAgentContactedCustomer`/`onCustomerApprovedResolution`/
   `onDispositionUpdated`) — a second, larger exception to the original
   "no callback prop" design, since these are real effects the caller
   applies to actual interaction state (a transcript message, a status
   change), not just narration. Per a later explicit follow-up, this list
   no longer ends on its own "close/dismiss" step — that's no longer
   simulated as part of Approve at all (`onAssignmentClosed` stays a real
   prop on this card, just for the separate "flag for review" flow's own
   step list instead; see `FLAG_STEP_LABELS`). `confirmed === "approve"`'s own
   render branch and `approveStepIndex`/its effect are entirely separate
   from the `completed`/`elapsedSeconds` machinery above, which now only
   drives Something else.

   Per a later explicit request, Reject grew its own multi-stage flow,
   parallel to (but distinct from) Approve's — it no longer shares the
   generic `completed`/`elapsedSeconds` spinner at all:
   1. The instant Reject is confirmed, a follow-up question appears asking
      the agent WHY — a `Textarea` + the same inline "Enter" confirm
      affordance used for option selection above (`rejectReason`/
      `rejectReasonSubmitted`).
   2. Only once THAT'S submitted does `onComplete` fire, with the same
      `AGENT_REPLY.reject` text as before, posting the rejection note to
      the transcript. Per an explicit correction, this used to fire the
      instant Reject was confirmed — driven off real state instead of a
      blind timer, "do the same thing as Approve," but still notifying
      Marcus before the agent had even said why; now it waits for the
      reason (`rejectionNoteFiredRef` guards it firing more than once).
   3. Submitting the reason also starts a second `AIProcess` step list
      (`REJECT_STEP_LABELS`/`rejectStepIndex`, same shape as Approve's own
      step machinery): the AI agent asks the customer for a photo of the
      damaged item (`onPhotoRequested` — a real transcript line, the AI
      agent actually said this), then waits for their response.

   Per explicit correction, the customer's photo itself never touches the
   transcript at all — it's rendered right here in this card, directly
   below the step list, once both reject steps finish (a small note plus
   lyra-ui's `AttachmentThumbnail`). Clicking it fires `onPhotoExpand`; this
   card doesn't own the expanded/full-screen state itself — the caller
   (`AgentWorkspaceAdvancedPage.tsx`) takes over the MAIN interaction
   column with it, the same "takes over" mechanic the video call window
   already uses, NOT the transcript column (an earlier pass got this
   backwards — the photo briefly lived as a transcript message with an
   image attachment, expanding inside the transcript itself). Per a later
   explicit request, this is now a real photo (`src/assets/headphones.jpg`,
   `AttachmentThumbnail`'s own `src` prop) rather than the generic photo-
   icon-plus-filename placeholder every other mocked attachment in this app
   still uses.

   Per explicit decision, nothing here auto-opens the Outcome popover or
   auto-selects a disposition — "Flagged for Review" was simply added to
   `OUTCOME_DISPOSITION_OPTIONS` (agent-next-gen-transcript.tsx) for the
   human agent to pick themselves once they've seen the photo.

   Per a later explicit request, the photo isn't the end of the Reject
   flow — a SECOND "How would you like to proceed?" question appears right
   below it (`NextBestActionOptionPicker`, extracted once this and the
   top-level question needed the exact same radio+inline-confirm markup),
   with its own three options answered by `handlePhotoDecisionConfirm`:
   - **Approve** appends the approve summary/`AIProcess` (`approveBlock`)
     below everything already on screen, via `approvedAfterReject` — NOT
     `confirmed`, which stays `"reject"` (see the next paragraph for why).
   - **Reject and provide another reason** appends a fresh round
     (`rejectRounds`) rather than resetting the current one.
   - **Something else** locks in its own "flag for review" `AIProcess`
     (`FLAG_STEP_LABELS`/`flagStepIndex`/`flagConfirmed`): flagging the
     account, updating the session status to "Escalated" (a real status
     change, `onStatusEscalated` — same `handleInteractionStatusChange`
     mechanism `onDispositionUpdated` already uses for Approve), then
     dismissing the assignment (reuses `onAssignmentClosed` — dismissing is
     dismissing, regardless of which path got here).

   Per an explicit bug report ("the conversation should continue in line -
   not reset... treat this like an actual claude session"), Approve/Reject
   at this second question used to ERASE the photo and reason history:
   Approve called `setConfirmed("approve")`, which switched the ENTIRE
   render branch away from `"reject"`; Reject reset `rejectReason`/
   `rejectStepIndex` back to their starting values, hiding the very photo
   the agent had just been asking about. Fixed by making Reject's own state
   an append-only LIST of rounds (`rejectRounds`, each `{ reason,
   reasonSubmitted, stepIndex }`) instead of a few flat fields that get
   overwritten — every earlier round renders exactly as it finished
   (frozen), and only the LAST round is ever "live" (still asking for a
   reason, or still advancing its own `AIProcess`/photo reveal). Approve no
   longer touches `confirmed` at all — `approvedAfterReject` just appends
   `approveBlock` after the rounds, so the original "Refund rejected"
   summary and every round's own history stay exactly as they were,
   consistent with a real conversation where nothing already said gets
   retroactively erased.

   Per a later explicit request, clicking "Takeover" (`marcusWebbReviewing`
   flipping to `false`, `AgentWorkspaceAdvancedPage.tsx`) replaces
   EVERYTHING above with a hand-off moment (`takenOver` prop) — the
   original question(s) no longer make sense once a human is personally
   handling the call instead of directing the AI. A note ("Agent Smith has
   taken over the conversation.") plus a third option list
   (`REMEDY_OPTIONS`: Store Credit / Discount Code / Something else)
   replace them; picking one locks it in (`remedyConfirmed`) and fires
   `onRemedyIssued`. This is the third real use of
   `NextBestActionOptionPicker`'s radio+inline-confirm markup — it's
   generic over the option-value type now (`<T extends string>`) with an
   optional `noteFor` prop (`OPTIONS`/`PHOTO_DECISION_OPTIONS`/
   `REMEDY_OPTIONS` all set it, to `"something-else"`) rather than
   hardcoding that one value in. A separate, short-delay pair of
   transcript lines (the human agent's own
   greeting, then the customer's reply — `onTakeoverGreeting`/
   `onCustomerRespondedToTakeover`) plays out independently of when the
   agent actually picks a remedy, same "narration is real transcript
   effects the caller applies" pattern as everywhere else on this card. Per
   explicit answer, issuing a remedy does NOT change the session status or
   dismiss the assignment — unlike Approve/the flag flow, this one's
   completion is left for the reviewing agent to wrap up manually.

   Per a later explicit request ("the action should be recorded inline with
   the contact"), every real action above now also appends to a growing,
   append-only `actionLog` (`MarcusWebbActionLogEntry[]`), rendered right
   below the context bullets — visible no matter which state the rest of
   the card is currently in, same "nothing already recorded gets erased"
   principle as `rejectRounds`. Two kinds:
   - **`"simple"`** — a bare timestamp + bold title, no icon/border/click
     target. For plain milestones only (per explicit decision, not every
     timer-driven `AIProcess` sub-step, which is already visible live in
     those step lists): the photo arriving, the disposition/status
     changes, and Takeover starting.
   - **`"note"`** — a bordered card (icon + title + timestamp + actor +
     trailing chevron, a description line below); clicking one fires
     `onActionLogEntryOpen` so the caller can show its `detail` (the
     question that was asked, every option that was available, which one
     was picked) in a side panel. For the three genuine DECISIONS on this
     card (the top-level question, the post-photo question, the remedy
     question) — each already `RadioGroup`+confirm-backed. Every note's
     `actorName` is hardcoded `"John Smith"` (per explicit decision) — this
     card still has no concept of the page's own current-agent name beyond
     that one hardcoded string, matching the "Agent Smith"/"John Smith"
     split already established for Takeover's own narration.
   Reject's own top-level decision is a special case: unlike Approve/
   Something-else (whose descriptive text exists the instant they're
   confirmed), Reject's "why" isn't known until the reason `Textarea` is
   submitted a step later — so its note logs then instead (same moment as
   `rejectionNoteFiredRef`'s transcript note), not at the moment of
   confirming. Every later round's own reason submission gets its own
   follow-up note the same way. */

type MarcusWebbNextBestActionSelection = "approve" | "reject" | "something-else";

/** Shared shape for every option list this card renders through
 *  `NextBestActionOptionPicker` below — generic over the option-value type
 *  since there are now three distinct vocabularies (the top-level
 *  approve/reject/something-else, the same again for the post-photo
 *  question, and the post-takeover remedy list, which has no
 *  "something-else" at all). */
interface NextBestActionOption<T extends string> {
  value: T;
  title: string;
  description?: string;
}

type MarcusWebbNextBestActionOption = NextBestActionOption<MarcusWebbNextBestActionSelection>;

const OPTIONS: MarcusWebbNextBestActionOption[] = [
  {
    value: "approve",
    title: "Approve the refund",
    description:
      "The AI agent immediately processes the full $200 refund to Marcus's original payment method, confirms it with him, and resumes the call to close out the request. Once approved there's no further review — reserve this for claims where the damage report and order details already check out.",
  },
  {
    value: "reject",
    title: "Reject the refund",
    description:
      "The AI agent tells Marcus the refund wasn't approved as requested and offers next steps — a replacement, store credit, or escalation to a supervisor. No money moves until a different resolution is reached — use this if the claim needs more verification (e.g. photos of the damage) or doesn't fit policy.",
  },
  {
    value: "something-else",
    title: "Something else",
  },
];

// What actually shows once an option is confirmed — icon/label for the
// locked summary block, and an optional "command" sentence underneath it.
// `something-else`'s command is the agent's own typed note instead (see
// its render site below), so it has no entry here. Reject has no `command`
// — per explicit correction, the box appears the instant Reject is
// confirmed, before any reason has been typed and before Marcus has
// actually been told anything (see this file's own top doc comment for
// when the real transcript note fires), so a "Notifying Marcus..." line
// here would be inaccurate at that moment.
const CONFIRMED_META: Record<
  Exclude<MarcusWebbNextBestActionSelection, "something-else">,
  { icon: React.ReactNode; label: string; command?: string }
> = {
  approve: {
    icon: <CheckCircle2 className="h-4 w-4 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />,
    label: "Refund approved",
    command: "Processing the $200 refund to Marcus's original payment method.",
  },
  reject: {
    icon: <XCircle className="h-4 w-4 text-lyra-status-critical-strong" strokeWidth={1.5} aria-hidden="true" />,
    label: "Refund rejected",
  },
};

// What the AI agent "says" back on the call once the action completes —
// appended to Marcus's transcript via `onComplete` (see this file's own
// top doc comment). `something-else` has no fixed line here since it
// depends on the agent's own typed note (see its call site below).
const AGENT_REPLY: Record<Exclude<MarcusWebbNextBestActionSelection, "something-else">, string> = {
  approve:
    "Great news — I've received approval from a supervisor. I'm processing your $200 refund now; you should see it back on your original payment method within 3-5 business days. Is there anything else I can help with?",
  reject:
    "Thanks for holding — I heard back from a supervisor, and unfortunately this refund wasn't approved as submitted. I'd like to offer you a replacement or store credit instead — which would you prefer?",
};

// Restored per explicit follow-up request ("add back in the steps after
// the refund is approved/rejected") — was briefly hidden for demo/testing
// pace ("it is taking time"), same "hide, don't destroy" flag still in
// place if it needs to come back off again; see `approveBlock`'s own doc
// comment, below, for exactly what this gates.
const SHOW_APPROVE_PROCESSING_STEPS = true;

// Per explicit request, hides the "Do something" `AIInput` for now ("I may
// bring it back so don't delete it") — "hide, don't destroy," same pattern
// as `SHOW_APPROVE_PROCESSING_STEPS` just above. `commandSlotContent`'s own
// render (below) is gated on this flag; the rest of that section (state,
// the `onSubmit` handler, the suggested-article cards it appends) stays
// fully wired, so flipping this back to `true` restores the input with no
// other changes needed.
const SHOW_DO_SOMETHING_INPUT = false;

// "Approve"-only step list — see this file's own top doc comment for why
// this is separate from `completed`/`AGENT_REPLY` above (Reject/Something
// else keep the plain spinner treatment; only Approve gets this).
const APPROVE_STEP_LABELS = [
  "AI Agent contacting customer",
  "Waiting for customer response",
  'Disposition updated to "Exception Approved"',
];

// Reject-only step list, run AFTER the agent submits a reason (see this
// file's own top doc comment). Only step 1 fires a real callback
// (`onPhotoRequested`) — step 2 completing just reveals the photo+note
// block rendered locally below (see `rejectStepIndex`'s own render site).
const REJECT_STEP_LABELS = ["AI Agent requesting photo of damaged item", "Waiting for customer response"];

// Second "how would you like to proceed?" question, asked once the
// customer's photo comes back (see this file's own top doc comment) —
// same option shape as `OPTIONS` above, reusing the exact same
// approve/reject/something-else semantics: Approve here locks `confirmed`
// over to `"approve"` (re-using that entire flow verbatim, as if it had
// been picked from the very start); Reject loops back to a fresh reason
// question (`handlePhotoDecisionConfirm` below); Something else is its own
// "flag for review" process (`FLAG_STEP_LABELS`).
const PHOTO_DECISION_OPTIONS: MarcusWebbNextBestActionOption[] = [
  {
    value: "approve",
    title: "Approve the refund",
    description: "The photo adequately displays replaceable damage — proceed with the $200 refund as originally requested.",
  },
  {
    value: "reject",
    title: "Reject and provide another reason",
    description: "The photo doesn't resolve the concern — ask Marcus for more information before deciding.",
  },
  {
    value: "something-else",
    title: "Something else",
  },
];

// "Something else"-at-the-photo-decision-only step list — see this file's
// own top doc comment. Step 3 reuses the same `onAssignmentClosed` prop
// Approve's own step 4 already uses (dismissing is dismissing, regardless
// of which path got here).
const FLAG_STEP_LABELS = [
  "Flagging account for review",
  'Updating status to "Escalated"',
  "Unassigning and dismissing assignment",
];

// Post-takeover remedy options — see this file's own top doc comment.
type RemedySelection = "store-credit" | "discount-code" | "something-else";
const REMEDY_OPTIONS: NextBestActionOption<RemedySelection>[] = [
  {
    value: "store-credit",
    title: "Store Credit",
    description:
      "Issue the full $200 as store credit Marcus can use toward a future purchase — no cash refund, but the fastest way to make this right.",
  },
  {
    value: "discount-code",
    title: "Discount Code",
    description:
      "Send Marcus a discount code for a future order instead of a refund — keeps the current order as-is while still offering him something for the trouble.",
  },
  {
    value: "something-else",
    title: "Something else",
  },
];

/** One entry in the growing, append-only action log rendered below the
 *  context bullets — see this file's own top doc comment for the full
 *  "simple" vs. "note" distinction. `"transactions"` is a third kind, per
 *  explicit follow-up request: same header row shape as `"note"` (icon +
 *  title + timestamp + actor), but rendered as a real expandable
 *  `Accordion` (`MarcusWebbInstructionTransactionsEntry`, below) opening
 *  straight to the customer's last-10-transactions table instead of
 *  opening a side panel — logged once per "Something else" submission
 *  (`handleTopLevelConfirm`). */
export interface MarcusWebbActionLogEntry {
  id: string;
  kind: "simple" | "note" | "transactions";
  title: string;
  timestamp: string;
  /** `"note"`/`"transactions"` only. */
  icon?: React.ReactNode;
  /** `"note"`/`"transactions"` only — always `"John Smith"` today (see
   *  this file's own top doc comment for why). */
  actorName?: string;
  /** `"note"` — the quoted line below the header row, shown in its own
   *  side panel. `"transactions"` — the agent's typed instruction, shown
   *  as the first line inside the expanded accordion. */
  description?: string;
  /** `"note"` only — powers the side panel `onActionLogEntryOpen` opens:
   *  the question that was asked, and every option that was available. */
  detail?: {
    context: string;
    options: { title: string; description?: string; selected: boolean }[];
  };
}

/** The side-panel body for one `"note"` entry — the caller (`AgentWorkspace
 *  AdvancedPage.tsx`) renders this inside its own floating overlay (the
 *  same "View customer info" `InteriorPanel` mechanic, per explicit
 *  request), passing in whichever entry was clicked. */
export function MarcusWebbActionDetailPanelBody({ entry }: { entry: MarcusWebbActionLogEntry }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {entry.detail && (
        <>
          <p className="lyra-body-md-emphasis text-lyra-fg-default">{entry.detail.context}</p>
          <div className="flex flex-col gap-2">
            {entry.detail.options.map((option) => (
              <div
                key={option.title}
                className={cn(
                  "flex items-start gap-2 rounded-lyra-md border p-3",
                  option.selected
                    ? "border-lyra-border-active bg-lyra-bg-active-subtle"
                    : "border-lyra-border-subtle bg-lyra-bg-surface-base"
                )}
              >
                {option.selected && (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 mt-0.5 text-lyra-status-success-strong"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="lyra-body-md-emphasis text-lyra-fg-default">{option.title}</span>
                  {option.description && (
                    <span className="lyra-body-sm text-lyra-fg-secondary">{option.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {entry.description && (
        <div className="flex flex-col gap-1">
          <p className="lyra-body-sm-emphasis text-lyra-fg-default">Details</p>
          <p className="lyra-body-md text-lyra-fg-default">"{entry.description}"</p>
        </div>
      )}
    </div>
  );
}

/** A plain milestone/state-change row — timestamp above bold title, no
 *  icon/border/click target. See this file's own top doc comment. */
function ActionLogSimpleEntry({ timestamp, title }: { timestamp: string; title: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="lyra-body-sm text-lyra-fg-secondary">{timestamp}</span>
      <span className="lyra-body-md-emphasis text-lyra-fg-default">{title}</span>
    </div>
  );
}

/** A clickable, bordered decision row — icon + title + timestamp + actor,
 *  trailing chevron, description below. See this file's own top doc
 *  comment. `selected` (this entry's own side panel is the one currently
 *  open) swaps in the same `bg-lyra-status-info-subtle` tint the Home
 *  page's Contact History rows use for their own "this row's summary is
 *  open" state (agent-next-gen-contact-history.tsx) — per explicit
 *  request, for visual consistency with that established pattern. */
function ActionLogNoteEntry({
  entry,
  selected,
  onClick,
}: {
  entry: MarcusWebbActionLogEntry;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-lyra-md border p-3 text-left transition-colors",
        selected
          ? "border-lyra-border-active bg-lyra-status-info-subtle"
          : "border-lyra-border-subtle bg-lyra-bg-surface-base hover:border-lyra-state-border-hover-neutral"
      )}
    >
      <div className="flex items-center gap-2">
        {entry.icon}
        <span className="lyra-body-md-emphasis text-lyra-fg-default">{entry.title}</span>
        <span className="lyra-body-sm text-lyra-fg-secondary">{entry.timestamp}</span>
        {entry.actorName && <span className="lyra-body-sm text-lyra-fg-secondary">{entry.actorName}</span>}
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
      </div>
      {entry.description && (
        <p className="lyra-body-sm text-lyra-fg-secondary">"{entry.description}"</p>
      )}
    </button>
  );
}

/** Per explicit follow-up request ("have the instruction container be an
 *  accordion open to the list of transactions") — the `"transactions"`
 *  kind's own render, in place of `ActionLogNoteEntry`'s side-panel-
 *  opening button. Styled as a bordered card the same way
 *  `CUSTOMER_INFO_ACCORDION_CLASSNAME` (agent-next-gen-customer-info-
 *  panel.tsx) styles every other single-item accordion in this app, just
 *  with a plain surface background to match `ActionLogNoteEntry`'s own
 *  sibling rows instead of that constant's own tinted one.
 *
 *  Mounts CLOSED and flips itself open on a `setTimeout(0)` right after,
 *  rather than starting pre-opened via `defaultValue` — confirmed via a
 *  screenshot bug (a SECOND entry, added right after a first one that
 *  worked fine, rendered with its content collapsed to zero height
 *  despite Radix reporting `data-state="open"` on inspection) that
 *  mounting a Radix `Accordion` already-open races its own height
 *  animation: the `animate-accordion-down` keyframe reads
 *  `--radix-accordion-content-height` before the `ResizeObserver` that
 *  sets it has necessarily measured anything yet, so it can animate from
 *  (and land on) zero. Deferring the open by one tick makes this a real
 *  closed→open transition instead — the exact same, well-exercised path
 *  every other accordion in this app already uses when a real click
 *  opens it (never "starts pre-opened"), which is why only THIS
 *  "immediately expanded" pattern hit the race. */
function MarcusWebbInstructionTransactionsEntry({ entry }: { entry: MarcusWebbActionLogEntry }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  return (
    <Accordion
      value={open ? entry.id : ""}
      onValueChange={() => setOpen((v) => !v)}
      items={[
        {
          id: entry.id,
          icon: entry.icon,
          title: entry.title,
          endSlot: (
            <span className="flex items-center gap-2 lyra-body-sm text-lyra-fg-secondary">
              <span>{entry.timestamp}</span>
              {entry.actorName && <span>{entry.actorName}</span>}
            </span>
          ),
          content: (
            <div className="flex flex-col gap-3">
              {entry.description && (
                <p className="lyra-body-md text-lyra-fg-default">"{entry.description}"</p>
              )}
              <MarcusWebbTransactionsTable />
            </div>
          ),
        },
      ]}
      className="rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-surface-base overflow-hidden"
    />
  );
}

/** Every `activeQuestionItem` — the top-level "How would you like to
 *  proceed?", the post-takeover "Suggested remedies," and the post-photo
 *  "How would you like to proceed?" decision — renders inline in the
 *  card's own scrolling content now, never portaled into the page's fixed
 *  bottom slot (`questionSlotElement`). Per explicit request, in three
 *  steps: first remedies alone, then the top-level question too, then
 *  finally the post-photo decision ("none of these should be fixed").
 *  The fixed slot itself still exists for the (currently hidden) "Do
 *  something" `AIInput` (`commandSlotContent`) — see `portalToQuestionSlot`
 *  below — just nothing question-shaped uses it anymore. Takes the same
 *  `{ id, title, content }` shape `activeQuestionItem` always builds (not
 *  a `MarcusWebbActionLogEntry` — this is a live pending question, not a
 *  logged event, so it has no icon/timestamp/actor).
 *
 *  Mounts CLOSED and flips itself open on a `setTimeout(0)`, exactly like
 *  `MarcusWebbInstructionTransactionsEntry` above — this card appears as a
 *  new sibling below content that's already rendered (Contact Overview,
 *  any existing action-log entries), the same situation that already
 *  confirmed a Radix `Accordion` mounted pre-opened via `defaultValue` can
 *  race its own `ResizeObserver`-driven height measurement and land at
 *  zero height. `bg-lyra-bg-active-subtle` (rather than the plain surface
 *  `ActionLogNoteEntry`'s sibling rows use) keeps it visually distinct as
 *  "awaiting your input," now that it's lost the fixed slot's own floating
 *  `Container variant="neutral-subtle" shadow-lg` treatment.
 *
 *  No `key` needed: this component uses a CONTROLLED `value` (not
 *  `defaultValue`), so when `item` swaps in place while it stays mounted
 *  (e.g. the top-level question going from "next-best-action" straight
 *  back to itself after a "something else" round, or one question type
 *  swapping to another without `activeQuestionItem` ever going `null` in
 *  between), the `Accordion`'s `value` just re-syncs to the new `item.id`
 *  — no remount, no re-trigger of the closed→open effect, so an
 *  already-open card just swaps its content in place. */
function MarcusWebbInlineQuestionCard({ item }: { item: { id: string; title: string; content: React.ReactNode } }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  return (
    <Accordion
      value={open ? item.id : ""}
      onValueChange={() => setOpen((v) => !v)}
      items={[item]}
      className="rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-active-subtle overflow-hidden"
    />
  );
}

/** The inline "Enter"-style confirm trigger used everywhere on this card
 *  (per-option-row, and every option's own inline note row — "something
 *  else", "reject") — per explicit request, a solid-filled `Button`
 *  (`variant="default"`, lyra-ui's only true filled/primary style) instead
 *  of the original ghost `ActionIconButton`, for more visible "this is the
 *  action to take" affordance. Same `CornerDownLeft` glyph throughout —
 *  only the fill changed, not the icon (see this file's own top doc
 *  comment for why that icon was chosen in the first place). */
function InlineSubmitButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="default" size="icon-sm" title="Confirm" aria-label="Confirm" disabled={disabled} onClick={onClick}>
      <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
    </Button>
  );
}

/** The radio-options-with-an-inline-"Enter"-confirm-button block, shared by
 *  every option list on this card — extracted once the top-level and
 *  post-photo questions needed the exact same markup/behavior, and made
 *  generic over the option-value type once a third list (the post-takeover
 *  remedies) needed it too but has no free-text option at all. `notes` is
 *  a per-option-value map of which option(s) show a `Textarea` beside
 *  their own inline confirm instead of a confirm button on their own row
 *  — a map rather than a single scalar since, per explicit request, the
 *  top-level list needs TWO independent notes at once (`reject`'s reason
 *  and `something-else`'s free text), each with its own bound state.
 *  Omit `notes` entirely for a list where every option confirms directly,
 *  like the remedies. While a given option's own note is showing, that
 *  option's `description` is hidden in favor of the note `Textarea` —
 *  per explicit request, for "Reject the refund" specifically, so its
 *  long descriptive subhead doesn't sit above the reason input it no
 *  longer needs to explain once the agent's already picked it. */
function NextBestActionOptionPicker<T extends string>({
  options,
  selected,
  onSelectedChange,
  onConfirm,
  confirmDisabled,
  notes,
}: {
  options: NextBestActionOption<T>[];
  selected: T | undefined;
  onSelectedChange: (value: T) => void;
  onConfirm: (value: T) => void;
  confirmDisabled: boolean;
  notes?: Partial<
    Record<T, { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }>
  >;
}) {
  return (
    // `selected ?? ""`, not bare `selected` — Radix's `RadioGroup.Root`
    // treats a `value` of `undefined` as "uncontrolled" (its own
    // `useControllableState` falls back to internal state whenever the
    // prop is `undefined`), so resetting `selected` back to `undefined`
    // after a confirm (see `handleTopLevelConfirm`'s "something-else"
    // branch, which needs the picker to visually clear for the next
    // round) silently failed to un-check the previously-picked radio —
    // confirmed via screenshot: "Something else" stayed shown as selected
    // after confirming and having its own `selected` state reset. `""` is
    // never a real option `value` here, so it reads as "nothing selected"
    // while staying genuinely controlled.
    <RadioGroup value={selected ?? ""} onValueChange={(value) => onSelectedChange(value as T)}>
      {options.map((option) => {
        const note = notes?.[option.value];
        const isSelected = selected === option.value;
        const showNote = isSelected && !!note;
        return (
          <div
            key={option.value}
            className={cn(
              "flex flex-col gap-2 rounded-lyra-md border p-3 transition-colors",
              isSelected
                ? "border-lyra-border-active bg-lyra-bg-active-subtle"
                : "border-lyra-border-subtle bg-lyra-bg-surface-base hover:border-lyra-state-border-hover-neutral"
            )}
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem
                value={option.value}
                className="flex-1 items-start"
                label={
                  <span className="flex flex-col gap-0.5">
                    <span className="lyra-body-md-emphasis text-lyra-fg-default">{option.title}</span>
                    {option.description && !showNote && (
                      <span className="lyra-body-sm text-lyra-fg-secondary">{option.description}</span>
                    )}
                  </span>
                }
              />
              {/* Inline "confirm" trigger — only on the currently selected
                  row, per explicit request ("like the enter button ...
                  in screenshot 2"). Not for an option with its own
                  `note` — per explicit follow-up, that one's confirm
                  button moves down beside its own `Textarea` instead
                  (see below), since confirming there needs the typed
                  note, not just the row selection. */}
              {isSelected && !note && (
                <InlineSubmitButton disabled={confirmDisabled} onClick={() => onConfirm(option.value)} />
              )}
            </div>
            {/* The note — per explicit follow-up, nested INSIDE this same
                bordered option row (rather than a separate block below
                the whole `RadioGroup`, as it briefly was), with its own
                `Label` (lyra-ui's real `Label` atom, not a hand-rolled
                span — rule zero) above the `Textarea` rather than folded
                into `Textarea`'s own built-in `label` prop, so the
                `InlineSubmitButton` beside it can stay aligned with the
                textarea's own top edge instead of the label row above it. */}
            {showNote && (
              <div className="flex flex-col gap-1.5">
                {note.label && <Label label={note.label} labelFor={`${option.value}-note`} />}
                <div className="flex items-start gap-2">
                  <Textarea
                    id={`${option.value}-note`}
                    className="flex-1"
                    placeholder={note.placeholder}
                    rows={3}
                    value={note.value}
                    onChange={(e) => note.onChange(e.target.value)}
                  />
                  <InlineSubmitButton disabled={confirmDisabled} onClick={() => onConfirm(option.value)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}


export function MarcusWebbNextBestActionCard({
  onComplete,
  onAgentContactedCustomer,
  onCustomerApprovedResolution,
  onDispositionUpdated,
  onAssignmentClosed,
  onPhotoRequested,
  onPhotoExpand,
  onAccountFlagged,
  onStatusEscalated,
  takenOver,
  onTakeoverGreeting,
  onCustomerRespondedToTakeover,
  onRemedyIssued,
  onActionLogEntryOpen,
  onViewArticle,
  selectedActionLogEntryId,
  selectedArticleId,
  questionSlotElement,
}: {
  /** For Something else, fired once (after its 4s spinner) with the
   *  agent's typed note. For Reject, fired immediately (no delay) the
   *  moment it's confirmed, with the fixed `AGENT_REPLY.reject` text — see
   *  this file's own top doc comment. Not used by Approve, which instead
   *  fires the four step callbacks below. */
  onComplete?: (message: string) => void;
  /** Fired when the Approve flow's step 1 ("AI Agent contacting customer")
   *  completes. */
  onAgentContactedCustomer?: () => void;
  /** Fired when step 2 ("Waiting for customer response") completes. */
  onCustomerApprovedResolution?: () => void;
  /** Fired when step 3 ("Disposition updated...") completes. */
  onDispositionUpdated?: () => void;
  /** Fired when step 4 ("Closing and dismissing assignment") completes —
   *  the caller is expected to actually dismiss the assignment here, at
   *  which point this whole component is unmounted. */
  onAssignmentClosed?: () => void;
  /** Fired when the Reject flow's own step 1 ("AI Agent requesting photo of
   *  damaged item") completes, once a reason has been submitted. */
  onPhotoRequested?: () => void;
  /** Fired when the Reject flow's photo (rendered locally once both reject
   *  steps finish) is clicked — the caller is expected to take over the
   *  MAIN interaction column with it, not the transcript. */
  onPhotoExpand?: () => void;
  /** Fired when the post-photo "flag for review" step 1 completes. */
  onAccountFlagged?: () => void;
  /** Fired when the post-photo "flag for review" step 2 completes — the
   *  caller is expected to make a real status change (to "Escalated"). */
  onStatusEscalated?: () => void;
  /** True once the reviewing agent has clicked "Takeover" — replaces
   *  everything above (whichever question/flow was showing) with the
   *  hand-off note + remedy question. See this file's own top doc
   *  comment. */
  takenOver?: boolean;
  /** Fired once, ~1s after `takenOver` becomes true — the caller is
   *  expected to append the human agent's own greeting to the transcript. */
  onTakeoverGreeting?: () => void;
  /** Fired once, a couple seconds after `onTakeoverGreeting` — the caller
   *  is expected to append the customer's reply. */
  onCustomerRespondedToTakeover?: () => void;
  /** Fired when the reviewing agent confirms a remedy — the caller is
   *  expected to append the human agent's own confirmation line. `note` is
   *  only ever set for `"something-else"`, the agent's own typed
   *  instruction. Does NOT change status or dismiss the assignment (per
   *  explicit decision). */
  onRemedyIssued?: (remedy: RemedySelection, note?: string) => void;
  /** Fired when a `"note"` action-log entry is clicked — the caller is
   *  expected to show `entry.detail` in a side panel (via
   *  `MarcusWebbActionDetailPanelBody`, exported above). See this file's
   *  own top doc comment. */
  onActionLogEntryOpen?: (entry: MarcusWebbActionLogEntry) => void;
  /** Fired when a "Do Something" suggested-article row is clicked — the
   *  caller is expected to show it in a side panel (via
   *  `KnowledgeArticleDetailPanelBody`, exported from
   *  agent-next-gen-knowledge-article-card.tsx), the same floating-
   *  `InteriorPanel` mechanism `onActionLogEntryOpen` already uses. The
   *  caller owns the toggle-closed-on-second-click behavior (mirroring
   *  `onActionLogEntryOpen`'s own); this card only calls back with
   *  whichever article was clicked. */
  onViewArticle?: (article: KnowledgeArticleCardData) => void;
  /** The `id` of the note entry whose side panel is currently open (or
   *  `null`/omitted) — drives `ActionLogNoteEntry`'s own selected-state
   *  highlight. The caller owns whether a second click on the same entry
   *  toggles its panel closed; this card only reflects whichever id it's
   *  told is selected. */
  selectedActionLogEntryId?: string | null;
  /** Same idea as `selectedActionLogEntryId`, for `KnowledgeArticleSummaryRow`'s
   *  own selected-state highlight. */
  selectedArticleId?: string | null;
  /** A page-provided DOM node, pinned to the bottom of the interaction
   *  column above the "Reviewing this conversation" `ActionBar` (the same
   *  "fixed slot replaces the composer/controls" mechanic that bar already
   *  uses), that content can portal into instead of rendering inline.
   *  Per explicit request ("none of these should be fixed"), NONE of the
   *  three `activeQuestionItem` questions (top-level, post-takeover
   *  remedies, post-photo decision) use this anymore — all three render
   *  inline now (see `MarcusWebbInlineQuestionCard` below). This prop
   *  still exists for the (currently hidden, `SHOW_DO_SOMETHING_INPUT`)
   *  "Do something" `AIInput` (`commandSlotContent`), which still portals
   *  here if it's ever re-enabled. Everything else on this card (bullets,
   *  the action log, `AIProcess` step lists, the photo) stays inline
   *  regardless — those are history, not something awaiting an answer.
   *  Omit to render everything in place (no regression risk for a caller
   *  that doesn't wire this up). See `portalToQuestionSlot` below. */
  questionSlotElement?: HTMLElement | null;
}) {
  const [selected, setSelected] = useState<MarcusWebbNextBestActionSelection | undefined>(undefined);
  const [customNote, setCustomNote] = useState("");
  const [confirmed, setConfirmed] = useState<MarcusWebbNextBestActionSelection | undefined>(undefined);
  // Snapshot of the FIRST "something else" note, read by the `onComplete`
  // effect below (fires once, 4s after `confirmed` first becomes truthy —
  // see that effect's own `[confirmed]`-only deps) — a ref, not state,
  // since `handleTopLevelConfirm` now clears `customNote` synchronously
  // right after logging each submission (so the picker's textarea comes
  // back empty for the next round), which would otherwise already be
  // empty by the time that delayed effect reads it.
  const noteForCompletionRef = useRef("");

  // The growing action log — see this file's own top doc comment for the
  // full "simple" vs. "note" distinction and every point below that logs
  // into it.
  const [actionLog, setActionLog] = useState<MarcusWebbActionLogEntry[]>([]);
  const nextLogId = useRef(0);
  const nowTimestamp = () => new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const logMilestone = (title: string) => {
    setActionLog((log) => [...log, { id: String(nextLogId.current++), kind: "simple", title, timestamp: nowTimestamp() }]);
  };
  // Returns the entry it just created — every existing call site ignores
  // the return value, but the command flow's own auto-open-the-panel step
  // (below) needs the exact entry it just logged, not a fresh lookup.
  const logDecision = (entry: Omit<MarcusWebbActionLogEntry, "id" | "kind" | "timestamp" | "actorName">) => {
    const full: MarcusWebbActionLogEntry = {
      id: String(nextLogId.current++),
      kind: "note",
      actorName: "John Smith",
      timestamp: nowTimestamp(),
      ...entry,
    };
    setActionLog((log) => [...log, full]);
    return full;
  };
  // Local, self-contained elapsed timer — deliberately NOT the page's own
  // shared `clockTick` (this component still only takes the one narrow
  // `onComplete` callback — see this file's own top doc comment — not a
  // clock/tick prop), started the instant a choice is confirmed.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Flips true 4 simulated seconds after confirming — the "AI agent
  // finished performing this" state (see this component's own top doc
  // comment for the bug report this fixes: the spinner used to run
  // forever). Depending the interval effect below on this too (not just
  // `confirmed`) is what actually freezes the timer at that point — once
  // `completed` is true, the guard skips creating a new interval, so
  // `elapsedSeconds` simply stops advancing.
  const [completed, setCompleted] = useState(false);
  // Something else only now — Approve uses `approveStepIndex` below, Reject
  // uses its own reason/step machinery further down (see this file's own
  // top doc comment).
  useEffect(() => {
    if (!confirmed || confirmed === "approve" || confirmed === "reject" || completed) return;
    const interval = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [confirmed, completed]);
  useEffect(() => {
    if (!confirmed || confirmed === "approve" || confirmed === "reject") return;
    const timeout = window.setTimeout(() => {
      setCompleted(true);
      onComplete?.(`Thanks for holding — before we finish up, I wanted to follow up on this: ${noteForCompletionRef.current}`);
    }, 4000);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  // Reject only — per explicit request ("treat this like an actual Claude
  // session"), this is a growing LIST of rounds rather than a few flat
  // pieces of state that get reset/overwritten — picking "Reject and
  // provide another reason" at the post-photo question used to reset
  // `rejectReason`/`rejectStepIndex` back to their starting values, which
  // erased the photo/steps that were already on screen instead of just
  // continuing the conversation below them. Every earlier round now stays
  // rendered (frozen, `reasonSubmitted`/`stepIndex` never change again once
  // a NEW round is appended after it) — only the LAST round in this array
  // is ever "live" (still asking for a reason, or still advancing its own
  // step list).
  interface RejectRound {
    reason: string;
    reasonSubmitted: boolean;
    stepIndex: number;
  }
  const [rejectRounds, setRejectRounds] = useState<RejectRound[]>([
    { reason: "", reasonSubmitted: false, stepIndex: 0 },
  ]);
  const updateLastRejectRound = (patch: Partial<RejectRound>) => {
    setRejectRounds((rounds) => rounds.map((r, i) => (i === rounds.length - 1 ? { ...r, ...patch } : r)));
  };
  const lastRejectRound = rejectRounds[rejectRounds.length - 1];

  // Fires the rejection note once the FIRST round's reason is submitted —
  // exactly once (`rejectionNoteFiredRef` guards against `onComplete`'s
  // own identity changing across re-renders re-firing this), and only for
  // round 0: Marcus already knows the refund was declined by the time a
  // second/third round starts, so later rounds don't repeat this line.
  const rejectionNoteFiredRef = useRef(false);
  useEffect(() => {
    if (confirmed !== "reject" || !rejectRounds[0]?.reasonSubmitted || rejectionNoteFiredRef.current) return;
    rejectionNoteFiredRef.current = true;
    onComplete?.(AGENT_REPLY.reject);
    logDecision({
      title: "Refund rejected",
      description: rejectRounds[0].reason.trim(),
      icon: <XCircle className="h-4 w-4 text-lyra-status-critical-strong" strokeWidth={1.5} aria-hidden="true" />,
      detail: {
        context: "How would you like to proceed?",
        options: OPTIONS.map((o) => ({ title: o.title, description: o.description, selected: o.value === "reject" })),
      },
    });
  }, [confirmed, rejectRounds, onComplete]);

  // Every round AFTER round 0 gets its own follow-up note, logged once
  // each the moment that round's own reason is submitted — round 0's own
  // note is logged above instead (it doubles as the top-level Reject
  // decision, per this file's own top doc comment). Only the LAST round
  // can ever transition `reasonSubmitted` (earlier rounds are frozen), so
  // tracking the highest round index already logged is enough to log each
  // one exactly once regardless of how many rounds pile up. Per explicit
  // follow-up, round ≥ 1 no longer simulates another photo request (see
  // the step-advancing effect below) — it's simply another rejection, so
  // this logs as "Refund rejected" (reusing `CONFIRMED_META.reject`'s own
  // label/icon, matching round 0's), not "Requested additional
  // information" (which implied a request cycle that no longer happens).
  const followUpReasonLoggedIndexRef = useRef(0);
  useEffect(() => {
    if (confirmed !== "reject") return;
    const idx = rejectRounds.length - 1;
    if (idx === 0 || !rejectRounds[idx].reasonSubmitted || idx <= followUpReasonLoggedIndexRef.current) return;
    followUpReasonLoggedIndexRef.current = idx;
    logDecision({
      title: CONFIRMED_META.reject.label,
      description: rejectRounds[idx].reason.trim(),
      icon: CONFIRMED_META.reject.icon,
      detail: {
        context: "How would you like to proceed?",
        options: PHOTO_DECISION_OPTIONS.map((o) => ({
          title: o.title,
          description: o.description,
          selected: o.value === "reject",
        })),
      },
    });
  }, [confirmed, rejectRounds]);

  // Advances round 0's own step every 1.5s once its reason has been
  // submitted, same shape as `approveStepIndex` below. Per explicit
  // follow-up, this ONLY ever plays out for round 0 — rejecting again
  // after the photo (round ≥ 1) is terminal: no second simulated
  // "request another photo" round-trip, just the follow-up note above.
  // Gating on `rejectRounds.length === 1` (rather than "the last round",
  // as this used to) is what freezes every later round's `stepIndex` at
  // 0 forever, which in turn is what keeps the photo-decision question
  // (gated on `lastRejectRound.stepIndex >= REJECT_STEP_LABELS.length`)
  // from ever reappearing after round 0 — one flag change avoids having
  // to separately gate that question, too.
  useEffect(() => {
    if (confirmed !== "reject" || rejectRounds.length > 1 || !lastRejectRound.reasonSubmitted) return;
    if (lastRejectRound.stepIndex >= REJECT_STEP_LABELS.length) return;
    const timeout = window.setTimeout(() => {
      if (lastRejectRound.stepIndex === 0) onPhotoRequested?.();
      if (lastRejectRound.stepIndex === 1) logMilestone("Customer provided photo of damaged item.");
      updateLastRejectRound({ stepIndex: lastRejectRound.stepIndex + 1 });
    }, 1500);
    return () => window.clearTimeout(timeout);
    // `onPhotoRequested` deliberately excluded — same reasoning as
    // `approveStepIndex`'s own effect below: it's a fresh inline function
    // every render of the caller, and including it here would tear down
    // and restart this timeout on every unrelated page re-render (e.g. the
    // shared clock tick) before it ever gets a chance to fire — exactly
    // the "hung on step 1" bug this fixes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, rejectRounds]);

  // Auto-collapses each round's own `AIProcess` once ITS OWN steps finish
  // loading — per explicit request, a completed step list left fully
  // expanded shows too much info sitting around for no further reason to
  // look at it. Keyed by round index (not just "the last round") since an
  // earlier round can still be on screen, fully done, while a later one
  // is freshly appended and still loading. A plain `Set`, not a field on
  // `RejectRound` itself, since `onExpandedChange` needs to let the agent
  // manually reopen a collapsed round afterward — independent of anything
  // `updateLastRejectRound` already tracks (and updating only ever
  // touches the LAST round, not an arbitrary earlier one).
  const [collapsedRejectRounds, setCollapsedRejectRounds] = useState<Set<number>>(new Set());
  useEffect(() => {
    rejectRounds.forEach((round, i) => {
      if (round.stepIndex >= REJECT_STEP_LABELS.length) {
        setCollapsedRejectRounds((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
      }
    });
  }, [rejectRounds]);
  const setRejectRoundExpanded = (i: number, expanded: boolean) =>
    setCollapsedRejectRounds((prev) => {
      const next = new Set(prev);
      if (expanded) next.delete(i);
      else next.add(i);
      return next;
    });

  const buildRejectSteps = (stepIndex: number): AIProcessStep[] =>
    REJECT_STEP_LABELS.map((label, i) => ({
      id: String(i),
      label,
      status: i < stepIndex ? "done" : i === stepIndex ? "active" : "pending",
    }));

  // Locked once the post-photo question resolves to Approve (see
  // `handlePhotoDecisionConfirm` below) — the approve summary/`AIProcess`
  // then appends BELOW the reject rounds instead of replacing them
  // (`confirmed` deliberately stays `"reject"`; see `approveBlock`'s own
  // render site and the approve effect's guard further down, both of which
  // check this alongside `confirmed === "approve"`).
  const [approvedAfterReject, setApprovedAfterReject] = useState(false);

  // Second question, asked once the photo above arrives — its own
  // pre-confirm selection/note, separate from the top-level `selected`/
  // `customNote` (a different question, answered at a different point).
  const [photoDecisionSelected, setPhotoDecisionSelected] = useState<MarcusWebbNextBestActionSelection | undefined>(
    undefined
  );
  const [photoDecisionNote, setPhotoDecisionNote] = useState("");
  // The reason typed inline for "Reject and provide another reason" —
  // per explicit follow-up, this reject option gets the exact same
  // inline-note treatment (label + `Textarea` inside its own row) as the
  // top-level "Reject the refund" (see `OPTIONS`' own `notes` prop) rather
  // than the old separate "reject-reason" card, which no round reaches
  // anymore. Held here (not on `RejectRound` directly) since the round it
  // belongs to doesn't exist yet until confirm actually appends it.
  const [photoDecisionRejectReason, setPhotoDecisionRejectReason] = useState("");
  // "Something else" here locks in its own "flag for review" process
  // (`FLAG_STEP_LABELS` below) — Approve/Reject don't set any state of
  // their own; they reuse the existing `confirmed`/reject-reason states.
  const [flagConfirmed, setFlagConfirmed] = useState(false);

  const handlePhotoDecisionConfirm = (value: MarcusWebbNextBestActionSelection) => {
    if (value === "approve") {
      // Appends the approve summary/`AIProcess` below the reject rounds
      // already on screen (`approveBlock`) — deliberately does NOT touch
      // `confirmed` (still "reject"), so none of that history disappears.
      setApprovedAfterReject(true);
      logDecision({
        title: CONFIRMED_META.approve.label,
        icon: <CheckCircle2 className="h-4 w-4 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />,
        detail: {
          context: "How would you like to proceed?",
          options: PHOTO_DECISION_OPTIONS.map((o) => ({
            title: o.title,
            description: o.description,
            selected: o.value === "approve",
          })),
        },
      });
    } else if (value === "reject") {
      // Appends a fresh round rather than resetting the current one — the
      // previous round's own reason/steps/photo stay exactly as they are.
      // The reason was already typed inline on this same question (see
      // `photoDecisionRejectReason`), so it lands `reasonSubmitted: true`
      // from the moment it's appended — no separate follow-up card. No
      // log entry here either — that round's own follow-up note logs once
      // `reasonSubmitted` is seen true (see `followUpReasonLoggedIndexRef`'s
      // effect), which now fires off this same state update.
      setRejectRounds((rounds) => [
        ...rounds,
        { reason: photoDecisionRejectReason.trim(), reasonSubmitted: true, stepIndex: 0 },
      ]);
      setPhotoDecisionRejectReason("");
      setPhotoDecisionSelected(undefined);
      setPhotoDecisionNote("");
    } else {
      setFlagConfirmed(true);
      logDecision({
        title: "Instruction sent",
        description: photoDecisionNote.trim(),
        icon: <MessageSquareText className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />,
        detail: {
          context: "How would you like to proceed?",
          options: PHOTO_DECISION_OPTIONS.map((o) => ({
            title: o.title,
            description: o.description,
            selected: o.value === "something-else",
          })),
        },
      });
    }
  };

  // "Something else" (flag for review) only — advances one step every
  // 1.5s, same shape as `approveStepIndex`/`rejectStepIndex` above. Step 3
  // reuses `onAssignmentClosed` (see this file's own top doc comment).
  const [flagStepIndex, setFlagStepIndex] = useState(0);
  useEffect(() => {
    if (!flagConfirmed) return;
    if (flagStepIndex >= FLAG_STEP_LABELS.length) return;
    const timeout = window.setTimeout(() => {
      const callbacks = [onAccountFlagged, onStatusEscalated, onAssignmentClosed];
      callbacks[flagStepIndex]?.();
      if (flagStepIndex === 1) logMilestone('Status updated to "Escalated"');
      setFlagStepIndex((i) => i + 1);
    }, 1500);
    return () => window.clearTimeout(timeout);
    // Callbacks deliberately excluded from deps — see `rejectStepIndex`'s
    // own effect above for why (fresh inline functions every render would
    // otherwise reset this timeout before it ever fires).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagConfirmed, flagStepIndex]);

  const flagSteps: AIProcessStep[] = FLAG_STEP_LABELS.map((label, i) => ({
    id: String(i),
    label,
    status: i < flagStepIndex ? "done" : i === flagStepIndex ? "active" : "pending",
  }));

  // Auto-collapses once flagging finishes loading — see
  // `collapsedRejectRounds`'s own doc comment above for the "why".
  // `onExpandedChange` still lets the agent manually reopen it after.
  const [flagExpanded, setFlagExpanded] = useState(true);
  useEffect(() => {
    if (flagStepIndex >= FLAG_STEP_LABELS.length) setFlagExpanded(false);
  }, [flagStepIndex]);

  // Fires either from the top-level Approve option OR from
  // `approvedAfterReject` (the post-photo question) — advances one step
  // every 1.5s, firing that step's own callback as it completes (see this
  // file's own top doc comment). Per explicit follow-up, Approve no
  // longer has its own "close/dismiss" step — that step (and its
  // `onAssignmentClosed` call) is gone from this list entirely; the
  // approval simply finishes on the disposition update, with dismissing
  // the assignment left to whatever the agent does next, same as any
  // other resolved conversation.
  const approveTriggered = confirmed === "approve" || approvedAfterReject;
  const [approveStepIndex, setApproveStepIndex] = useState(0);
  useEffect(() => {
    if (!approveTriggered) return;
    if (approveStepIndex >= APPROVE_STEP_LABELS.length) return;
    const timeout = window.setTimeout(() => {
      const callbacks = [onAgentContactedCustomer, onCustomerApprovedResolution, onDispositionUpdated];
      callbacks[approveStepIndex]?.();
      if (approveStepIndex === 2) logMilestone(APPROVE_STEP_LABELS[2]);
      setApproveStepIndex((i) => i + 1);
    }, 1500);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTriggered, approveStepIndex]);

  const approveSteps: AIProcessStep[] = APPROVE_STEP_LABELS.map((label, i) => ({
    id: String(i),
    label,
    status: i < approveStepIndex ? "done" : i === approveStepIndex ? "active" : "pending",
  }));

  // Auto-collapses once the approval finishes loading — see
  // `collapsedRejectRounds`'s own doc comment above for the "why".
  // `onExpandedChange` still lets the agent manually reopen it after.
  const [approveExpanded, setApproveExpanded] = useState(true);
  useEffect(() => {
    if (approveStepIndex >= APPROVE_STEP_LABELS.length) setApproveExpanded(false);
  }, [approveStepIndex]);

  // Shared between the top-level Approve branch and the post-photo
  // "approved after reject" append (see `approvedAfterReject`'s own doc
  // comment) — just the `AIProcess`, rendered at two different points in
  // the tree depending on how Approve was reached. No summary box here —
  // both paths that reach this already log their own "Refund approved"
  // decision immediately (`handleTopLevelConfirm`/`handlePhotoDecisionConfirm`),
  // so a box here would just duplicate that action-log entry (per explicit
  // bug report).
  //
  // Gated on `SHOW_APPROVE_PROCESSING_STEPS` (own doc comment above) —
  // "hide, don't destroy": the underlying simulated process (timers,
  // `onAgentContactedCustomer`/`onCustomerApprovedResolution`/
  // `onDispositionUpdated` callbacks, the eventual "Refund approved" log
  // entry) runs the same regardless of this flag — only this VISUAL step
  // list is toggled.
  const approveBlock = SHOW_APPROVE_PROCESSING_STEPS ? (
    <AIProcess
      expanded={approveExpanded}
      onExpandedChange={setApproveExpanded}
      label="Processing the approval"
      steps={approveSteps}
    />
  ) : null;

  // Takeover only — see this file's own top doc comment. Fires the human
  // agent's greeting then the customer's reply once, on a short delay,
  // independently of the remedy question below (same fire-once-on-a-flag
  // pattern as `rejectionNoteFiredRef`).
  const [remedySelected, setRemedySelected] = useState<RemedySelection | undefined>(undefined);
  const [remedyNote, setRemedyNote] = useState("");
  const [remedyConfirmed, setRemedyConfirmed] = useState<RemedySelection | undefined>(undefined);
  const takeoverIntroducedRef = useRef(false);
  useEffect(() => {
    if (!takenOver || takeoverIntroducedRef.current) return;
    takeoverIntroducedRef.current = true;
    logMilestone("Agent Smith has taken over the conversation.");
    const t1 = window.setTimeout(() => onTakeoverGreeting?.(), 1000);
    const t2 = window.setTimeout(() => onCustomerRespondedToTakeover?.(), 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenOver]);

  const handleRemedyConfirm = (value: RemedySelection) => {
    setRemedyConfirmed(value);
    onRemedyIssued?.(value, value === "something-else" ? remedyNote : undefined);
    logDecision({
      title:
        value === "store-credit" ? "Store credit issued" : value === "discount-code" ? "Discount code sent" : "Instruction sent",
      description: value === "something-else" ? remedyNote.trim() : undefined,
      icon:
        value === "something-else" ? (
          <MessageSquareText className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />
        ),
      detail: {
        context: "Suggested remedies",
        options: REMEDY_OPTIONS.map((o) => ({ title: o.title, description: o.description, selected: o.value === value })),
      },
    });
  };

  // ── "Do something" command field ──
  // No local LLM wired up yet (the earlier local-Ollama integration was
  // removed since it can't work without a locally-running server; a real
  // client-side LLM replacement, via WebLLM, is a separate, saved-for-
  // later plan). What IS wired up, per explicit request: submitting shows
  // a placeholder "suggested knowledge article" card — see
  // `PLACEHOLDER_KNOWLEDGE_ARTICLE` above and `KnowledgeArticleCard`
  // (agent-next-gen-knowledge-article-card.tsx) — a scaffold to build the
  // real containers against before real per-command content exists.
  const [commandInputValue, setCommandInputValue] = useState("");
  // Append-only, same convention as `actionLog` — each submission adds
  // its own card rather than replacing a single slot. A separate ref
  // counter (not `nextLogId`) since these aren't `actionLog` entries;
  // they render in their own block, right after it (see the render
  // below).
  const [suggestedArticles, setSuggestedArticles] = useState<{ id: string }[]>([]);
  const nextArticleId = useRef(0);

  // Top-level confirm — logs immediately for Approve/Something-else (their
  // own descriptive text already exists at this moment). Reject is
  // different: per explicit request, its reason is now captured inline
  // on this SAME top-level question (see `OPTIONS`' own `notes` prop,
  // below) rather than a separate follow-up card, so confirming it also
  // finalizes that already-typed reason in the same call — logging
  // itself still happens later, off `rejectionNoteFiredRef`'s effect
  // (below), which only cares that `confirmed`/`rejectRounds[0]` both
  // ended up set, not which handler call did it.
  const handleTopLevelConfirm = (value: MarcusWebbNextBestActionSelection) => {
    setConfirmed(value);
    if (value === "reject") {
      updateLastRejectRound({ reasonSubmitted: true });
      return;
    }
    // Per explicit follow-up request ("this way they can keep requesting
    // something else and the approve / reject doesn't go away until one
    // is selected") — Something else no longer goes through the shared
    // `logDecision` (that's approve-only now): it logs its own
    // `"transactions"`-kind entry instead (rendered inline as an
    // expandable accordion opening straight to the customer's last-10-
    // transactions table — `MarcusWebbInstructionTransactionsEntry`,
    // below), then clears the picker's own fields so it comes back empty
    // for another round. `noteForCompletionRef` snapshots the note BEFORE
    // clearing `customNote` — the `onComplete` effect below reads live
    // `customNote` on a 4s delay, which would otherwise already be empty
    // by the time it fires.
    if (value === "something-else") {
      const note = customNote.trim();
      noteForCompletionRef.current = note;
      setActionLog((log) => [
        ...log,
        {
          id: String(nextLogId.current++),
          kind: "transactions",
          title: "Instruction sent",
          timestamp: nowTimestamp(),
          actorName: "John Smith",
          icon: <MessageSquareText className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />,
          description: note,
        },
      ]);
      setCustomNote("");
      setSelected(undefined);
      return;
    }
    logDecision({
      title: CONFIRMED_META.approve.label,
      icon: <CheckCircle2 className="h-4 w-4 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />,
      detail: {
        context: "How would you like to proceed?",
        options: OPTIONS.map((o) => ({ title: o.title, description: o.description, selected: o.value === value })),
      },
    });
  };

  const confirmDisabled =
    (selected === "something-else" && customNote.trim().length === 0) ||
    (selected === "reject" && lastRejectRound.reason.trim().length === 0);

  // See `questionSlotElement`'s own doc comment above.
  const portalToQuestionSlot = (node: React.ReactNode) =>
    questionSlotElement ? createPortal(node, questionSlotElement) : node;

  const contactOverviewItem = {
    id: "contact-overview",
    title: "Contact Overview",
    content: (
      <ul className="flex flex-col gap-1.5 pl-4 list-disc">
        <li className="lyra-body-md text-lyra-fg-default">
          Marcus Webb — Order #48213 (noise-cancelling headphones, $200), placed last Tuesday. Reported the item
          arrived with a cracked ear cup.
        </li>
        <li className="lyra-body-md text-lyra-fg-default">
          The AI agent confirmed the damage qualifies for a refund, located the order, and calculated the refund
          amount before pausing for approval.
        </li>
        <li className="lyra-body-md text-lyra-fg-default">
          The $200 refund exceeds the AI agent's $100 auto-approval limit, so Marcus was placed on hold pending your
          sign-off.
        </li>
      </ul>
    ),
  };

  // Whichever ONE question is currently awaiting the agent's answer (these
  // are mutually exclusive by construction — never more than one true at
  // once): the top-level question, the post-photo question, or the remedy
  // question. `null` once nothing's pending. There's no separate
  // "reject-reason" branch anymore — every reject option (top-level AND
  // the post-photo "Reject and provide another reason") captures its
  // reason inline on its own question via `notes`, so `reasonSubmitted`
  // is always already true by the time a round exists to check.
  let activeQuestionItem: { id: string; title: string; content: React.ReactNode } | null = null;
  if (takenOver) {
    if (!remedyConfirmed) {
      activeQuestionItem = {
        id: "remedies",
        title: "Suggested remedies",
        content: (
          <NextBestActionOptionPicker
            options={REMEDY_OPTIONS}
            selected={remedySelected}
            onSelectedChange={setRemedySelected}
            onConfirm={handleRemedyConfirm}
            confirmDisabled={remedySelected === "something-else" && remedyNote.trim().length === 0}
            notes={{
              "something-else": {
                value: remedyNote,
                onChange: setRemedyNote,
                placeholder: "Describe what you'd like to do instead...",
              },
            }}
          />
        ),
      };
    }
  } else if (!confirmed || confirmed === "something-else") {
    // Per explicit follow-up request ("this way they can keep requesting
    // something else and the approve / reject doesn't go away until one
    // is selected") — "Something else" is the one option that doesn't
    // lock the picker away: `confirmed` still gets set to
    // `"something-else"` (see `handleTopLevelConfirm`, so its own note
    // logs correctly and the eventual `onComplete` reply still fires),
    // but this condition treats that value the same as "nothing answered
    // yet," so the SAME picker below just keeps reappearing after each
    // submission. Approve/Reject are the only two values that actually
    // fall through past this branch for good.
    activeQuestionItem = {
      id: "next-best-action",
      title: "How would you like to proceed?",
      content: (
        <NextBestActionOptionPicker
          options={OPTIONS}
          selected={selected}
          onSelectedChange={setSelected}
          onConfirm={handleTopLevelConfirm}
          confirmDisabled={confirmDisabled}
          notes={{
            reject: {
              value: lastRejectRound.reason,
              onChange: (value) => updateLastRejectRound({ reason: value }),
              placeholder: "e.g. the damage report needs photos before this can be approved...",
              label: "Enter a reason",
            },
            "something-else": {
              value: customNote,
              onChange: setCustomNote,
              placeholder: "Describe what you'd like the AI agent to do instead (e.g. ask for photos of the damage first)...",
            },
          }}
        />
      ),
    };
  } else if (
    confirmed === "reject" &&
    lastRejectRound.stepIndex >= REJECT_STEP_LABELS.length &&
    !flagConfirmed &&
    !approvedAfterReject
  ) {
    activeQuestionItem = {
      id: "photo-decision",
      title: "How would you like to proceed?",
      content: (
        <NextBestActionOptionPicker
          options={PHOTO_DECISION_OPTIONS}
          selected={photoDecisionSelected}
          onSelectedChange={setPhotoDecisionSelected}
          onConfirm={handlePhotoDecisionConfirm}
          confirmDisabled={
            (photoDecisionSelected === "something-else" && photoDecisionNote.trim().length === 0) ||
            (photoDecisionSelected === "reject" && photoDecisionRejectReason.trim().length === 0)
          }
          notes={{
            reject: {
              value: photoDecisionRejectReason,
              onChange: setPhotoDecisionRejectReason,
              placeholder: "e.g. the damage report needs photos before this can be approved...",
              label: "Enter a reason",
            },
            "something-else": {
              value: photoDecisionNote,
              onChange: setPhotoDecisionNote,
              placeholder: 'e.g. "Flag this account for review"',
            },
          }}
        />
      ),
    };
  }

  // Placeholder in the slot whenever nothing's scripted-pending — no LLM
  // wired up yet (see `commandInputValue`'s own doc comment above), but
  // submitting DOES append a placeholder knowledge-article card (below,
  // rendered inline, never in this fixed slot — same "processing happens
  // inline" precedent as everything else on this card).
  const commandSlotContent: React.ReactNode = !activeQuestionItem && SHOW_DO_SOMETHING_INPUT ? (
    <AIInput
      singleLine
      helperText=""
      placeholder="Do something..."
      value={commandInputValue}
      onChange={setCommandInputValue}
      onSubmit={(text: string) => {
        if (!text.trim()) return;
        setCommandInputValue("");
        const id = String(nextArticleId.current++);
        setSuggestedArticles((prev) => [...prev, { id }]);
        // Per explicit request, auto-opens the detail panel the instant
        // this is "processed" — there's no real processing step yet (see
        // this file's own top-of-section doc comment), so that's simply
        // the moment the row itself is created. Once real LLM processing
        // exists, move this call to wherever that processing actually
        // finishes instead.
        onViewArticle?.({ ...PLACEHOLDER_KNOWLEDGE_ARTICLE, id });
      }}
    />
  ) : null;

  // `Contact Overview`'s own card, rendered inline as ordinary (scrolling)
  // transcript content — see the render below — rather than portaled.
  // Per explicit request, `variant="default"` + `shadow-none` gives it a
  // plain white surface with no drop shadow, unlike the floating question
  // card above.
  const buildContactOverviewContainer = () => (
    <Container variant="default" className="shadow-none">
      <Accordion defaultValue={contactOverviewItem.id} items={[contactOverviewItem]} />
    </Container>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Contact Overview renders inline, in normal flow, permanently —
          per explicit follow-up request, it's no longer hidden after the
          agent's first selection. It's initial context, not something
          awaiting an answer, so it never portals either. */}
      {buildContactOverviewContainer()}
      {/* Per explicit request ("none of these should be fixed"), NONE of
          the `activeQuestionItem` questions portal into the fixed bottom
          slot anymore — all three render inline below instead (see
          `MarcusWebbInlineQuestionCard`). This still portals
          `commandSlotContent` (the currently-hidden "Do something"
          `AIInput`) — the only thing left that can occupy the fixed slot
          — which itself only ever renders when `activeQuestionItem` is
          null (see its own definition above), so the slot naturally stays
          empty/collapsed (`empty:hidden`) while any question is pending. */}
      {portalToQuestionSlot(commandSlotContent)}
      {actionLog.length > 0 && (
        <div className="flex flex-col gap-3">
          {actionLog.map((entry) =>
            entry.kind === "simple" ? (
              <ActionLogSimpleEntry key={entry.id} timestamp={entry.timestamp} title={entry.title} />
            ) : entry.kind === "transactions" ? (
              <MarcusWebbInstructionTransactionsEntry key={entry.id} entry={entry} />
            ) : (
              <ActionLogNoteEntry
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedActionLogEntryId}
                onClick={() => onActionLogEntryOpen?.(entry)}
              />
            )
          )}
        </div>
      )}
      {/* "Do Something" suggested-article rows — inline, never portaled
          into the fixed slot (see `commandSlotContent`'s own doc comment
          above), independent of `takenOver`/`confirmed` like every other
          block tied to the command field. Per explicit follow-up, a
          compact row (matching "Refund approved"'s own weight) rather
          than a fully expanded card — its full content lives in the
          side panel `onViewArticle` opens instead. `data.id` is
          overridden with THIS row's own unique id (not the shared
          placeholder content's own `"tablet-warranty-coverage"` id) so
          multiple submitted rows can be independently selected/toggled —
          see `selectedArticleId`'s own doc comment. */}
      {suggestedArticles.map((a) => (
        <KnowledgeArticleSummaryRow
          key={a.id}
          data={PLACEHOLDER_KNOWLEDGE_ARTICLE}
          selected={a.id === selectedArticleId}
          onClick={() => onViewArticle?.({ ...PLACEHOLDER_KNOWLEDGE_ARTICLE, id: a.id })}
        />
      ))}
      {/* Everything below is pure history — `AIProcess` step lists, the
          photo, the approve summary — none of it is "awaiting an answer,"
          so none of it ever portals. Nothing renders here at all while
          `takenOver` (the remedy question — or nothing, once answered —
          already covers that whole state; see `activeQuestionItem` above),
          or before the top-level question's been answered. */}
      {!takenOver && confirmed && (
        <div className="flex flex-col gap-3">
          {confirmed === "approve" ? (
            approveBlock
          ) : confirmed === "reject" ? (
            <div className="flex flex-col gap-4">
              {/* Only round 0 ever gets its own `AIProcess`/photo — per
                  explicit follow-up, rejecting again after the photo
                  (round ≥ 1) doesn't simulate another photo request; it's
                  terminal, with only its own follow-up log entry (above,
                  in `actionLog`) to show for it. */}
              {rejectRounds.map(
                (round, i) =>
                  round.reasonSubmitted &&
                  i === 0 && (
                    <div key={i} className="flex flex-col gap-3">
                      <AIProcess
                        expanded={!collapsedRejectRounds.has(i)}
                        onExpandedChange={(next: boolean) => setRejectRoundExpanded(i, next)}
                        label="Requesting additional information"
                        steps={buildRejectSteps(round.stepIndex)}
                      />
                      {round.stepIndex >= REJECT_STEP_LABELS.length && (
                        <div className="flex flex-col gap-2">
                          <p className="lyra-body-sm text-lyra-fg-secondary">
                            The customer provided the attached photo.
                          </p>
                          <AttachmentThumbnail
                            filename="damaged-earcup.jpg"
                            alt="Photo of the damaged headphone ear cup"
                            src={damagedHeadphonesImg}
                            onClick={onPhotoExpand}
                          />
                        </div>
                      )}
                    </div>
                  )
              )}
              {flagConfirmed && (
                <AIProcess
                  expanded={flagExpanded}
                  onExpandedChange={setFlagExpanded}
                  label="Flagging for review"
                  steps={flagSteps}
                />
              )}
              {approvedAfterReject && approveBlock}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              {completed ? (
                <CheckCircle2 className="h-4 w-4 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Spinner size="sm" />
              )}
              <span className="lyra-body-sm text-lyra-fg-secondary flex-1">
                {completed ? "AI agent finished performing this." : "AI agent is performing this now…"}
              </span>
              <span className="lyra-body-sm text-lyra-fg-secondary">{formatElapsedTime(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      )}
      {/* Whichever question is currently pending — top-level, post-takeover
          remedies, or post-photo decision — renders inline here, per
          explicit request ("none of these should be fixed"). Placed AFTER
          the pure-history block above (rather than right after the action
          log) so the post-photo decision correctly reads below round 0's
          own `AIProcess`/photo instead of above it — the top-level and
          remedies questions are unaffected by this position, since that
          history block renders nothing while either of those is active
          (`confirmed`/`takenOver` gate it off in both cases). See
          `MarcusWebbInlineQuestionCard`'s own doc comment, and the portal
          call site above (which no longer carries any question). */}
      {activeQuestionItem && <MarcusWebbInlineQuestionCard item={activeQuestionItem} />}
    </div>
  );
}
