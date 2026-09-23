import { InteriorPanel } from "@nicecxone/lyra-ui";
import { PanelRightClose } from "lucide-react";

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
 *  `className="z-[500]"`/`closeIcon={PanelRightClose}`, but only the
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
      className="z-[500]"
      closeIcon={<PanelRightClose className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
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
