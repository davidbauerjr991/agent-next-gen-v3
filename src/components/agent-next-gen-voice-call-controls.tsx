// VoiceCallControls — the fixed-to-the-bottom-of-the-content-area call
// toolbar for an active VOICE channel (Hold/Mute/Mask/Record/Keypad/Add
// video/Hang Up), per explicit request/reference screenshot. Sits in
// the exact spot `InteractionComposer` occupies for a chat channel — a
// `shrink-0` sibling directly below `InteractionTranscript`, in each of the
// three page components' own "voice has no composer" branch (see that
// branch's own doc comment, AgentNextGenPage.tsx/AgentWorkspace2WithDeskPage
// .tsx/AgentWorkspaceAdvancedPage.tsx) — so a live voice call gets this bar
// in that exact slot instead of nothing.
//
// Every button here except Hang Up is purely decorative/local-state (Hold/
// Mute/Mask/Record/Add video each just toggle their own icon and fire a
// toast; Keypad opens a small popover dialpad) — there's no real telephony
// backing any of this in the prototype, same "fake it with a toast"
// convention every other placeholder control in this app already follows
// (Send Transcript/Download Transcript/Translate Messages, etc.). Hang Up
// is the one exception: it's wired to a real `onHangUp` callback (the
// caller closes this channel, same as picking "Closed" from the status
// popover) since ending the call is the one action here an agent actually
// depends on to move on to logging an outcome.
//
// This bar used to carry THREE renderings — a WIDE two-row centered card, a
// COMPACT icon-only row, and a `stretch` single-row variant of the wide
// buttons for Phase 1/Phase 2 — auto-toggling between wide/compact via a
// `ResizeObserver` self-measuring this bar's own rendered width against a
// 768px breakpoint (a pattern `InteractionTranscript`'s own
// `transcriptNarrow`/`transcriptBubbleFullWidth`, agent-next-gen-
// transcript.tsx, and `ScheduleToolbar`'s own `containerRef`/`isWide`/
// `isCompact`, SchedulePanel.tsx, also use). Per an explicit bug report
// ("opened the details panel with the left nav closed, opened the left
// nav, then closing the details panel again didn't resize the bar back")
// and the explicit follow-up fix request that replaced trying to chase that
// bug further ("just take the existing compact version — stretch it the
// full width of the container and remove media queries"): all of that
// responsive machinery — the `ResizeObserver`/`isCompact` state, the wide
// two-row card, and the `stretch` single-row card — is gone. This bar now
// always renders what used to be the COMPACT (icon-only) JSX, unconditionally,
// stretched to fill whatever width its container gives it (`w-full` on the
// card below AND on the outer full-bleed wrapper — see that wrapper's own
// doc comment for why both levels need it explicitly rather than leaning on
// ambient flex stretch — no `max-w`/`mx-auto` cap) instead of only kicking
// in below a measured breakpoint. Below, every main control still drops its
// visible label for a hover/focus `Tooltip` (`CompactCallControlButton`),
// the timer still shows its "MM:SS" digits next to a Clock icon, and
// Volume/Transcript still trail in their own leading/trailing flex slots —
// none of that content changed, only the "which rendering, and how wide"
// logic around it. `stretch` stays as an accepted prop (default `false`)
// purely so Phase 1/Phase 2's existing call sites don't need to change
// their JSX — it no longer affects anything rendered here.
//
// Per a later explicit follow-up request/reference screenshot ("make the
// voice controls larger and label the buttons again"), every main control
// (Hold/Mask/Record/Keypad/Transcript/Volume/Mute/Add video) switched back
// from that icon-only `CompactCallControlButton` treatment to a labeled
// icon-over-text button instead — bigger tap target, and the label is now
// always-visible text again rather than only surfacing on hover/focus via
// `Tooltip`. This ISN'T a return to the old three-way wide/compact/stretch
// responsive split this file just spent the paragraph above removing —
// there's still exactly one rendering, it's just the LABELED one now
// instead of the icon-only one, still unconditionally stretched to its
// container's width. `WideCallControlButton` (below) — defined back when
// this file had that old wide rendering, but unused since it was removed —
// is what got reactivated for this, reworked to compose as a `Tooltip`/
// `Popover` trigger the same way `CompactCallControlButton` already does
// (see its own doc comment for why that requires `forwardRef`+`...rest`
// rather than a plain named-prop function). `CompactCallControlButton`
// itself is left defined but unused below — nothing left in this file
// calls it now that every control uses the labeled button instead — kept
// rather than deleted in case a genuinely narrow/compact rendering is ever
// wanted again later. Hang Up is the one control excluded from this
// change, per explicit request ("keep the End Call button filled red") —
// it stays the same solid-red `Button` it already was (see that render
// site's own doc comment), just bumped from `size="default"` to `size="lg"`
// so it still reads as proportionate next to the now-taller labeled
// buttons beside it.
//
// Per a later explicit follow-up request/reference screenshot ("make the
// end call button the same height as the mute and add video buttons and add
// the customer avatar. Add the name / number/email above the timer"): the
// trailing dark cluster (Mute/Add video/End Call) switched from
// `items-center` to `items-stretch` and End Call's fixed `size="lg"` height
// (h-9) got overridden to `h-auto`, so it now stretches to match whichever
// of Mute/Add video is tallest (their own `WideCallControlButton` shape is
// already `h-auto`, sized by content) instead of sitting short and centered
// next to them — no hardcoded pixel height to keep in sync if either of
// those buttons' own height ever changes. Separately, the leading slot
// gained an optional avatar chip + identity line (`customerLabel`/
// `customerInitials`, see their own doc comments on `VoiceCallControlsProps`
// below) stacked above the existing elapsed timer, per the reference
// screenshot's small purple circle + phone number/name sitting above the
// call duration. The avatar's purple background reuses this app's own
// existing "Voice channel = purple" accent convention (see
// `CHANNEL_TYPE_TAG_VARIANT`/`CHANNEL_TYPE_ICON_COLOR_CLASS`,
// agent-next-gen-contact-history.tsx and channel-row.tsx, both already
// purple for Voice) rather than inventing a new color. Its glyph is a
// generic `Plus` fallback (this design system's `interaction-nav-item.tsx`
// already falls back to a generic icon — there just a person outline —
// when there's no real contact match; `Plus` reads closer to the reference
// screenshot's unmatched-quickdial-number case, see `Interaction.id`'s own
// `quickdial:<number>` doc comment) shown in white — an explicit follow-up
// clarified this should be white, not the icon's original black/dark
// tone — with real initials (`customerInitials`) taking over instead once a
// caller has a genuine contact match, same "initials over generic icon
// once known" split that avatar convention already uses.
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Button,
  Popover,
  Slider,
  Tooltip,
  type ToastItem,
} from "@nicecxone/lyra-ui";
import {
  Pause,
  Play,
  Mic,
  MicOff,
  AudioLines,
  AudioLinesOff,
  Circle,
  Grid3x3,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Volume2,
  VolumeX,
  FileText,
  Plus,
} from "lucide-react";
import { formatElapsedTime } from "@/components/agent-next-gen-shared-utils";

