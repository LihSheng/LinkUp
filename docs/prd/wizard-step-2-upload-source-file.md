# Wizard Step 2: Upload Source File PRD

## Problem Statement

Users can choose a schema template in step 1, but the product still needs a clear step 2 where they upload the source file that will be read, profiled, and prepared for mapping.

Today the wizard shell already shows step 2 as "Upload source file", but the actual experience is still only a placeholder. The product needs a defined upload step that is simple, predictable, and visually consistent with the LinkUp Workbench style.

## Goal

Provide a step 2 upload surface where the user can:
- upload one source file
- see that the file has been accepted
- inspect the workbook context needed for the next step
- continue to mapping only after a file is present

The step should stay low-friction. No extra configuration before the upload, no branching choices before the file is loaded.

## Design Reference

This PRD follows the upload wizard mock in:
- `C:\Users\Lih Sheng\Downloads\modal\DESIGN.md`
- `C:\Users\Lih Sheng\Downloads\modal\code.html`
- `C:\Users\Lih Sheng\Downloads\modal\screen.png`

The intended pattern is:
- full-page wizard layout, not a popup modal
- left sidebar stepper with step 02 active
- large main panel with headline, summary, and stats
- central drag-and-drop upload area
- uploaded file summary card
- footer with Back, status copy, and Next

## User Stories

1. As a user, I want to upload my source file in step 2, so that the wizard can prepare it for mapping.
2. As a user, I want to drag and drop a file or browse my computer, so that upload is quick.
3. As a user, I want the system to accept a single source file only, so that the workflow stays focused.
4. As a user, I want to know when the file has been accepted, so that I can continue with confidence.
5. As a user, I want to remove the uploaded file before continuing, so that I can correct a wrong selection.
6. As a user, I want the wizard to keep me on step 2 until a file exists, so that I do not reach mapping without input.
7. As a user, I want the upload step to show workbook context such as sheets, samples, and columns, so that I know what was detected.
8. As a user, I want the upload experience to feel consistent with the rest of LinkUp, so that the wizard feels like one product.

## Scope

### In Scope

- Step 2 of the wizard flow.
- Single-file upload for the source workbook.
- Drag-and-drop and click-to-browse interaction.
- Accepting the file and showing a file summary state.
- Showing workbook context after upload, including detected sheet count, sample count, and column count where available.
- Removing the selected file before continuing.
- Back navigation to the schema step.
- Next navigation to the mapping step only after a file is present.

### Out of Scope

- Multiple-file upload.
- Editing the source workbook in the browser.
- Full mapping logic.
- Output generation.
- Advanced upload settings such as per-file transformations, field rules, or parsing options.
- Admin-only workflow branching.
- Auto-fixing malformed workbooks beyond validation and preview.

## Step 2 Behavior

### Entry Conditions

- Step 2 becomes available after the user has completed or selected a schema template in step 1.
- If the user reaches step 2 without a valid template context, the wizard should send them back to step 1.

### Upload Surface

- The primary action is a dropzone-style upload area.
- The user can drag a file onto the dropzone or click to browse local files.
- The upload area should clearly state the accepted source type in the UI.
- The upload interaction should be limited to one file at a time.

### Accepted File Types

Recommended supported file types:
- `.xlsx`
- `.xls`
- `.csv`

If the product decides to restrict the first release to Excel only, the UI copy and validation must match that limitation exactly. Do not imply CSV support if the backend does not accept it.

### Upload Result

After a successful upload, the step should show:
- the file name
- file size
- a ready state or equivalent status text
- a remove action

The page should also present workbook context, such as:
- number of sheets detected
- number of sample rows used in preview
- number of columns detected

### Continue Rule

- The Next button remains unavailable, or the step clearly blocks progression, until a file has been uploaded successfully.
- Once a file exists, the user can proceed to mapping.

### Removal Rule

- The user can remove the selected file before moving forward.
- Removing the file returns the step to its pre-upload state.

