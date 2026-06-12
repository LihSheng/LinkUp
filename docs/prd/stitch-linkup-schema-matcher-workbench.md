# LinkUp Schema Matcher Workbench PRD

## Problem Statement

Users need a dedicated workbench step where the system analyzes an uploaded source file against a selected schema and shows the mapping process in a way that feels trustworthy, legible, and technical.

The current experience needs more than a generic loading screen. It should communicate that the product is actively reading source columns, comparing them to the target schema, and validating semantic matches in real time. The interface also needs to match the visual tone of the provided mock very closely so the page feels like part of the LinkUp product rather than a separate prototype.

## Solution

Build a full-page "Mapping Intelligence" workbench for step 03 of the wizard flow.

The screen should present:
- a fixed left sidebar wizard stepper with the active mapping step emphasized
- a top-right escape hatch back to the dashboard
- a large main header announcing that schema analysis is in progress
- a central content card containing the mapping visualization
- a live activity log showing AI and validation progress
- a disabled or processing footer action while analysis is still running

The workbench should feel calm and authoritative. The user should always understand:
- where they are in the wizard
- what the system is doing right now
- which source columns are being matched
- how confident the matcher is
- when the workflow will be ready to continue

## Design Reference

This PRD is based on the provided workbench mock in:
- `C:\Users\lihsh\Downloads\stitch_linkup_schema_matcher_workbench\DESIGN.md`
- `C:\Users\lihsh\Downloads\stitch_linkup_schema_matcher_workbench\code.html`
- `C:\Users\lihsh\Downloads\stitch_linkup_schema_matcher_workbench\screen.png`

The UI intent is:
- warm parchment background across the full page
- charcoal text for primary emphasis
- soft cream borders and containers
- a quiet, highly structured data-tool aesthetic
- minimal motion, used only to communicate processing

## User Stories

1. As a user, I want to see that the system is analyzing my uploaded schema, so that I know the matching process has started.
2. As a user, I want to understand which step of the wizard I am on, so that I can tell how far I am from completion.
3. As a user, I want the active mapping step to stand out in the sidebar, so that I can orient myself quickly.
4. As a user, I want to see source fields and target schema fields side by side, so that I can understand what is being matched.
5. As a user, I want the workbench to show live activity messages, so that I can trust the system is actively processing the file.
6. As a user, I want to see confidence values for matches, so that I can judge whether the mapping looks reliable.
7. As a user, I want the interface to use restrained visual feedback, so that the page feels professional and not noisy.
8. As a user, I want to be able to return to the dashboard, so that I can exit the wizard if needed.
9. As a user, I want a back action at the bottom of the flow, so that I can return to the previous step without losing context.
10. As a user, I want the primary action to remain disabled while processing is incomplete, so that I do not advance too early.
11. As a user, I want the footer to show an estimated time remaining, so that I know how long to wait.
12. As a user, I want the page to keep the control hierarchy obvious, so that I can focus on the mapping result instead of hunting for actions.
13. As a user, I want the mapping cards to use clear source and target labels, so that I can read the match direction instantly.
14. As a user, I want the interface to feel like a precision workbench, so that I trust the product with real data.
15. As a user, I want the live feed to surface validation and detection steps, so that I understand why the matcher selected a given result.
16. As a user, I want the interface to preserve a stable layout during processing, so that I am not distracted by shifting content.
17. As a user, I want the workbench to show progress even before all matches are complete, so that I can remain confident the system is not stalled.
18. As a user, I want the final output step to be clearly separated from the mapping step, so that I know the analysis is not the end of the workflow.
19. As a user, I want the design to mirror the reference mock closely, so that the product implementation matches the approved visual direction.
20. As a user, I want the page to work on smaller screens as well, so that the workbench remains usable on tablet-sized devices.

## Implementation Decisions

- This screen is step 03 in the four-step wizard flow.
- The left sidebar must keep the same four stages:
  - 01 Schema
  - 02 Upload
  - 03 Mapping
  - 04 Done
- The active step should be visually stronger than the inactive steps using a pale highlighted container and a bright step number tile.
- The page should use a two-region structure:
  - fixed navigation/sidebar on the left
  - fluid work area on the right
- The right-side work area should include a small top utility link back to the dashboard and a separate bottom footer action row.
- The main header should include:
  - a small uppercase step label
  - a bold page title in progress state
  - a short supporting sentence explaining AI-driven matching
- The central work area should be a large white card with soft border and rounded corners.
- The main card should contain an interior mapping panel with three visible source fields on the left, three target schema fields on the right, and a central visual connector column.
- Source cards should be visually lighter than the surrounding panel and should read as the incoming data columns.
- Target cards should use a slightly different neutral tint to distinguish the schema destination from the source side.
- Each source and target card should show a small uppercase label above the actual field name.
- The central connector column should use a vertical line, a small dot, and a subtle spark/AI indicator to communicate semantic matching.
- The mapping panel should include a subtle progress bar or loading strip at the bottom edge to reinforce active processing.
- The live activity section should sit below the mapping visual as a second card.
- The live activity section should include:
  - a header label
  - a live indicator dot
  - a scrolling or log-like list of timestamped entries