/** One column: icon on top, visible label underneath — the main control
 *  shape this bar now uses everywhere (see this file's own top doc comment
 *  for the "why now again" history). Was originally used only by a since-
 *  removed wide rendering, unused for a while after that (only tooltip-only
 *  `CompactCallControlButton` remained), then reactivated and reworked
 *  here per a later explicit follow-up request.
 *
 *  Built with `React.forwardRef` and a `...rest` spread — same reasoning as
 *  `CompactCallControlButton`'s own doc comment just below gives for why
 *  that one needs it: this button has to compose correctly as either a
 *  `Popover`'s trigger child (Keypad/Volume both clone their own
 *  click/ref/aria-* props onto their immediate child via Radix's
 *  `asChild`/`Slot`) or a plain button with native attributes
 *  (`disabled` on Record) — a fixed named-prop list would silently drop
 *  whichever of those it didn't explicitly declare. `label` itself no
 *  longer needs to reach a `Tooltip` the way it used to (that's now this
 *  button's own always-visible text, not hover-only content), so unlike
 *  `CompactCallControlButton`, most call sites below no longer wrap this in
 *  one at all — see each call site's own comment for the one exception
 *  (Record, which still has genuinely EXTRA hover content beyond its
 *  label: why it's disabled). */
const WideCallControlButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: React.ReactNode;
    label: string;
    /** Tints icon+label the same blue "selected" treatment lyra-ui's own
     *  active states already use, once this control is toggled on (Hold/
     *  Mute/Mask/Record/Add video). Omit/`false` for the plain gray look. */
    active?: boolean;
    /** Hang Up doesn't use this component at all (see this file's own top
     *  doc comment for why it's excluded) — kept for parity with
     *  `CompactCallControlButton`'s own identical prop in case a future
     *  critical-styled control besides Hang Up ever needs this shape. */
    critical?: boolean;
    /** Same darker-at-rest treatment as `CompactCallControlButton`'s own
     *  `strong` prop — Mute/Add video pass this, matching the reference
     *  screenshot's visibly darker icons for that pair. */
    strong?: boolean;
    /** Same `ghost`/`outline` swap as `CompactCallControlButton`'s own
     *  `variant` prop — Mute/Add video pass `"outline"`, every other
     *  control keeps the default plain `ghost` look. */
    variant?: "ghost" | "outline";
  }
>(({ icon, label, active, critical, strong, variant = "ghost", className, ...rest }, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn(
        // Per explicit follow-up request/reference screenshot ("make the
        // voice controls larger"): `h-auto w-20` (unchanged from this
        // component's original wide-rendering sizing) plus `gap-1.5`/
        // `py-2` (was `gap-1`/`py-1.5`) for a bit more breathing room
        // around the now-larger icon (`h-5 w-5` at each call site below,
        // was `h-4 w-4` to match `CompactCallControlButton`'s icon-only
        // sizing) and the visible label text beneath it.
        "h-auto w-20 shrink-0 flex-col gap-1.5 rounded-lyra-sm px-1 py-2",
        critical
          ? "text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:text-lyra-status-critical-strong active:bg-lyra-status-critical-medium"
          : active
          ? "text-lyra-fg-active-strong bg-lyra-bg-active-subtle hover:text-lyra-fg-active-strong"
          : strong
          ? "text-lyra-fg-default hover:text-lyra-fg-default"
          : "text-lyra-fg-secondary hover:text-lyra-fg-default",
        className
      )}
      {...rest}
    >
      {icon}
      <span className="lyra-body-xs w-full truncate text-center">{label}</span>
    </Button>
  );
});
WideCallControlButton.displayName = "WideCallControlButton";

/** Plain icon-only button — the compact-rendering equivalent of
 *  `WideCallControlButton` above (see this file's own top doc comment for
 *  why there are two). `label` is still required, it's just surfaced via a
 *  `Tooltip` at the call site instead of rendered directly here (Keypad's
 *  call site wraps `Tooltip` around the whole `Popover` instead, per that
 *  render site's own comment, since Keypad also needs to be a `Popover`
 *  trigger).
 *
 *  Currently UNUSED — every call site below switched to the labeled
 *  `WideCallControlButton` per a later explicit follow-up request (see this
 *  file's own top doc comment). Left defined rather than deleted in case a
 *  genuinely narrow/icon-only rendering of this bar is ever wanted again.
 *
 *  Built with `React.forwardRef` and a `...rest` spread (rather than a
 *  fixed named-prop list) specifically so it composes correctly as either a
 *  `Tooltip`'s or a `Popover`'s trigger child: both clone extra props
 *  (event handlers, a `ref` for position measurement, `aria-*` state) onto
 *  their immediate child via Radix's `asChild`/`Slot` mechanism, which only
 *  reaches the real DOM `<button>` if this component actually forwards a
 *  `ref` and spreads through whatever it's handed — a plain, non-forwardRef
 *  function component only works for `onClick` because that name happens
 *  to already be a named prop; a hover-only prop like `onPointerEnter`
 *  (which `Tooltip` needs) would be silently dropped the same way a `ref`
 *  would. */
const CompactCallControlButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: React.ReactNode;
    active?: boolean;
    critical?: boolean;
    /**
     * Per explicit request ("make the mute and video icons darker"): swaps
     * this button's own DEFAULT (non-active, non-critical) resting color
     * from `fg-secondary` (60% opacity — this bar's usual resting-state
     * gray, still used by every other control here) to `fg-default` (80%
     * opacity) — the SAME token every one of these buttons already promotes
     * to on hover/focus (see the plain `else` branch below), just applied
     * at rest instead of only on interaction. Both are existing lyra-ui
     * neutral-text tiers (see lyra-tokens.css), not one-off colors, so this
     * stays inside the request's own "keep the same styling for lyra-ui"
     * instruction. Ignored once `active`/`critical` is true — those already
     * render in their own (even stronger) blue/red, so there's nothing left
     * for this to darken further. Mute and Video are the two call sites
     * that pass this below; every other control keeps the plain resting
     * `secondary` gray unchanged.
     */
    strong?: boolean;
    /**
     * Per explicit request ("make the mute / video buttons outline icon
     * buttons"): lets Mute/Video opt into `Button`'s real `"outline"`
     * variant (a bordered, `bg-lyra-bg-control` surface) instead of this
     * component's own default `"ghost"` (transparent until hover) — every
     * other control here (Hold/Mask/Record/Keypad/Transcript) omits this
     * and keeps the existing plain `ghost` look unchanged. The `active`/
     * `critical`/`strong` tint classes above are unaffected either way —
     * they already override `outline`'s own default `bg`/`text` tokens via
     * `cn()`'s tailwind-merge the same way they already override `ghost`'s.
     */
    variant?: "ghost" | "outline";
  }
>(({ icon, active, critical, strong, variant = "ghost", className, ...rest }, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      aria-pressed={critical ? undefined : active}
      className={cn(
        "h-8 w-8 shrink-0 rounded-lyra-sm",
        critical
          ? "text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:text-lyra-status-critical-strong active:bg-lyra-status-critical-medium"
          : active
          ? "text-lyra-fg-active-strong bg-lyra-bg-active-subtle hover:text-lyra-fg-active-strong"
          : strong
          ? "text-lyra-fg-default hover:text-lyra-fg-default"
          : "text-lyra-fg-secondary hover:text-lyra-fg-default",
        className
      )}
      {...rest}
    >
      {icon}
    </Button>
  );
});
CompactCallControlButton.displayName = "CompactCallControlButton";

/** Plain 3x4 dialpad — Keypad's own popover body, shared by both the wide
 *  and compact renderings. Each digit press just appends to this popover's
 *  own local display (no real DTMF tone/signal to send in this prototype);
 *  `Clear` resets it. Closes on outside click/Escape like any other plain,
 *  uncontrolled `Popover`. */
function DialPad() {
  const [digits, setDigits] = useState("");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
  return (
    <div className="flex flex-col gap-3 p-3 w-[220px]">
      <div className="lyra-body-md-emphasis text-lyra-fg-default text-center min-h-[24px] tracking-wider">
        {digits || <span className="text-lyra-fg-secondary">Enter digits</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-10 w-full lyra-body-md-emphasis"
            onClick={() => setDigits((d) => d + key)}
          >
            {key}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setDigits("")} disabled={!digits}>
        Clear
      </Button>
    </div>
  );
}

/** The collapsed volume trigger — compact rendering only (see this file's
 *  own top doc comment for why the wide rendering keeps its own separate
 *  icon instead). A single icon button (the live volume glyph, same
 *  `Volume2`/`VolumeX` swap the wide trigger uses) opens a small popover
 *  holding just the volume slider.
 *
 *  Per explicit follow-up request ("take the transcript button out of the
 *  volume dropdown and put it to the left of the volume button"): this used
 *  to also fold a "Show/Hide transcript" row into this same popover
 *  (`CompactVolumeAndTranscriptButton`, see this file's own git history) —
 *  transcript is back to being its own separate `WideCallControlButton`
 *  (was `CompactCallControlButton` — see this file's own top doc comment
 *  for that later rename-in-place) at this component's own call site
 *  instead, so this trigger is volume-only again.
 *
 *  `volume`/`onVolumeChange` are lifted to the OUTER `VoiceCallControls`
 *  component rather than local state here — see this file's own top doc
 *  comment for why (the value has to survive a resize back across the
 *  breakpoint into the wide rendering's own separate volume trigger). */
