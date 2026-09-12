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
// card below, no `max-w`/`mx-auto` cap) instead of only kicking in below a
// measured breakpoint. Below, every main control still drops its visible
// label for a hover/focus `Tooltip` (`CompactCallControlButton`), the timer
// still shows its "MM:SS" digits next to a Clock icon, and Volume/Transcript
// still trail in their own leading/trailing flex slots — none of that
// content changed, only the "which rendering, and how wide" logic around it.
// `stretch` stays as an accepted prop (default `false`) purely so Phase 1/
// Phase 2's existing call sites don't need to change their JSX — it no
// longer affects anything rendered here.
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
  VenetianMask,
  Circle,
  Grid3x3,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Volume2,
  VolumeX,
  FileText,
} from "lucide-react";
import { formatElapsedTime } from "@/components/agent-next-gen-shared-utils";

/** One column: icon on top, small label underneath — the shape every main
 *  control in this bar shares above the 768px breakpoint (see this file's
 *  own top doc comment), active/critical coloring aside. Used ONLY by the
 *  wide rendering; below the breakpoint, `CompactCallControlButton` (below)
 *  takes over instead. */
function WideCallControlButton({
  icon,
  label,
  active,
  critical,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  /** Tints icon+label the same blue "selected" treatment lyra-ui's own
   *  active states already use, once this control is toggled on (Hold/
   *  Mute/Mask/Record/Add video). Omit/`false` for the plain gray look. */
  active?: boolean;
  /** Hang Up only — red critical treatment instead of the plain gray/blue
   *  toggle colors every other control here uses. */
  critical?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto w-20 shrink-0 flex-col gap-1 rounded-lyra-sm px-1 py-1.5",
        critical
          ? "text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:text-lyra-status-critical-strong active:bg-lyra-status-critical-medium"
          : active
          ? "text-lyra-fg-active-strong hover:text-lyra-fg-active-strong"
          : "text-lyra-fg-secondary hover:text-lyra-fg-default"
      )}
    >
      {icon}
      <span className="lyra-body-xs w-full truncate text-center">{label}</span>
    </Button>
  );
}