- Log entries should communicate distinct stages such as metadata scanning, type detection, field matching, and validation.
- Time stamps should be visually de-emphasized relative to the message text.
- Highlighted values such as confidence percentages should use semantic color emphasis, but only when the meaning is positive and clear.
- The footer should include:
  - a back button on the left
  - a centered time-remaining status with an activity icon
  - a right-aligned primary action that remains disabled or visually unavailable while processing is active
- The primary footer action should read as an in-progress state such as "Processing..." and should not invite the user to continue yet.
- The design system should remain grounded in the existing LinkUp Workbench palette:
  - parchment background
  - charcoal primary text
  - cream borders
  - white cards
  - subtle shadows
- Typography should follow the existing LinkUp direction using Be Vietnam Pro for interface text and JetBrains Mono or equivalent for timestamps and code-like values.
- Motion should stay minimal and functional:
  - subtle pulse or shimmer for the active analysis surface
  - restrained live-feed updates
  - no playful or consumer-style animation
- The page should preserve visual balance at the mock's intended desktop aspect ratio and then degrade gracefully on smaller widths.

## Layout Decisions

### Sidebar

The sidebar should be a tall, calm navigation rail with generous top padding and strong vertical spacing between steps.

It should contain:
- the LinkUp brand mark
- the product name
- the "Wizard Flow" sublabel
- the four-step wizard progression
- low-emphasis links near the bottom such as Dashboard and Matching lab

Inactive steps should be faded but still readable. The active step should appear as a highlighted pill-like block with a bright number tile and bolder label text.

### Main Header

The header region should be left-aligned and airy.

It should contain:
- a small uppercase step indicator
- the bold heading "Analyzing Schema..."
- a short explanatory line such as "AI-driven semantic header alignment in progress."
- a top-right text link back to the dashboard

### Mapping Intelligence Card

The top card should be the visual anchor of the page.

It should contain:
- a large centered title like "Mapping Intelligence"
- a single centered subtitle
- a bordered inner panel that holds the source-to-target mapping visualization

The mapping visualization should read as two columns of field cards with a central AI connector.
The source side should show field names like `First_Name`, `Email_Address`, and `Home_Phone_Number`.
The target side should show schema fields like `firstName`, `email`, and `phone`.

The inner panel should feel spacious and precise, not cramped. The cards should be aligned in a tidy vertical stack with consistent gaps.

### Live Activity Card

The live log card should use the same soft neutral palette as the rest of the page and feel slightly inset.

It should present a compact feed of processing updates such as:
- scanning source metadata
- detecting data types
- matching source fields to target schema fields
- validating domain structure

The card should support scrolling if the feed grows longer than the visible region.

### Footer

The footer should sit below the main workbench and be separated by a faint divider.

It should show:
- a back button on the left
- a centered remaining-time status
- a disabled processing action on the right

The primary action should remain visually subdued while analysis is still underway.

## State Model

The workbench should support these visible states:

- `analyzing`: the default in-progress view shown in the mock
- `confidence-updating`: live match confidence values are refining
- `validation-running`: the system is checking field consistency and domain rules
- `ready-for-review`: the system has completed analysis and can move forward
- `failed`: the matcher could not complete or needs user intervention

The mock primarily documents the `analyzing` state, but the structure should be able to transition into the later states without changing the layout.

## Testing Decisions

- Test that the left sidebar renders the four-step flow with the correct active step emphasis.
- Test that the main header shows the step label, title, and supporting description.
- Test that source and target mapping cards render in the correct columns and preserve their labels.
- Test that the live activity log presents timestamped entries with the expected visual hierarchy.
- Test that the footer keeps the primary action disabled while processing is active.
- Test that the workbench preserves the intended layout at desktop widths and does not collapse the main mapping visualization unexpectedly.
- Test external behavior only:
  - visible step state
  - visible processing status
  - visible mapping content
  - presence of the live feed
  - disabled/enabled action states

## Out of Scope

- Changing the schema matching algorithm itself.
- Reworking steps 01, 02, or 04 beyond visual consistency with this screen.
- Building a manual mapping editor in this step.
- Allowing the user to directly edit the detected match confidence on this screen.
- Adding a complex analytics dashboard to the live feed.
- Introducing dark mode for this workbench unless the rest of the product already supports it.
- Replacing the warm parchment visual language with a different brand direction.
- Making this screen into a modal rather than a full-page wizard.

## Further Notes

The most important product requirement is that the screen feels deliberate and informative while the system is working.

The reference mock is not just suggesting the layout. It is defining the visual language:
- wide left rail
- large airy work area
- centered content cards
- rounded corners
- restrained typography
- calm surface colors
- minimal chrome

If implementation choices need to vary slightly for responsiveness or component reuse, they should preserve those design principles first.

The copy should remain short and confident. This screen should never sound uncertain, chatty, or promotional.

