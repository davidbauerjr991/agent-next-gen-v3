import { InteriorPanel } from "@nicecxone/lyra-ui";

/** The standard container for a floating side panel that opens OVER the
 *  active interaction column (as opposed to a docked "Session Details"/
 *  "Case Details" panel, which is a deliberately different, fixed-width,
 *  non-full-screen pattern — see `../../../lyra-ui/src/components/
 *  interior-panel.tsx`'s own doc comment: `InteriorPanel` is a bare,
 *  general-purpose primitive with no enforced "standard" configuration,
 *  so every consumer has always had to set `allowFullScreen`/
 *  `absoluteBreakpoint`/`maxWidth`/`className` for itself).
 *
 *  Per an explicit audit request ("check if this is a standard component
 *  and let me know if there is drift"), two call sites in
 *  `AgentWorkspaceAdvancedPage.tsx` — the "View customer info" overlay
 *  and the Marcus Webb card's shared detail panel — turned out to have
 *  drifted: both agreed on `allowFullScreen`/`absoluteBreakpoint={Infinity}`/
 *  `className="z-[5]"`/`closeIcon={PanelRightClose}`, but only the
 *  first one also set `maxWidth={Infinity}` (removing the drag-resize
 *  cap) — the second silently fell back to `InteriorPanel`'s own 425px
 *  default. Since both now render the SAME customer-info content (per a
 *  later "single container" fix), that drift was directly visible: the
 *  identical content resized differently depending on which trigger
 *  opened it. This wrapper hardcodes that shared configuration once, so
 *  every "in-contact" panel that uses it can't drift again — only the
 *  props that legitimately vary per usage (open/close, header content,
 *  footer, children) are exposed. */
export function InContactInteriorPanel({
  open,
  onClose,
  headerTitle,
  headerSubhead,
  headerTabs,
  footer,
  onBack,
  children,
}: {
  open: boolean;
  onClose: () => void;
  headerTitle?: string;
  headerSubhead?: string;
  headerTabs?: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <InteriorPanel
      open={open}
      onClose={onClose}
      allowFullScreen
      absoluteBreakpoint={Infinity}
      maxWidth={Infinity}
      // Per explicit bug report ("it is above the search panel and
      // chevron toggle in the left nav"): dropped from `z-[500]` to
      // `z-[5]` (explicit follow-up request, "make it 5") — low enough
      // to sit under the shared AI/Notifications/Search panel (float
      // mode's `zIndex: 40`, docked mode's `z-[9]` fullscreen overlay)
      // and `left-nav.tsx`'s own `z-[600]` collapse-toggle chevron.
      // Level with the docked Customer Information panel's own `z-[5]`
      // (see that panel's own wrapper div, this same file's caller) —
      // in practice the two are mutually exclusive (this panel only
      // renders while triggered from within that one), so tying them at
      // the same level doesn't create a visible ordering conflict.
      className="z-[5]"
      // Per explicit follow-up request ("update the toggle close icon for
      // interior panels to be an 'x' icon") — the earlier `PanelRightClose`
      // override here is gone; omitting `closeIcon` now falls back to
      // `InteriorPanel`'s/`ContainerHeader`'s own plain `X` default.
      headerTitle={headerTitle}
      headerSubhead={headerSubhead}
      headerTabs={headerTabs}
      footer={footer}
      onBack={onBack}
    >
      {children}
    </InteriorPanel>
  );
}
