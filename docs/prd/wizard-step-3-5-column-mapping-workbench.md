# LinkUp Step 03.5: Column Mapping Workbench PRD

## Problem Statement

Users have already selected a schema and uploaded a source workbook, but they still need a trustworthy step where they can review, correct, and confirm the source-to-target mappings before final output is generated.

The product needs this stage to feel like a real workbench, not a loading screen and not a plain form. Users should be able to see what the system inferred, understand why some mappings are risky, fix unmapped fields quickly, and validate the final JSON preview before moving on.

## Solution

Build a dedicated column mapping workbench for step 03 of the wizard flow, with a secondary "3.5" feel that emphasizes review and validation before final confirmation.

The screen should present:
- a fixed left wizard stepper with Mapping highlighted as the active stage
- a large working table for source columns, target fields, and AI confidence
- inline action affordances for fixing unmapped or low-confidence rows
- a right-side validation panel that summarizes readiness and blocking issues
- a live JSON preview so the user can see the output shape update with the mapping
- a footer action that remains blocked until the mapping is ready to confirm

The experience should feel calm, precise, and technical. The user should always understand:
- where they are in the wizard
- which rows are already mapped
- which rows still need attention
- how confident the current suggestions are
- what the final transformed output will look like

## Design Reference

This PRD is based on the provided workbench mock in:
- `C:\Users\lihsh\Downloads\step 3.5\DESIGN.md`
- `C:\Users\lihsh\Downloads\step 3.5\code.html`
- `C:\Users\lihsh\Downloads\step 3.5\screen.png`

The intended visual pattern is:
- warm parchment background
- charcoal primary text and action buttons
- soft cream borders and white cards
- a large central table as the primary surface
- a right-hand validation rail with summary and JSON preview
- minimal motion used only to communicate status

## User Stories

1. As a user, I want to review AI-suggested mappings for my source columns, so that I can trust the final output before confirming it.
2. As a user, I want the mapping step to clearly show which wizard stage I am on, so that I do not lose my place.
3. As a user, I want to see the source column, target field, and confidence in one place, so that I can scan the mapping quickly.
4. As a user, I want unmapped fields to stand out, so that I can fix the blocking gaps first.
5. As a user, I want low-confidence rows to be visually distinct, so that I know which suggestions need human judgment.
6. As a user, I want a Fix action for problem rows, so that I can resolve them without leaving the workbench.
7. As a user, I want confirmed mappings to feel stable and safe, so that I can move through the review step with confidence.
8. As a user, I want the workbench to show how much of the mapping is complete, so that I can judge whether I am nearly done.
9. As a user, I want the system to flag unmapped source columns, so that I do not accidentally export incomplete data.
10. As a user, I want the target field chips to be easy to read, so that I can understand the destination schema at a glance.
11. As a user, I want to search fields in the mapping table, so that I can find a specific row quickly in larger workbooks.
12. As a user, I want the validation panel to tell me whether the run is ready, so that I know whether I can continue.
13. As a user, I want to see how many fields were auto-mapped, so that I can gauge how much manual work remains.
14. As a user, I want to see how many fields are still unmapped, so that I can focus on blockers first.
15. As a user, I want a live JSON preview, so that I can verify the transformed shape before I export it.
16. As a user, I want the JSON preview to reflect my current mapping choices, so that I can see the impact of each fix immediately.
17. As a user, I want the confirmation action to stay unavailable until issues are resolved, so that I do not finalize invalid output.
18. As a user, I want to navigate back to the upload step without losing context, so that I can revisit the source file if needed.
19. As a user, I want the mapping workbench to feel like a serious data tool, so that I trust it with real business data.
20. As a user, I want the page to keep a stable layout while I review rows, so that I can scan without visual noise.
21. As a user, I want rows to expose more detail when needed, so that I can inspect the reasoning behind a suggestion.
22. As a user, I want duplicate source assignments to be visible, so that I can avoid conflicting mappings.
23. As a user, I want the workbench to support both auto-suggested and manually corrected mappings, so that I can get to a reliable result faster.
24. As a user, I want the final confirmation to feel like the end of a deliberate review process, so that I know the data is ready to advance.
25. As a user, I want the experience to match the provided mock closely, so that the product feels intentional and polished.

## Implementation Decisions

- Step 03 remains the mapping stage, but the screen should behave like a review-and-validate workbench rather than a simple editor.
- The core layout should be split into two regions:
  - a large left-side mapping surface
  - a narrower right-side validation and preview rail
- The mapping surface should present each row with:
  - source column
  - link direction
  - target field
  - confidence state
  - row-level action
- The table should make unmapped rows and low-confidence rows visually obvious without overwhelming the rest of the list.
- The confidence system should support at least three meaningful states:
  - high confidence
  - needs review
  - low confidence
- The row action model should support at minimum:
  - fixing or editing a problematic mapping
  - viewing additional row actions in an overflow menu
- Search should operate on the visible mapping rows so users can quickly locate source or target names in larger workbooks.
- The validation rail should summarize completion status with a clear blocked-or-ready outcome.
- The validation rail should expose a progress indicator and high-level counts such as auto-mapped and unmapped fields.
- The JSON preview should be derived from the current confirmed mapping state, not from a static sample.
- The footer action should be gated by unresolved mapping issues.
- The final confirmation step should only activate when the required fields are mapped and the run is valid enough to generate output.
- The workbench should be compatible with the existing wizard shell and step progression model.
- The implementation should reuse the existing mapping domain concepts for:
  - source columns
  - target fields
  - confidence
  - transform rules
  - confirmed mapping output
