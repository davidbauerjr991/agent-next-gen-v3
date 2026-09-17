import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, CornerDownLeft, MessageSquareText, XCircle } from "lucide-react";
import {
  ActionIconButton,
  AIProcess,
  type AIProcessStep,
  AttachmentThumbnail,
  RadioGroup,
  RadioGroupItem,
  Spinner,
  Textarea,
  cn,
} from "@nicecxone/lyra-ui";
import { formatElapsedTime } from "@/components/agent-next-gen-shared-utils";
import damagedHeadphonesImg from "@/assets/headphones.jpg";

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
   inline `ActionIconButton` (Rule Zero: never a hand-rolled `<button>`,
   `CornerDownLeft` echoing Claude Code's own `AskUserQuestion` "Enter to
   submit" affordance) appears on the currently selected row. Confirming
   locks that choice in (`confirmed`) and replaces the option list with a
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
   of the four steps completing fires its own named callback
   (`onAgentContactedCustomer`/`onCustomerApprovedResolution`/
   `onDispositionUpdated`/`onAssignmentClosed`) — a second, larger
   exception to the original "no callback prop" design, since three of
   these four steps are real effects the caller applies to actual
   interaction state (a transcript message, a status change, dismissing
   the assignment), not just narration. `confirmed === "approve"`'s own
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
   (`REMEDY_OPTIONS`: Store Credit / Discount Code) replace them; picking
   one locks it in (`remedyConfirmed`) and fires `onRemedyIssued`. This is
   the third real use of `NextBestActionOptionPicker`'s radio+inline-
   confirm markup, and the first with no free-text option at all — it's
   generic over the option-value type now (`<T extends string>`) with an
   optional `noteFor` prop (only `OPTIONS`/`PHOTO_DECISION_OPTIONS` set it,
   to `"something-else"`) rather than hardcoding that one value in. A
   separate, short-delay pair of transcript lines (the human agent's own
   greeting, then the customer's reply — `onTakeoverGreeting`/
   `onCustomerRespondedToTakeover`) plays out independently of when the
   agent actually picks a remedy, same "narration is real transcript
   effects the caller applies" pattern as everywhere else on this card. Per
   explicit answer, issuing a remedy does NOT change the session status or
   dismiss the assignment — unlike Approve/the flag flow, this one's
   completion is left for the reviewing agent to wrap up manually. */

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

// "Approve"-only step list — see this file's own top doc comment for why
// this is separate from `completed`/`AGENT_REPLY` above (Reject/Something
// else keep the plain spinner treatment; only Approve gets this).
const APPROVE_STEP_LABELS = [
  "AI Agent contacting customer",
  "Waiting for customer response",
  'Disposition updated to "Exception Approved"',
  "Closing and dismissing assignment",
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

// Post-takeover remedy options — see this file's own top doc comment. No
// "something-else"/free-text option here at all, unlike the two lists
// above.
type RemedySelection = "store-credit" | "discount-code";
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
];

/** The radio-options-with-an-inline-"Enter"-confirm-button block, shared by
 *  every option list on this card — extracted once the top-level and
 *  post-photo questions needed the exact same markup/behavior, and made
 *  generic over the option-value type once a third list (the post-takeover
 *  remedies) needed it too but has no free-text option at all. `noteFor`
 *  is which single option value (if any) shows a `Textarea` beside its own
 *  inline confirm instead of a confirm button on its own row — omit it
 *  entirely (along with `noteValue`/`onNoteChange`/`notePlaceholder`) for
 *  a list where every option confirms directly, like the remedies. */
function NextBestActionOptionPicker<T extends string>({
  options,
  selected,
  onSelectedChange,
  onConfirm,
  confirmDisabled,
  noteFor,
  noteValue,
  onNoteChange,
  notePlaceholder,
}: {
  options: NextBestActionOption<T>[];
  selected: T | undefined;
  onSelectedChange: (value: T) => void;
  onConfirm: (value: T) => void;
  confirmDisabled: boolean;
  noteFor?: T;
  noteValue?: string;
  onNoteChange?: (value: string) => void;
  notePlaceholder?: string;
}) {
  return (
    <>
      <RadioGroup value={selected} onValueChange={(value) => onSelectedChange(value as T)}>
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex items-start gap-2 rounded-lyra-md border p-3 transition-colors",
              selected === option.value
                ? "border-lyra-border-active bg-lyra-bg-active-subtle"
                : "border-lyra-border-subtle bg-lyra-bg-surface-base hover:border-lyra-state-border-hover-neutral"
            )}
          >
            <RadioGroupItem
              value={option.value}
              className="flex-1 items-start"
              label={
                <span className="flex flex-col gap-0.5">
                  <span className="lyra-body-md-emphasis text-lyra-fg-default">{option.title}</span>
                  {option.description && (
                    <span className="lyra-body-sm text-lyra-fg-secondary">{option.description}</span>
                  )}
                </span>
              }
            />
            {/* Inline "confirm" trigger — only on the currently selected
                row, per explicit request ("like the enter button ...
                in screenshot 2"). Not for `noteFor` — per explicit
                follow-up, that one's confirm button moves down beside its
                own `Textarea` instead (see below), matching the reject
                flow's own reason-input layout, since confirming there
                needs the typed note, not just the row selection. */}
            {selected === option.value && option.value !== noteFor && (
              <ActionIconButton
                size="xs"
                title="Confirm"
                disabled={confirmDisabled}
                onClick={() => onConfirm(option.value)}
              >
                <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              </ActionIconButton>
            )}
          </div>
        ))}
      </RadioGroup>
      {noteFor !== undefined && selected === noteFor && (
        <div className="flex items-start gap-2">
          <Textarea
            className="flex-1"
            placeholder={notePlaceholder}
            rows={3}
            value={noteValue}
            onChange={(e) => onNoteChange?.(e.target.value)}
          />
          <ActionIconButton size="xs" title="Confirm" disabled={confirmDisabled} onClick={() => onConfirm(noteFor)}>
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </ActionIconButton>
        </div>
      )}
    </>
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
   *  expected to append the human agent's own confirmation line. Does NOT
   *  change status or dismiss the assignment (per explicit decision). */
  onRemedyIssued?: (remedy: RemedySelection) => void;
}) {
  const [selected, setSelected] = useState<MarcusWebbNextBestActionSelection | undefined>(undefined);
  const [customNote, setCustomNote] = useState("");
  const [confirmed, setConfirmed] = useState<MarcusWebbNextBestActionSelection | undefined>(undefined);
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
      onComplete?.(`Thanks for holding — before we finish up, I wanted to follow up on this: ${customNote.trim()}`);
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
  }, [confirmed, rejectRounds, onComplete]);

  // Advances the LAST round's own step every 1.5s once its reason has been
  // submitted, same shape as `approveStepIndex` below — but only ever
  // touches `rejectRounds[rejectRounds.length - 1]`, leaving every earlier
  // round's own `stepIndex` frozen at whatever it already reached.
  useEffect(() => {
    if (confirmed !== "reject" || !lastRejectRound.reasonSubmitted) return;
    if (lastRejectRound.stepIndex >= REJECT_STEP_LABELS.length) return;
    const timeout = window.setTimeout(() => {
      if (lastRejectRound.stepIndex === 0) onPhotoRequested?.();
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
    } else if (value === "reject") {
      // Appends a fresh round rather than resetting the current one — the
      // previous round's own reason/steps/photo stay exactly as they are.
      setRejectRounds((rounds) => [...rounds, { reason: "", reasonSubmitted: false, stepIndex: 0 }]);
      setPhotoDecisionSelected(undefined);
      setPhotoDecisionNote("");
    } else {
      setFlagConfirmed(true);
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

  // Fires either from the top-level Approve option OR from
  // `approvedAfterReject` (the post-photo question) — advances one step
  // every 1.5s, firing that step's own callback as it completes (see this
  // file's own top doc comment). Stops scheduling once the last step
  // (`onAssignmentClosed`) has fired: the caller is expected to dismiss the
  // assignment right then, unmounting this whole component.
  const approveTriggered = confirmed === "approve" || approvedAfterReject;
  const [approveStepIndex, setApproveStepIndex] = useState(0);
  useEffect(() => {
    if (!approveTriggered) return;
    if (approveStepIndex >= APPROVE_STEP_LABELS.length) return;
    const timeout = window.setTimeout(() => {
      const callbacks = [onAgentContactedCustomer, onCustomerApprovedResolution, onDispositionUpdated, onAssignmentClosed];
      callbacks[approveStepIndex]?.();
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

  // Shared between the top-level Approve branch and the post-photo
  // "approved after reject" append (see `approvedAfterReject`'s own doc
  // comment) — the exact same summary box + `AIProcess`, just rendered at
  // two different points in the tree depending on how Approve was reached.
  const approveBlock = (
    <div className="flex flex-col gap-3">
      <div className="rounded-lyra-md border border-lyra-border-active bg-lyra-bg-active-subtle p-3">
        <div className="flex items-center gap-2">
          {CONFIRMED_META.approve.icon}
          <span className="lyra-body-md-emphasis text-lyra-fg-default">{CONFIRMED_META.approve.label}</span>
        </div>
        <p className="lyra-body-sm text-lyra-fg-secondary mt-1">{CONFIRMED_META.approve.command}</p>
      </div>
      <AIProcess defaultExpanded label="Processing the approval" steps={approveSteps} />
    </div>
  );

  // Takeover only — see this file's own top doc comment. Fires the human
  // agent's greeting then the customer's reply once, on a short delay,
  // independently of the remedy question below (same fire-once-on-a-flag
  // pattern as `rejectionNoteFiredRef`).
  const [remedySelected, setRemedySelected] = useState<RemedySelection | undefined>(undefined);
  const [remedyConfirmed, setRemedyConfirmed] = useState<RemedySelection | undefined>(undefined);
  const takeoverIntroducedRef = useRef(false);
  useEffect(() => {
    if (!takenOver || takeoverIntroducedRef.current) return;
    takeoverIntroducedRef.current = true;
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
    onRemedyIssued?.(value);
  };

  const confirmDisabled = selected === "something-else" && customNote.trim().length === 0;

  return (
    <div className="flex flex-col gap-3">
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
      {takenOver ? (
        <div className="flex flex-col gap-3">
          <p className="lyra-body-md text-lyra-fg-default">Agent Smith has taken over the conversation.</p>
          <p className="lyra-body-md-emphasis text-lyra-fg-default">Suggested remedies:</p>
          {remedyConfirmed ? (
            <div className="rounded-lyra-md border border-lyra-border-active bg-lyra-bg-active-subtle p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />
                <span className="lyra-body-md-emphasis text-lyra-fg-default">
                  {remedyConfirmed === "store-credit" ? "Store credit issued" : "Discount code sent"}
                </span>
              </div>
            </div>
          ) : (
            <NextBestActionOptionPicker
              options={REMEDY_OPTIONS}
              selected={remedySelected}
              onSelectedChange={setRemedySelected}
              onConfirm={handleRemedyConfirm}
              confirmDisabled={false}
            />
          )}
        </div>
      ) : (
        <>
      <p className="lyra-body-md-emphasis text-lyra-fg-default">How would you like to proceed?</p>
      {confirmed ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lyra-md border border-lyra-border-active bg-lyra-bg-active-subtle p-3">
            <div className="flex items-center gap-2">
              {confirmed === "something-else" ? (
                <MessageSquareText className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                CONFIRMED_META[confirmed].icon
              )}
              <span className="lyra-body-md-emphasis text-lyra-fg-default">
                {confirmed === "something-else" ? "Instruction sent" : CONFIRMED_META[confirmed].label}
              </span>
            </div>
            {(confirmed === "something-else" || CONFIRMED_META[confirmed].command) && (
              <p className="lyra-body-sm text-lyra-fg-secondary mt-1">
                {confirmed === "something-else" ? `"${customNote.trim()}"` : CONFIRMED_META[confirmed].command}
              </p>
            )}
          </div>
          {confirmed === "approve" ? (
            approveBlock
          ) : confirmed === "reject" ? (
            <div className="flex flex-col gap-4">
              {rejectRounds.map((round, i) => (
                <div key={i} className="flex flex-col gap-3">
                  {round.reasonSubmitted ? (
                    <>
                      <AIProcess
                        defaultExpanded
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
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="lyra-body-md-emphasis text-lyra-fg-default">
                        What's the reason for declining this request?
                      </p>
                      <div className="flex items-start gap-2">
                        <Textarea
                          className="flex-1"
                          placeholder="e.g. the damage report needs photos before this can be approved..."
                          rows={3}
                          value={round.reason}
                          onChange={(e) => updateLastRejectRound({ reason: e.target.value })}
                        />
                        <ActionIconButton
                          size="xs"
                          title="Confirm"
                          disabled={round.reason.trim().length === 0}
                          onClick={() => updateLastRejectRound({ reasonSubmitted: true })}
                        >
                          <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        </ActionIconButton>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* The post-photo question, and everything it can lead to,
                  only ever pertains to the LAST round — every earlier round
                  above just stays as history. */}
              {lastRejectRound.stepIndex >= REJECT_STEP_LABELS.length &&
                !flagConfirmed &&
                !approvedAfterReject && (
                  <div className="flex flex-col gap-2">
                    <p className="lyra-body-md-emphasis text-lyra-fg-default">How would you like to proceed?</p>
                    <NextBestActionOptionPicker
                      options={PHOTO_DECISION_OPTIONS}
                      selected={photoDecisionSelected}
                      onSelectedChange={setPhotoDecisionSelected}
                      onConfirm={handlePhotoDecisionConfirm}
                      confirmDisabled={
                        photoDecisionSelected === "something-else" && photoDecisionNote.trim().length === 0
                      }
                      noteFor="something-else"
                      noteValue={photoDecisionNote}
                      onNoteChange={setPhotoDecisionNote}
                      notePlaceholder='e.g. "Flag this account for review"'
                    />
                  </div>
                )}
              {flagConfirmed && (
                <AIProcess defaultExpanded label="Flagging for review" steps={flagSteps} />
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
      ) : (
        <NextBestActionOptionPicker
          options={OPTIONS}
          selected={selected}
          onSelectedChange={setSelected}
          onConfirm={setConfirmed}
          confirmDisabled={confirmDisabled}
          noteFor="something-else"
          noteValue={customNote}
          onNoteChange={setCustomNote}
          notePlaceholder="Describe what you'd like the AI agent to do instead (e.g. ask for photos of the damage first)..."
        />
      )}
        </>
      )}
    </div>
  );
}
