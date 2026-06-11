# Schema Template Header Detection PRD

## Problem Statement

Users can upload Excel workbooks that contain explanatory rows, remarks, and formatting rows before the real header row. The system currently needs a reliable way to recognize the row that defines the import fields for a selected schema template.

The user expectation is simple:
- first choose the schema template
- then upload a workbook that matches that template
- the system should detect the header row from the uploaded sheet
- the system should care that required fields exist, not that columns appear in a fixed order

Today the detection logic is too naive for this template style because it can confuse instruction rows with the actual field row.

## Solution

Use deterministic header detection based on the selected schema template.

The system should:
- treat the schema template as the source of truth for required and optional fields
- scan only the first few rows of the uploaded sheet
- score candidate rows against the template field set
- select the row that best matches the template’s expected fields
- verify that all required fields exist in the detected row
- allow column order to vary
- use a fallback user confirmation or secondary heuristic only when the match is ambiguous

The system should not depend on a fixed row number like "row 3".

## User Stories

1. As a user, I want to select a schema template before upload, so that the system knows which fields to look for.
2. As a user, I want the system to detect the header row from the workbook, so that I do not need to manually specify it each time.
3. As a user, I want the system to ignore remarks and instruction rows, so that only the real import fields are used.
4. As a user, I want the system to accept the same fields in any column order, so that formatting differences do not block import.
5. As a user, I want required fields to be validated automatically, so that incomplete workbooks are rejected early.
6. As a user, I want optional fields to be allowed but not required, so that templates remain flexible.
7. As a user, I want the system to explain when a required field is missing, so that I can fix the workbook quickly.
8. As a user, I want the detection to work consistently across repeated uploads, so that the same template behaves predictably.
9. As a user, I want the system to handle sheets with explanatory text above the headers, so that common Excel template layouts still work.
10. As a user, I want the system to scan only a small portion of the workbook, so that uploads stay fast.
11. As a user, I want the system to avoid unnecessary AI calls during normal uploads, so that detection stays cheap and predictable.
12. As a user, I want the system to fall back to a secondary check only when the header match is unclear, so that edge cases can still be handled safely.
13. As a user, I want the system to identify the correct sheet before header detection, so that multi-sheet workbooks still work.
14. As a user, I want the selected schema template to define which fields matter, so that the import flow stays template-driven.
15. As a user, I want a workbook with the same fields in a different order to still be accepted, so that I do not need to rearrange columns.
16. As a user, I want the system to reject a workbook when the required fields are not present, so that bad imports do not continue downstream.
17. As a user, I want the import flow to remain simple, so that I can upload a file, confirm the preview, and proceed.
18. As a user, I want the system to preserve the canonical schema layout for each template, so that future uploads can be checked against one expected field shape.
19. As a user, I want the system to treat header text as the main signal, so that sheet names and workbook decoration do not matter more than the actual field names.
20. As a user, I want the system to tolerate different sheet names for the same template, so that workbook naming differences do not break import.

## Implementation Decisions

- Extend schema template metadata so each template can represent one canonical workbook layout.
- Use the template’s field set as the primary detection signal for uploaded workbooks.
- Normalize candidate header text before comparison.
- Strip formatting noise from candidate cells such as remarks prefixes, line breaks, and descriptive labels.
- Treat column order as non-strict for matching.
- Validate that all required fields are present in the detected header row.
- Allow optional fields to be absent without failing detection.
- Scan only the top portion of the sheet, not the entire workbook.
- Prefer deterministic scoring over AI-based row selection.
- Use AI only as a fallback for ambiguous or low-confidence matches.
- Keep the sheet-selection step separate from the header-row detection step.
- Persist enough template metadata to support repeatable matching for future uploads.
- Return a clear validation error when required fields are missing.
- Keep the header-detection logic isolated so it can be tested without the full upload UI.
- Preserve the current workbook preview flow and feed the detected header row into it.
- Make the matching logic stable enough to support repeated uploads of the same template.

## Testing Decisions

- Unit test the header-row scorer against workbook samples with:
  - a remarks row above the headers
  - an instruction row above the headers
  - the real header row in a later position
  - reordered columns
  - missing required fields
- Unit test normalization so that punctuation, line breaks, and prefix labels do not break matching.
- Unit test the required-field check so missing mandatory fields fail clearly.
- Unit test the ambiguity path so close candidate rows do not produce silent mis-detection.
- Integration test the workbook upload and preview flow using a fixture workbook that matches the template style.
- Integration test the mapping-run creation path to ensure the detected header row feeds downstream preview data correctly.
- Test external behavior only:
  - which row is selected
  - whether required fields are accepted or rejected
  - whether the preview rows are built from the correct header row
- Prefer fixture-based tests that mirror the real workbook shape rather than mocking every parsing detail.

## Out of Scope

- Supporting multiple canonical layouts per schema template.
- Making AI the primary detector for every upload.
- Building a user-facing header-row editor for every upload.
- Normalizing arbitrary spreadsheet styles into a universal template format.
- Supporting freeform mapping between unrelated workbook structures and templates.
- Reworking the full schema creation flow beyond what is needed to capture canonical layout metadata.
- Importing data when required fields are missing.
- Supporting all possible spreadsheet anomalies beyond the selected canonical template pattern.

## Further Notes

The key product rule is:
- template first
- header text as the primary match signal
- order does not matter
- required fields must exist

The likely failure mode to protect against is a workbook that contains descriptive rows above the real header row. The system should reliably skip those rows without hardcoding a fixed row number.

If the match confidence is low, the system should stop and ask for confirmation rather than silently choosing the wrong row.
