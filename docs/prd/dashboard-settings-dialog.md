# Dashboard Settings Dialog PRD

## Problem Statement

Users need a single place to adjust application-level preferences from the dashboard. Today the dashboard has a gear icon in the top-right utility area, but there is no formal product spec for what it should open or how settings should be organized.

The product needs a settings experience that is:
- reachable from the dashboard gear icon
- structured as a modal dialog with a left sidebar
- able to hold current settings and future sections without redesigning the container
- consistent with the existing LinkUp Workbench visual system

## Goal

Provide a dashboard-level settings dialog that opens from the gear icon and lets users manage:
- General settings
- Model settings
- future settings sections without changing the dialog shell

The dialog should feel like a stable product surface, not a one-off popup.

## Design Reference

This PRD follows the modal layout shown in:
- `C:\Users\Lih Sheng\Downloads\modal\DESIGN.md`
- `C:\Users\Lih Sheng\Downloads\modal\screen.png`

The reference pattern is:
- modal overlay centered on the dashboard
- large title header with close button
- left sidebar navigation
- main content pane on the right
- footer actions for discard and save

## User Stories

1. As a user, I want to open Settings from the dashboard gear icon, so that I can adjust preferences without leaving the dashboard.
2. As a user, I want settings to appear in a sidebar, so that I can switch between sections quickly.
3. As a user, I want General settings and Model settings to be separated, so that different kinds of preferences do not mix.
4. As a user, I want future settings to have a place in the same dialog, so that new sections can be added without changing the interaction model.
5. As a user, I want to save or discard changes explicitly, so that I can review edits before they take effect.
6. As a user, I want the dialog to close cleanly with the X button or escape key, so that I can exit quickly.
7. As a user, I want the dialog to stay consistent with the LinkUp brand, so that it feels like part of the product.

## Scope

### In Scope

- Open settings from the dashboard gear icon.
- Show a modal dialog over the dashboard.
- Provide a left sidebar for section navigation.
- Provide a General settings section.
- Provide a Model settings section.
- Reserve room for future settings sections.
- Support discard and save actions.
- Preserve unsaved changes until the user confirms save.

### Out of Scope

- Replacing the dashboard layout.
- Turning settings into a separate page.
- Building every future settings section now.
- Adding admin-only settings unless explicitly defined later.
- Making settings available from every screen if that is not already part of the dashboard shell.

## Information Architecture

### Dialog Shell

- Trigger: dashboard gear icon in the top-right utility area.
- Overlay: dimmed backdrop that blocks interaction with the dashboard while the dialog is open.
- Container: centered modal with rounded corners and a clear visual boundary.
- Header: settings title on the left, close icon on the right.
- Footer: discard action and primary save action.

### Sidebar Sections

- General
- Model Settings
- Future sections

Future sections should be listed in a dedicated upcoming area or visually disabled state so the layout can absorb new tabs later.

## General Settings

The General section should contain user-facing product preferences that affect the overall experience.

Recommended controls:
- Appearance mode: Light, Dark, System
- Interface language
- Timezone
- Automatic workflow sync

Behavior:
- Appearance changes should preview immediately where possible.
- Language and timezone changes should be applied only after save unless the product later adopts live apply.
- Sync toggles should clearly indicate on/off state.

## Model Settings

The Model Settings section should contain AI/model selection preferences that affect system behavior.

Recommended controls:
- Default model selection
- Model provider selection if multiple providers exist
- Output creativity or temperature control if exposed to users
- Response length or depth preference if relevant to the product

Behavior:
- The selected model should be the default for relevant workflows unless overridden elsewhere.
- If a model setting is unavailable for the current account or plan, the UI should disable it and explain why.
- Changes should remain staged until save.

## Future Settings

The dialog should reserve space for future sections without requiring a redesign.

Recommended treatment:
- show future sections in the sidebar under a separate "Upcoming" or equivalent group
- render future items as disabled or non-editable until shipped
- keep the modal width, footer, and navigation pattern stable as sections are added

Examples of future sections:
- Integrations
- API Access
- Notifications
- Workspace preferences

## Interaction Rules

1. Clicking the dashboard gear icon opens the settings dialog.
2. Clicking the X closes the dialog.
3. Pressing Escape closes the dialog.
4. Clicking the overlay closes the dialog only if there are no unsaved changes, or after confirmation if there are dirty changes.
5. Switching sidebar items changes the right-hand content area without closing the modal.
6. Save commits all staged changes for the current user or workspace scope.
7. Discard reverts staged changes to the last saved state.
8. Dirty state should be visible after any change.

## State Management

- Settings should open with the last saved values.
- Unsaved changes should be held in local dialog state until saved.
- The dialog should know when it is dirty.
- Closing with unsaved changes should prompt the user before discarding them.
- Saved values should persist across reloads.

## Accessibility

- The modal must trap focus while open.
- The title must be announced to screen readers.
- The close button and sidebar items must be keyboard reachable.
- Sidebar active state must be visible without relying on color alone.
- Save and discard buttons must have clear accessible labels.

## Responsive Behavior

- Desktop: use the full modal layout shown in the reference.
- Tablet: keep the same dialog but allow the content pane to compress before stacking.
- Mobile: if the modal cannot comfortably fit, convert the sidebar into a vertical tab list or segmented navigation while keeping the same section order.

## Visual Direction

The dialog should match the LinkUp Workbench design language:
- warm parchment surfaces
- charcoal primary text and actions
- soft borders and subtle depth
- rounded, calm containers
- compact but legible typography

The modal should look intentional and high-trust, not generic admin UI.

## Acceptance Criteria

- The dashboard gear icon opens the settings dialog.
- The dialog shows a left sidebar with at least General and Model Settings.
- The dialog reserves a visible place for future settings sections.
- The General section shows user-level product preferences.
- The Model Settings section shows model-related preferences.
- The user can save or discard changes.
- The dialog can be closed with the X button and Escape key.
- Unsaved changes are not lost silently.
- The visual layout matches the provided reference direction.

## Testing Notes

- Verify the gear icon opens the modal from the dashboard shell.
- Verify sidebar navigation updates the right-hand pane without navigation away from the dashboard.
- Verify dirty state appears after editing any setting.
- Verify Save persists settings and Discard restores the last saved state.
- Verify Escape and close button behavior.
- Verify future settings can be added without changing the modal shell.

## Open Questions

1. Should settings be scoped to the individual user, the workspace, or both?
2. Which model settings are in the first release versus later releases?
3. Should clicking the overlay close the modal when there are no unsaved changes?
4. Should appearance changes apply instantly or only after Save?
5. Which future settings belong in the initial sidebar as disabled placeholders?