- The workbench should fit into the existing AI-assisted mapping flow, including suggestion, manual correction, confirmation, and output generation.
- Deep modules should remain focused and testable in isolation:
  - the mapping review table
  - the confidence and status classification logic
  - the output transformation layer
  - the validation summary logic
  - the workbench container that ties them together

## Testing Decisions

- Good tests should verify external behavior only:
  - what rows are shown
  - which states are visible
  - which actions are enabled or disabled
  - what the preview output contains
  - when the user can advance
- The main UI modules to test are:
  - the mapping workbench container
  - the mapping review table
  - the validation summary panel
  - the JSON preview viewer
  - the wizard footer gating logic
- The mapping domain modules to test are:
  - confidence classification and row status logic
  - mapping suggestion generation
  - output transformation from rows to nested JSON
  - validation checks for required mappings
- API-route level tests should cover:
  - suggestion generation
  - confirmation gating
  - output generation
  - failure states when required mappings are missing
- Prior art already exists in the repo for this style of testing:
  - `header-detection.test.ts`
  - `template-import.test.ts`
  - `json-schema.test.ts`
  - `transform.service.test.ts`
- The new tests should match that pattern by exercising the public contract of the module instead of asserting implementation details.

## Tracer-Bullet Implementation Plan

The workbench is broken into three vertical slices that can be built independently in order. Each slice delivers a working, observable milestone.

### 1. Step 03.5 Workbench Shell

**Type:** AFK — Blocked by: None

**User stories covered:** 2, 19, 20, 25

Build the full mapping-workbench page shell so the new step feels like part of the LinkUp wizard before any data interactions land.

**Deliverables:**
- Add "Mapping" as the active stage in the left wizard stepper (step 03, with the 3.5 review sub-stage visually connected).
- Implement the two-region layout: a large left-side mapping surface (placeholder initially) and a narrower right-side validation rail (placeholder initially).
- Add the workbench header with step title and summary description.
- Wire the footer with Back (to upload step), status copy, and a Next button that remains disabled.
- Make the layout responsive — tablet and mobile should stack the two regions vertically.
- Match the warm parchment / charcoal / cream visual direction from the reference mock.

**Exit criteria:** The user can navigate to the workbench step from upload, see the correct stepper state and layout skeleton, and go back. No mapping data is shown yet.

---

### 2. Interactive Mapping Review Table

**Type:** AFK — Blocked by: Issue 1

**User stories covered:** 1, 3, 4, 5, 6, 10, 11, 21, 22, 23

Add the main row-level mapping experience to the left-side surface.

**Deliverables:**
- Render each mapping row with source column, link direction icon, target field chip, confidence badge, and action menu.
- Implement three confidence states: high confidence (green), needs review (amber), low confidence (red).
- Make unmapped source columns visually prominent (e.g., row-level alert styling, missing target indicator).
- Add a "Fix" action that opens an inline target-field picker to set or change the mapping.
- Add an overflow menu for secondary row actions (view reasoning, clear mapping, etc.).
- Implement search over visible rows (source column name or target field name).
- Detect and flag duplicate source-to-target assignments with a visual warning.
- Load mapping suggestions from the existing AI-assisted matching service.

**Exit criteria:** The table renders real mapping data, confidence states are visible and coloured correctly, the user can search, fix unmapped rows, and see duplicates flagged. The right rail still shows placeholders.

---

### 3. Validation Rail and JSON Preview

**Type:** AFK — Blocked by: Issue 2

**User stories covered:** 8, 9, 12, 13, 14, 15, 16, 17, 24

Wire the right-side validation rail to the current mapping state and gate confirmation on readiness.

**Deliverables:**
- Summary card showing auto-mapped count, needs-review count, unmapped count.
- Progress indicator (e.g., fraction or bar) for mapping completeness.
- Blocking-issues list: unmapped required fields, duplicate assignments, etc.
- Overall readiness state: "Ready to confirm" (green) or "Review required" (blocking).
- Live JSON preview panel that derives from the current confirmed mappings and reflects every fix or change immediately.
- Gate the footer Next button — it stays disabled until all blocking issues are resolved and the validation state is green.
- On confirmation, trigger output generation and advance the wizard to step 04 Done.

**Exit criteria:** The right rail reflects the real mapping state, the JSON preview updates live, and the user cannot confirm until the mapping is valid. End-to-end flow from upload through to step 04 is functional.

## Out of Scope

- Rewriting the schema matching algorithm itself.
- Changing the underlying workbook parsing or upload flow.
- Adding multi-user collaboration to the mapping review surface.
- Supporting arbitrarily complex transformation logic inside the workbench.
- Turning the workbench into a modal or drawer.
- Replacing the existing brand direction or typography system.
- Building a full analytics dashboard for mapping history.
- Allowing users to export before required mappings are resolved.

## Further Notes

The most important product outcome is confidence.

This step should make users feel that:
- the system has done useful work
- the interface reveals enough reasoning to be trusted
- the remaining manual effort is clear and finite
- the final JSON output is not a black box

The layout in the mock strongly suggests that the review flow is meant to be dense but still calm. The implementation should preserve that balance, especially on narrower screens where the table, validation rail, and preview can easily become crowded.

