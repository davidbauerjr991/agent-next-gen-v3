import { LoginCard } from "@nicecxone/lyra-ui";

type Page = "agent-workspace" | "agent-advanced" | "outbound" | "login";

interface LoginPageProps {
  onNavigate?: (page: Page) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-lyra-bg-surface-shell p-6 animate-in fade-in-0 duration-500">
      {/* Per explicit request: the modal header reads "Agent Workspace"
          (not lyra-ui's own default "Agent Next Gen" — that default is
          left untouched, since other consumers of `LoginCard` may still
          rely on it), and the idle-state launch button reads a plain
          "Launch" instead of repeating the app name a second time right
          below the header (`launchButtonLabel`, LoginCard's own new opt-in
          prop — see that prop's doc comment, login-card.tsx). The
          in-progress "Launching Agent Workspace…" status text is
          untouched. */}
      <LoginCard
        appName="Agent Workspace"
        launchButtonLabel="Launch"
        // Per explicit request ("remove phase 1 for now ... completely
        // delete the phase 1 files"): this used to launch straight into
        // the old "agent" page (`AgentNextGenPage.tsx`), which is now
        // deleted — repointed to `"agent-advanced"`
        // (`AgentWorkspaceAdvancedPage.tsx`, now labeled "Agent Workspace
        // 2.0 | Phase 1" in that page's own app menu, agent-next-gen-
        // outbound-data.tsx's `buildAppMenuGroups`), the page that now
        // actually IS "Phase 1".
        onLaunch={() => onNavigate?.("agent-advanced")}
      />
    </div>
  );
}