function CompactVolumeButton({
  volume,
  onVolumeChange,
}: {
  volume: number;
  onVolumeChange: (volume: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    // No more wrapping `Tooltip` — per later explicit follow-up request
    // ("label the buttons again"), the trigger below is now a labeled
    // `WideCallControlButton` (visible "Volume" text) rather than the old
    // hand-rolled icon-only `<button>` a hover `Tooltip` used to be the
    // only way to name, so there's nothing left for a tooltip to add here.
    // `Popover`'s trigger still clones its own click/ref/aria props onto
    // its immediate child via Radix's `asChild`/`Slot` mechanism — that's
    // exactly what `WideCallControlButton`'s own `forwardRef`+`...rest`
    // are for (see that component's own doc comment).
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="top"
      content={
        <div className="flex items-center gap-2 p-3 w-[200px]">
          <button
            type="button"
            onClick={() => onVolumeChange(volume === 0 ? 70 : 0)}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            className="shrink-0 text-lyra-fg-secondary hover:text-lyra-fg-default"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          <Slider
            value={volume}
            onChange={onVolumeChange}
            min={0}
            max={100}
            step={1}
            showTicks={false}
            label="Call volume"
            className="flex-1 min-w-0 [&>label]:sr-only"
          />
        </div>
      }
    >
      <WideCallControlButton
        icon={
          volume === 0 ? (
            <VolumeX className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Volume2 className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          )
        }
        label="Volume"
        active={open}
        aria-label="Volume"
        aria-pressed={open}
      />
    </Popover>
  );
}

export interface VoiceCallControlsProps {
  /** Ends the call — the caller closes this channel (same as picking
   *  "Closed" from the status popover). The only real, non-decorative
   *  action in this whole bar — see this file's own top doc comment. */
  onHangUp: () => void;
  /** Seconds since this call started (`clockTick - Thread.startTick`, same
   *  tick source every other timer in this app reads off) — rendered as a
   *  running "MM:SS" (`formatElapsedTime`, same format/helper
   *  `InteractionNavItem`'s own per-channel elapsed timer uses) above the
   *  768px breakpoint, or a plain clock glyph with the same duration on a
   *  `Tooltip` below it — see this file's own top doc comment. Optional so
   *  an existing caller that hasn't wired this through yet still renders
   *  (just without the timer) instead of crashing. */
  elapsedSeconds?: number;
  /** Same shared toast surface every other mock/placeholder control in
   *  this app already fires through (`agent-next-gen-customer-info-
   *  panel.tsx`'s own `onAddToast`, etc.) — omit to silently no-op instead
   *  of throwing on a caller that hasn't wired toasts through yet.
   *  Per explicit follow-up request ("don't fire tooltips on the normal
   *  call controls they are annoying"), nothing in this component actually
   *  calls this anymore — every control that used to (Hold, Mask, Record,
   *  the decorative Add-video fallback; see each one's own `onClick` doc
   *  comment) had its toast dropped. Left declared/accepted rather than
   *  removed outright, since every existing caller already wires it
   *  through (`onAddToast={addToast}`) for no harm done, and it's a small,
   *  ready-made hook back in if some future control here ever genuinely
   *  needs one. */
  onAddToast?: (toast: Omit<ToastItem, "id">) => void;
  /**
   * Opens/closes the call transcript `InteriorPanel` the caller renders
   * alongside the transcript/composer column (see each tier page's own
   * "Voice call controls" render site) — this bar has no panel of its own
   * to show, it just tells the caller to toggle theirs, same "this
   * component doesn't own interaction-level state" split every other real
   * (non-decorative) callback here already follows. Its own separate icon
   * both above AND below the 768px breakpoint (see `CompactVolumeButton`'s
   * own doc comment for why this is no longer folded into that trigger).
   * Omit to hide the transcript trigger entirely, e.g. for a caller that
   * hasn't wired a panel through yet.
   */
  onToggleTranscript?: () => void;
  /** Whether the caller's transcript panel is currently open — tints
   *  whichever transcript trigger is currently showing (wide or compact)
   *  the same active blue every other toggled-on control in this bar
   *  (Hold/Mute/Mask/Record) already uses. */
  transcriptOpen?: boolean;
  /**
   * Opens/closes the small draggable video window (a `DraggablePanel`) the
   * caller renders elsewhere in the page — replaces this button's old
   * decorative-only "toggle local icon + toast" behavior with a real
   * window when wired. Omit to keep that old decorative fallback (still
   * toggles the icon and fires a toast, same as every other placeholder
   * control here) for a caller that hasn't wired a video window through
   * yet.
   */
  onToggleVideo?: () => void;
  /** Whether the caller's floating video window is currently open — only
   *  read when `onToggleVideo` is provided (otherwise this button tracks
   *  its own local decorative state instead, see `onToggleVideo`'s own
   *  doc comment). */
  videoOpen?: boolean;
  /** Whether this call is currently on hold — controlled from the caller
   *  once `onHoldChange` is wired, same "read the caller's real state once
   *  wired, else track local decorative state" split `videoOpen`/
   *  `onToggleVideo` above already establishes. Per explicit request
   *  ("putting an active call on hold from the call controls should ...
   *  add an on hold chip to the interactionNavItem"): unlike every other
   *  decorative toggle in this bar (Mute/Mask/Record), Hold now needs to
   *  survive this whole bar unmounting/remounting (it only renders for
   *  whichever interaction is currently ACTIVE — see each page's own
   *  `activeInteractionVoiceThread` render site) — a plain local `useState`
   *  can't do that on its own, so the caller lifts it onto the underlying
   *  `Thread` instead. Ignored (this button falls back to its own old local
   *  state) while `onHoldChange` is omitted. */
  onHold?: boolean;
  /** Fired with the NEW hold state whenever the Hold/Resume button is
   *  pressed. Only takes effect (makes `onHold` above controlled) when
   *  provided — omit to leave this button exactly as before (a purely
   *  local, decorative toggle with no effect outside this component). */
  onHoldChange?: (onHold: boolean) => void;
  /** Per explicit request (Agent Workspace 2.0 Phase 1 only): hides the
   *  "Add video" button entirely. This bar's own divider just before it
   *  stays either way — it still separates the call-feature cluster from
   *  Hang Up whether or not "Add video" sits between them (see that
   *  divider's own comment). Defaults `true`; every other tier/call site
   *  keeps the button exactly as before. */
  showAddVideo?: boolean;
  /**
   * No longer used — this bar dropped its wide/compact/stretch responsive
   * toggle entirely (see this file's own top doc comment: "just take the
   * existing compact version — stretch it the full width of the container
   * and remove media queries"), so there's only one rendering left and
   * nothing for this prop to switch between anymore. Kept, accepted, and
   * ignored purely so Phase 1/Phase 2's existing call sites (the only two
   * that ever passed it) don't need their own JSX touched.
   */
  stretch?: boolean;
  /** Customer's display name, phone number, or email — shown as a small
   *  identity line above the elapsed-call timer in this bar's leading slot,
   *  next to a small avatar chip, per explicit request/reference screenshot
   *  ("add the customer avatar. Add the name / number/email above the
   *  timer"). Pass whichever identifier the caller already resolved for
   *  this call (a real name when known, else the raw number/email a
   *  `Thread`'s own value holds — see this repo's `Interaction.id` doc
   *  comment for the `quickdial:<number>` id pattern used when no contact
   *  record matches a dialed number). Omit entirely to render neither the
   *  avatar nor this line — same "renders fine without it" fallback every
   *  other optional prop here already follows (see `elapsedSeconds`'s own
   *  doc comment) — for a caller that hasn't wired customer identity
   *  through yet. */
  customerLabel?: string;
  /** Initials to show inside the avatar chip instead of the generic
   *  fallback glyph, once the caller has a real contact match (the same
   *  initials a caller would derive the same way `interaction-nav-item.tsx`
   *  's own avatar already does via `getInitials`). Only meaningful while
   *  `customerLabel` is also set — without a real contact match this avatar
   *  instead shows a plain white `Plus` glyph, per the reference
   *  screenshot's unmatched-quickdial-number case (see this file's own top
   *  doc comment). */
  customerInitials?: string;
  className?: string;
}

export function VoiceCallControls({
  onHangUp,
  elapsedSeconds,
  onAddToast,
  onToggleTranscript,
  transcriptOpen,
  onToggleVideo,
  videoOpen,
  onHold: onHoldControlled,
  onHoldChange,
  showAddVideo = true,
  stretch = false,
  customerLabel,
  customerInitials,
  className,
}: VoiceCallControlsProps) {
  // Decorative-only fallback for a caller that hasn't wired `onHoldChange`
  // through yet — see that prop's own doc comment (same `localVideoAdded`/
  // `onToggleVideo` split just below).
  const [localOnHold, setLocalOnHold] = useState(false);
  const onHold = onHoldChange ? !!onHoldControlled : localOnHold;
  const setOnHold = onHoldChange ?? setLocalOnHold;
  const [muted, setMuted] = useState(false);
  const [masked, setMasked] = useState(false);
  const [recording, setRecording] = useState(false);
  // Decorative-only fallback for a caller that hasn't wired a real video
  // window through `onToggleVideo` yet — see that prop's own doc comment.
  const [localVideoAdded, setLocalVideoAdded] = useState(false);
  const videoAdded = onToggleVideo ? !!videoOpen : localVideoAdded;
  const [keypadOpen, setKeypadOpen] = useState(false);
  // Volume slider — purely local/decorative, same "no real telephony
  // backing this" convention as Hold/Mute/Mask/Record (see this file's own
  // top doc comment).
  const [volume, setVolume] = useState(70);
  const [volumeOpen, setVolumeOpen] = useState(false);

  return (
    // Per explicit request/reference screenshot: this bar floats as its own
    // bordered, rounded, shadowed white card rather than an edge-to-edge
    // strip — this OUTER div is a static (no conditional className of its
    // own) full-bleed wrapper that just supplies the horizontal inset the
    // card floats within and stays `shrink-0` in the composer/
    // `VoiceCallControls`-bar flex slot exactly as this whole component
    // already did. `className` (this component's own prop) lands here
    // rather than on the card below — no caller passes it today, but this
    // is the more useful target for a future one (positioning/spacing
    // overrides for the whole bar's slot, not the card's own look).
    // `w-full` explicit here (not just relied on as this flex item's own
    // implicit cross-axis stretch from a `flex-col` ancestor) — per an
    // explicit follow-up bug report/screenshot ("it's not full width")
    // after the compact-card-stretch fix above: `shrink-0` alone left this
    // wrapper's own WIDTH sized to content in practice once Phase 1/Phase
    // 2 pass their own `className="px-0 py-0 bg-transparent"` override
    // here (neutralizing this div's padding/background so the CALLER's own
    // wrapping row supplies those instead) — same "don't lean on ambient
    // stretch actually being definite" fix as `SidePanel`'s own `h-full`
    // doc comment (side-panel.tsx) describes for its pinned branch.
    <div className={cn("w-full shrink-0 bg-lyra-bg-surface-base px-6 py-3", className)}>
      {/* This card used to be one of three branches (wide two-row centered
          card / compact icon-only row / `stretch` single-row wide) picked
          by `stretch`+`isCompact` — see this file's own top doc comment
          ("just take the existing compact version — stretch it the full
          width of the container and remove media queries"). What's left is
          just the former COMPACT rendering's own look, made to fill its
          container instead of sizing to its own content: `w-full`, no
          `max-w`/`mx-auto` cap (those centered/capped this card within the
          outer full-bleed wrapper above — no longer wanted now that this is
          the only rendering), same flat 8px radius / tight padding /
          no-shadow treatment the compact branch always had. */}
      <div
        className={cn(
          // `bg-lyra-bg-surface-container-subtle` — per explicit request
          // ("make the background of the call controls the neutral
          // color"): was `bg-lyra-bg-surface-overlay` (a prior explicit
          // request to stand out from the page in dark mode — see this
          // file's own git history for that reasoning). `surface-
          // container-subtle` is this design system's actual "neutral"
          // surface token — the same one `Icon`'s own `background="neutral"`
          // variant maps to (icon.tsx) and the same one `SidePanel` uses
          // for its own panel surface (side-panel.tsx) — a plain neutral
          // gray container (`#fbfcfe` light / `#262626` dark) rather than
          // the lighter, "stands out" white/near-white treatment
          // `surface-overlay` gave it.
          "border border-lyra-border-subtle bg-lyra-bg-surface-container-subtle",
          // `px-3 py-2` (was `px-2 py-1`) — per later explicit follow-up
          // request/reference screenshot ("make the voice controls
          // larger"): a little more breathing room around the now-taller
          // icon+label `WideCallControlButton`s (each roughly h-16 now,
          // was h-8) so they don't sit flush against this card's own
          // border.
          "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2"
        )}
      >
        {/* Three real flex slots now (timer / main buttons+volume / dark
            mute+video+End Call), replacing the former two-slot layout — per
            explicit request/reference screenshot ("update the call control
            button order to be like the attached screenshot"). The
            screenshot's own left-to-right shape is: a timer alone at the
            far left with a large gap after it, a centered cluster of
            lighter/decorative controls, a divider, a visibly DARKER
            mute+video pair, then a large red "End Call" button anchored to
            the far right. `justify-between` on this row still does the
            bookending work (leading/trailing slots `shrink-0`, middle slot
            `flex-1`+`justify-center` claims whatever space is left and
            centers its own contents within it) — same mechanism the old
            two-slot layout already used, just with a third slot added and
            the controls redistributed among all three. */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Avatar chip + identity line — added per explicit request/
              reference screenshot ("add the customer avatar. Add the name /
              number/email above the timer"). Only renders while the caller
              has passed `customerLabel` through (see that prop's own doc
              comment) — same "omit to render nothing extra" fallback the
              rest of this bar's optional props already follow, so an
              existing caller that hasn't wired customer identity through
              yet is unaffected. Purple background reuses this app's own
              existing "Voice channel = purple" accent convention (see this
              file's own top doc comment); the fallback glyph is explicitly
              `text-white` per a follow-up clarification ("keep it white
              though not black") rather than this design system's default
              (dark) icon color. */}
          {customerLabel && (
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lyra-accent-purple-strong"
            >
              {customerInitials ? (
                <span className="lyra-label-sm text-white">{customerInitials}</span>
              ) : (
                <Plus className="h-4 w-4 text-white" strokeWidth={2} />
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-col justify-center">
            {customerLabel && (
              <span className="lyra-body-sm truncate text-lyra-fg-primary">{customerLabel}</span>
            )}
            {/* Timer — moved here from its old trailing position (see this
              bar's own git history: "move the timer to the far right after
              volume") per the reference screenshot, which shows the
              timer/status leading the WHOLE bar on the far left instead.
              Digits/width behavior unchanged (see the comment that used to
              sit here for the "why" of the fixed `w-[34px]` digit width and
              `tabular-nums`) — only its position moved, and its own
              trailing divider is dropped since it's now alone in the
              leftmost slot with nothing to its left to separate from.
              Per explicit follow-up request ("when record is enabled make
              the clock icon on the left of the timer a red badge"): the
              leading glyph now swaps from the plain `Clock` outline to a
              solid red `Circle` — the SAME icon+fill/text color pair
              (`fill-lyra-status-critical-strong text-lyra-status-critical-
              strong`) the Record button below already uses for its own
              filled/active state, so this reuses an existing "recording"
              treatment instead of inventing a new badge style — whenever
              `recording` is on, reverting to the plain clock the instant
              recording stops. Per an explicit follow-up request ("make the
              red dot next to the timer pulse or animate when recording"):
              `animate-pulse` (Tailwind's own built-in fade in/out keyframe,
              already relied on elsewhere in this app for "something's
              live" affordances) is added here so the dot itself breathes
              while recording, on top of its plain solid-red look — the
              Record button's own filled-red `Circle` (just below, in the
              decorative cluster) intentionally keeps its plain static fill:
              this pulsing is specific to the badge this request named, not
              a blanket "recording" treatment applied everywhere red shows
              up in this bar. */}
          {elapsedSeconds !== undefined && (
            <span
              className="flex items-center gap-1 lyra-body-sm text-lyra-fg-secondary"
              aria-label={`Call duration ${formatElapsedTime(elapsedSeconds)}`}
            >
              {recording ? (
                <Circle
                  className="h-4 w-4 shrink-0 fill-lyra-status-critical-strong text-lyra-status-critical-strong animate-pulse"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ) : (
                <Clock className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              )}
              <span className="w-[34px] shrink-0 text-right tabular-nums">{formatElapsedTime(elapsedSeconds)}</span>
            </span>
          )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-stretch justify-center gap-1">
          {/* Decorative cluster — Hold/Mask/Record/Keypad/Transcript/Volume,
              unchanged in behavior/styling from before, just relocated out
              of the old leading `justify-start` slot into this slot
              (originally `justify-center`, then briefly `justify-end` per
              an explicit follow-up request — "move the middle buttons to
              the right" — so this cluster sat flush against the divider/
              dark-cluster/End Call group that follows it). Per a LATER
              explicit follow-up request/reference screenshot ("center the
              hold through volume buttons when the call controls expand and
              add separators to the left and right around these buttons"):
              back to `justify-center` — so this cluster centers within
              whatever open space the leading/trailing `shrink-0` slots
              leave it once this bar is wider than its own contents need —
              now bracketed by its own leading/trailing dividers (the first
              child below, and the one right after `CompactVolumeButton`
              further down) instead of relying on the trailing dark
              cluster's divider to read as this group's right edge. Those
              two dividers are deliberately INSIDE this centered flex item
              (not floated at the leading/trailing slot boundaries) so they
              travel with the cluster as it centers, staying flush against
              Hold/Volume at any container width rather than drifting away
              from them into the open space `justify-center` creates on
              either side. `items-stretch` (was `items-center`) is what lets
              those two divider `span`s reach this row's full height via
              their own `self-center`, same reasoning as the trailing dark
              cluster's own divider (see that slot's own comment) — every
              `WideCallControlButton` here is already `h-auto`/content-sized
              regardless of the row's own `align-items`, so this doesn't
              change their height. Mute itself is still OUT of this cluster,
              in the trailing dark group below — see that slot's own
              comment for why. */}
          {/* Left separator — see this slot's own doc comment just above
              for why it lives here (inside the centered flex item) rather
              than at the slot boundary. */}
          <span aria-hidden="true" className="h-4 w-px shrink-0 self-center bg-lyra-border-subtle" />
          {/* No more wrapping `Tooltip` on this or the next several
              controls — per later explicit follow-up request ("label the
              buttons again"), `WideCallControlButton`'s own label is now
              always-visible text, so a hover-only tooltip repeating the
              same word would be pure redundancy. The one exception is
              Record just below, which still wraps a `Tooltip` — its hover
              content is genuinely EXTRA information ("why is this
              disabled") beyond what a two-word label can hold. */}
          <WideCallControlButton
            icon={onHold ? <Play className="h-5 w-5" strokeWidth={1.5} /> : <Pause className="h-5 w-5" strokeWidth={1.5} />}
            label={onHold ? "Resume" : "Hold"}
            active={onHold}
            // Per explicit request ("putting an active call on hold from
            // the call controls should turn the on hold button warning
            // color"): overrides `active`'s own default blue tint
            // (`WideCallControlButton`'s shared "active" look, still used
            // unchanged by every other toggle in this bar) with the same
            // warning amber `OnHoldPill` itself uses (`OnHoldBadge.tsx`) —
            // this button and that chip now read as the same "on hold"
            // state/color, not two different ones. `cn()`'s tailwind-merge
            // (this component's own `className` prop, applied last) lets
            // these win over `active`'s classes without needing a new prop
            // on the shared button component.
            className={
              onHold
                ? "text-lyra-status-warning-strong bg-lyra-status-warning-subtle hover:text-lyra-status-warning-strong"
                : undefined
            }
            // Per explicit follow-up request ("don't fire tooltips on the
            // normal call controls they are annoying" — the reference
            // screenshot showed this exact "Call on hold" toast, plus
            // "Voice masking on" below, stacked on top of the bar): this
            // used to also fire an `onAddToast` info toast on every toggle
            // — dropped, here and on every other control in this bar that
            // did the same (Mask/Record/the decorative Add-video fallback,
            // below), in favor of the button's own `active` state (the
            // warning-amber tint just above, the pressed/filled icon) being
            // the only feedback — same "the control itself is the
            // confirmation, no separate toast needed" reasoning most of
            // this bar's OTHER toggles (Mute, Keypad, Transcript, Volume,
            // End Call) never fired one for in the first place.
            onClick={() => {
              const next = !onHold;
              setOnHold(next);
            }}
          />
          <WideCallControlButton
            // Per explicit request ("use audio lines and audio lines off
            // for the masking icon"): swaps between `AudioLines`/
            // `AudioLinesOff` on `masked`, mirroring the existing
            // `Mic`/`MicOff` toggle just below (`muted ? MicOff : Mic`) —
            // the slashed icon shows while the effect (masking the real
            // voice signal) is actively engaged. Requires
            // lucide-react >=1.33.0 (bumped in package.json), the first
            // published version that includes `AudioLinesOff` — it does
            // not exist in the 0.468.0 that was previously pinned.
            icon={
              masked ? (
                <AudioLinesOff className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <AudioLines className="h-5 w-5" strokeWidth={1.5} />
              )
            }
            label="Mask"
            active={masked}
            onClick={() => {
              const next = !masked;
              setMasked(next);
              // Per explicit request ("when voice masking is on
              // recording must turn off and become disabled"): masking
              // the real voice signal and recording it are mutually
              // exclusive, so turning masking ON forces any in-progress
              // recording off — the Record button itself is disabled
              // just below for as long as masking stays on, so there's
              // no way to start a new one until masking is turned back
              // off.
              if (next && recording) {
                setRecording(false);
              }
              // Per explicit follow-up request ("don't fire tooltips on
              // the normal call controls they are annoying") — see the
              // Hold button's own `onClick` doc comment just above for the
              // full "why"; this button used to fire two, "Voice masking
              // on"/"off" plus a second "Recording stopped" whenever
              // masking forced an in-progress recording off — both gone
              // now, same reasoning.
            }}
          />
          <Tooltip
            // `disabled={!masked}` — the tooltip's `content` is only ever
            // NEEDED while masked (the label alone already says "Record"/
            // "Stop" the rest of the time, so a tooltip repeating that
            // would be the same redundancy every other control's dropped
            // tooltip above avoided); while masked, it's the one place
            // that still explains WHY this button is greyed out, which
            // the two-word disabled label on its own can't convey.
            content="Recording disabled while masking is on"
            placement="top"
            disabled={!masked}
          >
            <WideCallControlButton
              icon={
                <Circle
                  className={cn("h-5 w-5", recording && "fill-lyra-status-critical-strong text-lyra-status-critical-strong")}
                  strokeWidth={1.5}
                />
              }
              label={recording ? "Stop" : "Record"}
              active={recording}
              // See the Mask button's own `onClick` doc comment just above
              // for the full "why" — masking and recording can't both be
              // on, so this stays disabled (and un-clickable) for as long
              // as `masked` is true.
              disabled={masked}
              // Per explicit follow-up request ("don't fire tooltips on
              // the normal call controls they are annoying") — see the
              // Hold button's own `onClick` doc comment above for the full
              // "why"; this used to fire "Recording started"/"stopped" on
              // every toggle too.
              onClick={() => {
                const next = !recording;
                setRecording(next);
              }}
            />
          </Tooltip>
          {/* Keypad — no more wrapping `Tooltip` (see the block comment a
              few controls up for why) — `Popover`'s own Radix trigger
              still clones its click/ref/aria props straight onto its
              immediate child, which is exactly what `WideCallControlButton`
              being `forwardRef`+`...rest` is for (see that component's own
              doc comment). `aria-label` set directly on it (flows through
              its own `...rest` spread) is now redundant with its own
              visible label text, but harmless to leave. */}
          <Popover
            open={keypadOpen}
            onOpenChange={setKeypadOpen}
            placement="top"
            bodyPadding={false}
            content={<DialPad />}
          >
            <WideCallControlButton
              icon={<Grid3x3 className="h-5 w-5" strokeWidth={1.5} />}
              label="Keypad"
              active={keypadOpen}
              aria-label="Keypad"
            />
          </Popover>
          {/* Transcript — per an earlier explicit follow-up request ("take
              the transcript button out of the volume dropdown and put it to
              the left of the volume button"): its own plain
              `WideCallControlButton`, same as every other control in this
              centered cluster. Static "Transcript" label regardless of
              `transcriptOpen` (same convention Mask already uses — a
              static label, with `active` tinting alone signaling on/off —
              "Show transcript"/"Hide transcript" was fine as hover-only
              `Tooltip` content, but doesn't fit this button's fixed 80px
              column as a permanently-visible label without wrapping or
              truncating). `onToggleTranscript` omitted entirely still
              hides this trigger. */}
          {onToggleTranscript && (
            <WideCallControlButton
              icon={<FileText className="h-5 w-5" strokeWidth={1.5} />}
              label="Transcript"
              active={transcriptOpen}
              onClick={onToggleTranscript}
            />
          )}
          <CompactVolumeButton volume={volume} onVolumeChange={setVolume} />
          {/* Right separator — see the leading one's own doc comment
              (this slot's opening `<div>`, above) for why this lives here,
              right after `CompactVolumeButton`, rather than at this slot's
              trailing boundary. */}
          <span aria-hidden="true" className="h-4 w-px shrink-0 self-center bg-lyra-border-subtle" />
        </div>
        <div className="flex shrink-0 items-stretch gap-2">
          {/* Mute — moved out of the centered cluster above and given
              `strong` (see `WideCallControlButton`'s own doc comment for
              what that darkens) per the reference screenshot, which shows
              this icon visibly darker than the rest of the bar. Behavior
              unchanged; no more wrapping `Tooltip` (see the block comment
              a few controls up for why). */}
          <WideCallControlButton
            icon={muted ? <MicOff className="h-5 w-5" strokeWidth={1.5} /> : <Mic className="h-5 w-5" strokeWidth={1.5} />}
            label={muted ? "Unmute" : "Mute"}
            active={muted}
            strong
            // Per explicit request ("make the mute / video buttons
            // outline icon buttons") — see `WideCallControlButton`'s own
            // `variant` doc comment.
            variant="outline"
            onClick={() => setMuted((m) => !m)}
          />
          {/* Add video — same `strong` darkening as Mute per the reference
              screenshot (only visible in practice where `showAddVideo` is
              true, i.e. Phase 2 — Phase 1 hides this button entirely, see
              `showAddVideo`'s own doc comment above).
              Per an explicit bug report ("the video button state is
              backwards - a line through it indicates no video"): the
              icon swap here had the slashed/plain `VideoOff`/`Video` pair
              inverted relative to every other toggle in this bar (compare
              Mute just above: the SLASHED `MicOff` shows when muted is
              OFF-state, the plain `Mic` when it's on) — this button was
              instead showing the slashed `VideoOff` glyph while video WAS
              added (the on-state) and the plain camera while it wasn't.
              Swapped so slashed = off (no video), plain = on (video added),
              matching Mute's own convention; `active`/label/click behavior
              below are unchanged, only which icon renders for which state,
              and (per the same "label the buttons again" request as every
              other control here) a visible label instead of a hover-only
              `Tooltip`. */}
          {showAddVideo && (
            <WideCallControlButton
              icon={videoAdded ? <Video className="h-5 w-5" strokeWidth={1.5} /> : <VideoOff className="h-5 w-5" strokeWidth={1.5} />}
              label={videoAdded ? "Remove video" : "Add video"}
              active={videoAdded}
              strong
              // Per explicit request ("make the mute / video buttons
              // outline icon buttons") — see `WideCallControlButton`'s own
              // `variant` doc comment.
              variant="outline"
              onClick={() => {
                // Real window when wired; decorative local fallback
                // otherwise — see `onToggleVideo`'s own doc comment above.
                if (onToggleVideo) {
                  onToggleVideo();
                  return;
                }
                // Per explicit follow-up request ("don't fire tooltips on
                // the normal call controls they are annoying") — see the
                // Hold button's own `onClick` doc comment above for the
                // full "why"; this decorative fallback used to fire "Video
                // added to call"/"removed" too.
                const next = !localVideoAdded;
                setLocalVideoAdded(next);
              }}
            />
          )}
          {/* End Call — per explicit request ("make the leave button big
              and red and have it say 'end call'"): this used to be a plain
              icon-only `CompactCallControlButton` with `critical` styling
              (a small red PhoneOff glyph, label only reachable via
              `Tooltip`) same as every other control in this bar. It's now a
              real lyra-ui `Button` instead — `variant="destructive"` is
              this design system's own solid-red/filled treatment (see
              button.tsx: `bg-lyra-bg-destructive` + `text-lyra-fg-on-
              primary`, the same token pair every other destructive action
              in this app already uses). Label is now always-visible text
              ("End Call") next to the icon instead of hidden behind a hover
              `Tooltip`, so no `Tooltip` wrapper here anymore — a `Button`
              with visible text content already has its own accessible
              name. Size was originally `lg` (h-9) to read as "big" against
              the surrounding h-8 icon buttons; per an explicit follow-up
              request ("make the red button smaller") this became `default`
              (h-8) instead, matching the row's own then-h-8 icon buttons
              exactly. Bumped back to `lg` (h-9) here per a later explicit
              follow-up request/reference screenshot ("make the voice
              controls larger... keep the End Call button filled red") —
              every OTHER control in this bar just grew from a flat h-8
              icon-only button to a taller icon+label column
              (`WideCallControlButton`, `h-auto` with `py-2` — roughly h-16
              in practice), so `default` would now read as visibly SMALLER
              than its neighbors instead of matching them. Still
              `variant="destructive"` (filled red, unchanged) and still its
              own real `Button` with a visible label — only the size moved,
              exactly as asked.
              Per a later explicit follow-up request ("make the end call
              button the same height as the mute and add video buttons"):
              `size="lg"`'s own fixed `h-9` is overridden here to `h-auto`
              (via `cn()`'s tailwind-merge, same "last one wins" mechanism
              `wrap`'s own doc comment in button.tsx describes) so this
              button no longer sits at a fixed height while its neighbors
              have grown taller — instead it now stretches to match
              whichever of Mute/Add video is tallest, via this row's own
              `items-stretch` (see the divider's own comment just above for
              why it needed an explicit `self-center` once the row stopped
              using `items-center`). `size="lg"` is still passed for its
              padding/typography, just no longer for its height. */}
          <Button variant="destructive" size="lg" className="h-auto shrink-0 gap-1.5" onClick={onHangUp}>
            <PhoneOff className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            End Call
          </Button>
        </div>
      </div>
    </div>
  );
}
