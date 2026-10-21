
### AICard `count`
- New optional `count` prop on `AICard` renders a number next to the title. Artifacts story card (populated) and v3's Artifacts card pass it when artifacts exist.

## Record header restyled to match lyra-ui's PageHeader agent story (AgentWorkspaceAdvancedPage.tsx)
2026-10-21. Look only; every handler, hover preview, gating rule and panel toggle is unchanged. Avatar is now `size="lg"` (44px) and the Online/Offline presence is a plain dot (lyra-ui `Badge dot bordered`, green or neutral) passed through `Avatar`'s `badge` prop, with the same tooltip and aria-label. The "+" Add Channel trigger is a plain icon button (no border), the per-channel preview buttons are outline `icon-md` buttons, selected = light-blue fill with a blue border (was the `PANEL_BUTTON_SELECTED_CLASS` fill), and the Contact Details button uses the `ContactRound` icon. Spacing in the actions row is 6px. The session row below (`TranscriptSessionSeparator`: channel, address, "Session Details" link, ghost Outcome button with a solid blue check, status tag with chevron) already matched the story and was not changed. `AgentWorkspace2WithDeskPage.tsx` (Premium) was not touched.

Session row top padding is now 4px (`pt-1 pb-2`, was `py-2`) in `TranscriptSessionSeparator`, matching lyra-ui's PageHeader agent story. This row is shared by every page that renders `InteractionTranscript`, including the Premium page.

`ChannelStatusTag` (`agent-next-gen-transcript.tsx`) restyled to match lyra-ui's PageHeader agent story: default Tag shape instead of the pill, a static `h-3 w-3` chevron (it no longer rotates while open), the trigger's focus shape is `rounded-lyra-xs`, and the status menu popover has no arrow and is `w-56` (was `w-72`). Menu items, dots, selection logic and the Close confirmation view are unchanged. The tag is shared, so every page that shows it changes.