/** Plain icon-only button — the compact-rendering equivalent of
 *  `WideCallControlButton` above (see this file's own top doc comment for
 *  why there are two). `label` is still required, it's just surfaced via a
 *  `Tooltip` at the call site instead of rendered directly here (Keypad's
 *  call site wraps `Tooltip` around the whole `Popover` instead, per that
 *  render site's own comment, since Keypad also needs to be a `Popover`
 *  trigger).
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
  }
>(({ icon, active, critical, className, ...rest }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-pressed={critical ? undefined : active}
      className={cn(
        "h-8 w-8 shrink-0 rounded-lyra-sm",
        critical
          ? "text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:text-lyra-status-critical-strong active:bg-lyra-status-critical-medium"
          : active
          ? "text-lyra-fg-active-strong bg-lyra-bg-active-subtle hover:text-lyra-fg-active-strong"
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
 *  transcript is back to being its own separate `CompactCallControlButton`
 *  at this component's own call site instead, same as the wide rendering
 *  already keeps it, so this trigger is volume-only again.
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
    // `Tooltip` has to wrap `Popover` from the OUTSIDE, not the other way
    // around — `Popover`'s trigger clones its own click/ref/aria props onto
    // its immediate child via Radix's `asChild`/`Slot` mechanism, and
    // `Tooltip` doesn't forward arbitrary props through to a DOM node, so it
    // can't sit as that immediate child. Same established composition
    // create-new.tsx's own collapsed trigger uses (see that component's own
    // "Tooltip has to wrap Popover from the outside" comment). `disabled`
    // while the popover itself is open — without that, this tooltip would
    // sit visibly on top of the open popover the instant the pointer
    // lingered over the trigger that opened it.
    <Tooltip content="Volume" placement="top" disabled={open}>
      <span className="inline-flex">
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
          <button
            type="button"
            aria-label="Volume"
            aria-pressed={open}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lyra-sm transition-colors",
              open
                ? "text-lyra-fg-active-strong bg-lyra-bg-active-subtle"
                : "text-lyra-fg-secondary hover:text-lyra-fg-default hover:bg-lyra-state-hover"
            )}
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </Popover>
      </span>
    </Tooltip>
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
   *  of throwing on a caller that hasn't wired toasts through yet. */
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
  showAddVideo = true,
  stretch = false,
  className,
}: VoiceCallControlsProps) {
  const [onHold, setOnHold] = useState(false);
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
    <div className={cn("shrink-0 bg-lyra-bg-surface-base px-6 py-3", className)}>
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
          // `bg-lyra-bg-surface-overlay` — per explicit request ("use the
          // same white background on the call controls as the interior
          // panel so it stands out more in dark mode"), matching
          // `InteriorPanel`'s own root background (interior-panel.tsx,
          // lyra-ui). Was `bg-lyra-bg-surface-base`, the same token the
          // surrounding dark-mode page background itself uses
          // (`--lyra-color-bg-surface-base: #1f1f1e`), which is why this bar
          // visually disappeared into the page in dark mode; `surface-
          // overlay` is a lighter, deliberately-standing-out surface token
          // in dark mode (`#2e2e2e`) while staying identical to `surface-
          // base` in light mode (both `#ffffff`), so light mode looks
          // unchanged.
          "border border-lyra-border-subtle bg-lyra-bg-surface-overlay",
          "w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1"
        )}
      >
        {/* Two real flex slots (main buttons / volume+transcript+timer) in
            normal document flow. Per explicit follow-up request ("move the
            timer to the far right after volume"), the timer that used to
            sit in its own leading slot here (a bare Clock icon, no digits —
            see the trailing slot below for where it lives now, WITH its
            digits) is gone; `justify-between` still needs no manual
            centering math with just these two slots — the leading one
            (`flex-1`, `justify-start` per a later explicit follow-up
            request — was `justify-center`) claims whatever space the
            trailing one doesn't. */}
        <div className="flex min-w-0 flex-1 items-center justify-start gap-1">
          <Tooltip content={onHold ? "Resume" : "Hold"} placement="top" asLabel>
            <CompactCallControlButton
              icon={onHold ? <Play className="h-4 w-4" strokeWidth={1.5} /> : <Pause className="h-4 w-4" strokeWidth={1.5} />}
              active={onHold}
              onClick={() => {
                const next = !onHold;
                setOnHold(next);
                onAddToast?.({ variant: "info", title: next ? "Call on hold" : "Call resumed" });
              }}
            />
          </Tooltip>
          <Tooltip content={muted ? "Unmute" : "Mute"} placement="top" asLabel>
            <CompactCallControlButton
              icon={muted ? <MicOff className="h-4 w-4" strokeWidth={1.5} /> : <Mic className="h-4 w-4" strokeWidth={1.5} />}
              active={muted}
              onClick={() => setMuted((m) => !m)}
            />
          </Tooltip>
          <Tooltip content="Mask" placement="top" asLabel>
            <CompactCallControlButton
              icon={<VenetianMask className="h-4 w-4" strokeWidth={1.5} />}
              active={masked}
              onClick={() => {
                const next = !masked;
                setMasked(next);
                onAddToast?.({ variant: "info", title: next ? "Voice masking on" : "Voice masking off" });
              }}
            />
          </Tooltip>
          <Tooltip content={recording ? "Stop" : "Record"} placement="top" asLabel>
            <CompactCallControlButton
              icon={
                <Circle
                  className={cn("h-4 w-4", recording && "fill-lyra-status-critical-strong text-lyra-status-critical-strong")}
                  strokeWidth={1.5}
                />
              }
              active={recording}
              onClick={() => {
                const next = !recording;
                setRecording(next);
                onAddToast?.({ variant: next ? "success" : "info", title: next ? "Recording started" : "Recording stopped" });
              }}
            />
          </Tooltip>
          {/* Keypad — `Tooltip` wraps `Popover` from the OUTSIDE here too,
              see `CompactVolumeButton`'s own comment for the full "why".
              No `onClick` on `CompactCallControlButton` itself
              — `Popover`'s own Radix trigger clones its click/ref/aria
              props straight onto it (see that component's own doc comment
              for why this now actually reaches the real button).
              `aria-label` set directly on `CompactCallControlButton`
              (flows through its own `...rest` spread) rather than via
              `Tooltip`'s `asLabel` — `asLabel` would land on the wrapping
              `<span>` below, not the real button one layer deeper, since
              that's genuinely what `Tooltip` wraps here. */}
          <Tooltip content="Keypad" placement="top" disabled={keypadOpen}>
            <span className="inline-flex">
              <Popover
                open={keypadOpen}
                onOpenChange={setKeypadOpen}
                placement="top"
                bodyPadding={false}
                content={<DialPad />}
              >
                <CompactCallControlButton
                  icon={<Grid3x3 className="h-4 w-4" strokeWidth={1.5} />}
                  active={keypadOpen}
                  aria-label="Keypad"
                />
              </Popover>
            </span>
          </Tooltip>
          {showAddVideo && (
            <Tooltip content={videoAdded ? "Remove video" : "Add video"} placement="top" asLabel>
              <CompactCallControlButton
                icon={videoAdded ? <VideoOff className="h-4 w-4" strokeWidth={1.5} /> : <Video className="h-4 w-4" strokeWidth={1.5} />}
                active={videoAdded}
                onClick={() => {
                  // Real window when wired; decorative local fallback
                  // otherwise — see `onToggleVideo`'s own doc comment above.
                  if (onToggleVideo) {
                    onToggleVideo();
                    return;
                  }
                  const next = !localVideoAdded;
                  setLocalVideoAdded(next);
                  onAddToast?.({ variant: "info", title: next ? "Video added to call" : "Video removed from call" });
                }}
              />
            </Tooltip>
          )}
          <Tooltip content="Hang Up" placement="top" asLabel>
            <CompactCallControlButton icon={<PhoneOff className="h-4 w-4" strokeWidth={1.5} />} critical onClick={onHangUp} />
          </Tooltip>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Transcript — per explicit follow-up request ("take the
              transcript button out of the volume dropdown and put it to
              the left of the volume button"): its own plain
              `CompactCallControlButton` again, same as every other main
              control in the leading cluster above, rather than a row folded
              into `CompactVolumeButton`'s own popover — see that
              component's own doc comment for the "why" this reverted.
              `onToggleTranscript` omitted entirely hides this trigger. */}
          {onToggleTranscript && (
            <>
              {/* Separator — per explicit follow-up request ("add a
                  separator to the left of the transcript icon"): same
                  divider style every other separator in this bar uses
                  (`h-4 w-px bg-lyra-border-subtle`), gated on the same
                  `onToggleTranscript` check as the transcript button itself
                  just after it, so there's no dangling divider when that
                  button is hidden. */}
              <span aria-hidden="true" className="h-4 w-px bg-lyra-border-subtle" />
              <Tooltip content={transcriptOpen ? "Hide transcript" : "Show transcript"} placement="top" asLabel>
                <CompactCallControlButton
                  icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
                  active={transcriptOpen}
                  onClick={onToggleTranscript}
                />
              </Tooltip>
            </>
          )}
          <CompactVolumeButton volume={volume} onVolumeChange={setVolume} />
          {/* Timer — per explicit follow-up request ("show the numbers in
              the timer and move the timer to the far right after volume,
              add a separator between volume and the timer"): now trails
              volume+transcript here instead of leading the whole bar in its
              own slot (see this branch's own top comment), and shows its
              actual "MM:SS" digits (`formatElapsedTime`) next to the Clock
              icon rather than just the bare icon a hover/focus `Tooltip`
              used to be the only way to read it through. Divider matches
              this row's own leading dividers (`h-4 w-px bg-lyra-border-
              subtle`) exactly, and is gated on the same `elapsedSeconds !== undefined`
              check as the timer itself, so no dangling divider with nothing
              after it.
              Per a later explicit follow-up request ("make the width of the
              timer fixed so it doesn't shrink/expand depending on the
              numbers"): the digits alone (not the icon) get a fixed
              `w-[34px]` — comfortably fits "MM:SS" (5 fixed-width
              characters via `tabular-nums`, so every digit occupies the
              same width a proportional font wouldn't guarantee) without
              ever needing to grow past an hour-long call — and `text-right`
              so they stay flush against the icon as digit count changes,
              rather than the whole card's width/layout shifting a few
              pixels every second as e.g. "9:59" ticks over to "10:00". */}
          {elapsedSeconds !== undefined && (
            <>
              <span aria-hidden="true" className="h-4 w-px bg-lyra-border-subtle" />
              <span
                className="flex items-center gap-1 lyra-body-sm text-lyra-fg-secondary"
                aria-label={`Call duration ${formatElapsedTime(elapsedSeconds)}`}
              >
                <Clock className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="w-[34px] shrink-0 text-right tabular-nums">{formatElapsedTime(elapsedSeconds)}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