## Information Architecture

### Sidebar Stepper

The wizard should keep the four-step structure:
- 01 Schema
- 02 Upload
- 03 Mapping
- 04 Done

Step 2 should stay visually active while the user works in this stage.

### Main Area

The main area should contain:
- step label
- title
- supporting description
- upload dropzone
- uploaded file summary card
- helper note or skeleton note
- footer actions

### Footer

- Back returns to step 1.
- Next advances to step 3 only when a file is present.
- The footer status copy should tell the user what is still required.

## Upload Validation

- Reject empty submissions.
- Reject unsupported file types.
- Show a clear error when no file is selected.
- Prevent multiple simultaneous uploads.
- Keep validation text simple and direct.

Recommended validation copy:
- "A file upload is required."
- "Unsupported file type."
- "File is too large."

If size limits exist, they must be visible in the UI and enforced by validation. The mock shows a 50MB ceiling, so that is the default assumption for this PRD unless the team changes it.

## Workbook Preview Expectations

The upload step is not just a file picker. It prepares the workbook for mapping.

After upload, the system should be able to surface:
- the best sheet or selected sheet
- detected headers
- sample rows
- column profiles or equivalent lightweight structure

The upload step does not need full mapping suggestions yet, but it should leave the workbook ready for the mapping step to consume.

## Interaction Rules

1. Clicking the dropzone or browse action opens a local file picker.
2. Dragging a file over the dropzone highlights the target area.
3. Dropping a file starts upload immediately.
4. Successful upload swaps the empty state for the file summary state.
5. The remove action clears the selected file.
6. Back returns to the previous wizard step.
7. Next advances only when the step has a valid uploaded file.
8. The upload step should not silently advance the user after file selection.
9. If upload fails, the step remains on step 2 and shows the error.

## State Management

- The wizard should remember whether a file has been uploaded for the current run.
- A successful upload should persist enough metadata for the next step to read workbook details.
- The file summary should reflect the latest accepted file.
- Removing the file should clear the upload state for the current wizard session.

## Accessibility

- The dropzone must be reachable by keyboard.
- The file picker trigger must have a clear accessible label.
- Upload status messages must be announced in a way screen readers can understand.
- The remove action must be labeled clearly.
- The stepper and footer actions must remain keyboard accessible.

## Responsive Behavior

- Desktop: preserve the two-column wizard layout with the left stepper and the main upload panel.
- Tablet: allow the main upload panel to compress without losing the file summary and footer.
- Mobile: stack the content vertically, keep the primary upload action prominent, and avoid crowding the footer.

## Visual Direction

The step should follow the LinkUp Workbench style used in the reference:
- warm parchment background
- charcoal primary text and action buttons
- soft cream borders
- rounded cards and containers
- calm, focused spacing
- restrained status copy

The upload zone should feel inviting but not playful. It should look like a work tool, not a consumer cloud-storage page.

## Acceptance Criteria

- Step 2 is titled "Upload source file".
- The user can upload one source file from the local machine.
- The user can drag and drop or browse to choose a file.
- The UI shows a file summary after upload.
- The user can remove the file before continuing.
- The Next action is gated until upload is complete.
- The user can go back to step 1.
- The screen matches the provided wizard visual direction.

## Testing Notes

- Verify the upload control accepts a file from the local picker.
- Verify drag-and-drop starts upload.
- Verify the summary card appears after success.
- Verify unsupported or empty upload states fail clearly.
- Verify remove returns the step to its empty state.
- Verify Next does not proceed without a file.
- Verify the layout still reads correctly on narrow screens.

## Open Questions

1. Should step 2 accept CSV in the first release, or only Excel files?
2. What is the final file size limit?
3. Should the upload step show sheet selection here, or defer that to mapping?
4. Should a failed upload keep any partial workbook metadata visible?
5. Should the file summary show only one selected file, or allow replacement in place?
