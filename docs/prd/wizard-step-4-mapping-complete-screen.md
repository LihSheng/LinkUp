# Wizard Step 4: Mapping Complete Screen PRD

## Problem Statement

Users have already completed step 3 mapping, but the product still needs a trustworthy completion screen that shows the finalized result, confirms the run is valid, and offers export actions without changing the existing wizard shell.

The current reference mock is very specific about the shape of the experience. The screen should feel like the natural end of the schema mapping flow, not a new product surface. It should preserve the current sidebar, header, and footer patterns, and only update the operational area inside the main content region.

## Solution

Build a read-only step 4 completion screen that appears after the mapping work is finished.

The screen should:
- keep the existing LinkUp Workbench shell intact
- preserve the current sidebar stepper, top header, and footer structure
- replace only the operational area with the completion content
- show real run data from the finalized mapping output
- provide both JSON and Excel exports for the same mapped dataset
- let the user go back to step 3 with the current mapping state preserved
- let the user finish the wizard and return to the dashboard

The experience should feel calm, technical, and authoritative. The screen must communicate:
- the mapping is complete
- the output is real and validated
- the user can export immediately
- the user can return to step 3 if they want to adjust the mapping

## Design Reference

This PRD follows the completion mock in:
- `C:\Users\lihsh\Downloads\last\DESIGN.md`
- `C:\Users\lihsh\Downloads\last\code.html`
- `C:\Users\lihsh\Downloads\last\screen.png`

The intended visual pattern is:
- warm parchment background
- charcoal primary text
- cream and white surfaces
- subtle borders and soft elevation
- strong hierarchy in the main completion card
- no change to the current shell chrome

The design direction should apply only to the operational area. The current sidebar, header, and footer should stay in use.

## User Stories

1. As a user, I want to land on a clear completion screen after mapping, so that I know the workflow has finished successfully.
2. As a user, I want the screen to keep the existing sidebar and header, so that the app still feels like one continuous product.
3. As a user, I want the operational area to reflect the completion state, so that I can immediately understand what the screen is for.
4. As a user, I want to see that my mapping was validated successfully, so that I trust the exported result.
5. As a user, I want the summary metrics to come from the real mapping run, so that the screen reflects actual output instead of mock content.
6. As a user, I want to see the number of rows processed, so that I can confirm the size of the completed run.
7. As a user, I want to see the validation percentage, so that I can judge whether the output is complete.
8. As a user, I want to see the error count, so that I can verify whether the run is clean.
9. As a user, I want to preview the final JSON output, so that I can inspect the exported shape before downloading it.
10. As a user, I want the JSON preview to be read-only, so that I do not accidentally edit the finalized result.
11. As a user, I want the JSON preview to scroll cleanly, so that long payloads remain readable.
12. As a user, I want the export buttons to be easy to find, so that I can finish quickly.
13. As a user, I want JSON and Excel exports to contain the same finalized mapped dataset, so that the format choice is predictable.
14. As a user, I want a back action to return me to step 3, so that I can make a final mapping adjustment without starting over.
15. As a user, I want my mapping state to be preserved when I go back, so that I do not lose work.
16. As a user, I want a clear finish action that returns me to the dashboard, so that I can leave the wizard when I am done.
17. As a user, I want the screen to feel like a deliberate completion state, so that the workflow feels trustworthy.
18. As a user, I want the visual design to match the provided mock closely, so that the product feels polished and intentional.
19. As a user, I want the completion screen to remain usable on smaller screens, so that I can review and export on tablet-sized devices.
20. As a user, I want the screen to keep the same layout language as the rest of LinkUp, so that I never feel like I left the product.
21. As a user, I want the footer actions to remain consistent with the wizard flow, so that the next step is obvious.
22. As a user, I want the screen to be read-only, so that I understand the mapping is finalized at this stage.

## Implementation Decisions

- Keep the current wizard shell unchanged:
  - left sidebar
  - top header
  - footer
  - overall responsive frame
- Treat the main completion screen as the step 4 operational area only.
- Preserve the current stepper structure and keep step 4 visually active.
- Use the existing workbench route and screen orchestration rather than introducing a separate completion page.
- Render the completion state from the real mapping run, not from sample or placeholder values.
- Drive the summary metrics from the finalized output data:
  - rows processed
  - validation status
  - error count
- Use the same mapped dataset for both JSON and Excel export actions.
- Keep the JSON preview read-only and derived from the finalized output payload.
- Preserve the back path to step 3 and keep the mapping state intact when the user returns.
- Keep the finish action as a clear exit back to the dashboard.
- The operational area should follow the provided mock closely in spacing, typography, and card treatment, but should not require changing the shell chrome.

Suggested modules to build or refine:
- a completion-state resolver that decides which completion copy and status tone to show
- a completion summary panel for the row count, validation percentage, and errors
- a read-only JSON preview panel for the final output payload
- an export action group for JSON and Excel downloads
- a completion action footer for back and finish navigation
- a lightweight state bridge between the mapping run and the completion screen

## Testing Decisions

- Good tests should verify external behavior only:
  - what the user sees in the completion state
  - which actions are enabled
  - whether the preview shows real output data
  - whether back navigation preserves mapping state
  - whether the footer actions route to the expected places
- The main UI modules to test should be:
  - the workbench container integration for step 4
  - the completion summary panel
  - the JSON preview panel
  - the export action group
  - the completion navigation/footer logic
- The domain or helper modules to test should be:
  - completion state resolution
  - output-to-preview data shaping
  - export payload selection
  - step transition preservation
- Prior art already exists in the repo for this style of testing:
  - `src/lib/schema/json-schema.test.ts`
  - `src/lib/mapping/transform.service.test.ts`
  - `src/lib/excel/template-import.test.ts`
  - `src/lib/excel/header-detection.test.ts`
  - `src/components/wizard/schema-matching-workbench.helpers.test.ts`
- The new tests should follow the same pattern by exercising the public behavior of the screen and its helpers instead of asserting private implementation details.

## Out of Scope

- Redesigning the current sidebar, header, or footer shell.
- Changing the mapping logic itself.
- Changing the export file formats.
- Allowing edits on the completion screen.
- Adding a separate analytics dashboard to the completion state.
- Building a new modal or drawer version of the completion flow.
- Reworking the wizard step order.
- Introducing a different visual language from the existing LinkUp Workbench design.

## Further Notes

The highest priority product rule is that this screen feels like the rightful end of the mapping flow.

The most important visual constraint is that only the operational area changes. The shell should remain familiar so the user understands they are still in the same wizard.

The screen should be short, confident, and factual. It should show that the run is complete, let the user export the result, and give them one clean path back to the mapping step if they need it.
