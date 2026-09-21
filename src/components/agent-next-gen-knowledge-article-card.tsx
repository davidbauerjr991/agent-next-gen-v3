import React, { useState } from "react";
import { BookOpen, Check, ChevronRight, Copy } from "lucide-react";
import { Accordion, ActionIconButton, Link, cn } from "@nicecxone/lyra-ui";

/* ── KnowledgeArticleSummaryRow / KnowledgeArticleDetailPanelBody /
     KnowledgeArticleLinkDetailBody ──
 *  A "suggested knowledge-base article" surfaced in response to a "Do
 *  Something" command — per explicit request, this is a scaffold: the
 *  containers are real, every consumer currently feeds them static
 *  placeholder content (see `PLACEHOLDER_KNOWLEDGE_ARTICLE`,
 *  agent-next-gen-marcus-webb-next-best-action-card.tsx) until a real
 *  content source (the local-LLM work saved for later) replaces it.
 *
 *  Per a later explicit follow-up, this used to be one big card rendered
 *  fully expanded inline — that competed too much for space with the
 *  rest of the transcript. Now split, mirroring "Refund approved"'s own
 *  "compact row inline, full detail in a side panel" split exactly:
 *  `KnowledgeArticleSummaryRow` is the compact inline trigger (styled
 *  like `ActionLogNoteEntry`'s own bordered row), and
 *  `KnowledgeArticleDetailPanelBody` — the body paragraph + the nested
 *  "Internal Use Only"/"Web Links"/"Process Steps" `Accordion` that used
 *  to render inline — now lives in the shared floating `InteriorPanel`
 *  overlay that opens when the row is clicked (see
 *  `AgentWorkspaceAdvancedPage.tsx`'s own `selectedDetailPanelContent`
 *  state, which this shares with the Marcus Webb action-log detail
 *  panel — "like the home page," one container, one thing showing at a
 *  time, per explicit request). Clicking the row again toggles that
 *  panel closed.
 *
 *  Per a later explicit follow-up, the Web Links ARE clickable again —
 *  clicking one swaps the SAME panel's content to
 *  `KnowledgeArticleLinkDetailBody` (that one link's own placeholder
 *  detail) with a back arrow in the header to return to the article —
 *  navigating WITHIN one panel rather than nesting a second one (this
 *  app's panels don't support nesting; see
 *  `AgentWorkspaceAdvancedPage.tsx`'s own `DetailPanelContent` union for
 *  how the page tracks "which view, within the one shared panel"). The
 *  copy button beside each link is unrelated and still just copies. */

export interface KnowledgeArticleWebLink {
  title: string;
  /** Placeholder "URL" to copy — not a real link yet. */
  copyValue: string;
}

export interface KnowledgeArticleCardData {
  id: string;
  title: string;
  body: string;
  internalNote: string;
  webLinks: KnowledgeArticleWebLink[];
  processSteps: string[];
}

export function KnowledgeArticleSummaryRow({
  data,
  selected,
  onClick,
}: {
  data: KnowledgeArticleCardData;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lyra-md border p-3 text-left transition-colors",
        selected
          ? "border-lyra-border-active bg-lyra-status-info-subtle"
          : "border-lyra-border-subtle bg-lyra-bg-surface-base hover:border-lyra-state-border-hover-neutral"
      )}
    >
      <BookOpen className="h-4 w-4 shrink-0 text-lyra-fg-action" strokeWidth={1.5} aria-hidden="true" />
      <span className="lyra-body-md-emphasis text-lyra-fg-default">{data.title}</span>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}

export function KnowledgeArticleDetailPanelBody({
  data,
  onViewLink,
}: {
  data: KnowledgeArticleCardData;
  onViewLink: (link: KnowledgeArticleWebLink) => void;
}) {
  const sectionItems = [
    {
      id: "internal-use",
      title: "Internal Use Only",
      content: <p className="lyra-body-md text-lyra-fg-default">{data.internalNote}</p>,
    },
    {
      id: "web-links",
      title: `Web Links (${data.webLinks.length})`,
      content: (
        <div className="flex flex-col gap-2">
          {data.webLinks.map((link) => (
            <div key={link.title} className="flex items-center justify-between gap-2">
              <Link onClick={() => onViewLink(link)}>{link.title}</Link>
              <CopyLinkButton value={link.copyValue} />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "process-steps",
      title: "Process Steps",
      content: (
        <ol className="flex flex-col gap-1.5 pl-4 list-decimal">
          {data.processSteps.map((step, i) => (
            <li key={i} className="lyra-body-md text-lyra-fg-default">
              {step}
            </li>
          ))}
        </ol>
      ),
    },
  ];

  return (
    // `p-4` — matches `MarcusWebbActionDetailPanelBody`'s own wrapper
    // exactly (agent-next-gen-marcus-webb-next-best-action-card.tsx),
    // which is what actually lines this content's left edge up with the
    // panel header's own `px-4` above it. An earlier `p-1` here was the
    // bug a screenshot caught — content sat closer to the edge than the
    // header text above it, reading as misaligned.
    <div className="flex flex-col gap-3 p-4">
      <p className="lyra-body-md text-lyra-fg-default">{data.body}</p>
      <Accordion type="multiple" defaultValues={["internal-use", "web-links"]} items={sectionItems} />
    </div>
  );
}

/** The "drilled into one web link" panel content — deliberately minimal,
 *  per explicit request ("create the containers first"): just enough to
 *  prove the in-panel navigation works. Same `p-4` convention as
 *  `KnowledgeArticleDetailPanelBody` above. */
export function KnowledgeArticleLinkDetailBody({ link }: { link: KnowledgeArticleWebLink }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="lyra-body-md text-lyra-fg-secondary">
        Content for "{link.title}" will appear here once this is wired up to real content.
      </p>
    </div>
  );
}

/** Local `copied` boolean + a 2s timeout swapping Copy/Check — the closest
 *  existing precedent in either repo (Table.stories.tsx's own copy
 *  button); no reusable component for this exists yet. */
function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <ActionIconButton
      size="sm"
      title={copied ? "Copied" : "Copy link"}
      aria-label={copied ? "Copied" : "Copy link"}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {});
      }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-lyra-status-success-strong" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      )}
    </ActionIconButton>
  );
}
