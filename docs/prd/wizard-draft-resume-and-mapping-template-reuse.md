# Wizard Draft Resume and Mapping Template Reuse PRD

## Problem Statement

The wizard currently behaves like a stateless flow. If a user reaches the mapping stage, goes back, or leaves the flow and returns later, they may need to upload the source file and rebuild the mapping work again.

That does not fit real import work. Users need to pause, return, retry, and reuse successful mappings across repeated third-party imports. The product needs persistent draft sessions, a way to name the process before upload, a reusable mapping artifact, and a deterministic way to decide when a previously saved mapping still fits a new source file.

## Solution

Persist each wizard session as a resumable mapping draft, identified by a unique draft token and internal run ID. On step 1, the user selects the schema template first, then either chooses a favorited mapping template to reuse or creates a new process by naming it in a required text field.

When a mapping is successfully confirmed, save the result as a reusable mapping template. Mark that template as eligible for future reuse, and let users flag it as a favorite so it ranks higher in future suggestions.

On new imports, auto-suggest the best matching mapping template instead of making users rebuild the same mapping from scratch. Keep the suggestion non-destructive: users can accept it, override it, or choose another reusable template. Use programmatic source-signature matching first, and fall back to LLM matching only when the source looks different enough that the reuse decision is uncertain.

## User Stories

1. As a user, I want to resume the same draft later, so that I do not need to start over after leaving the wizard.
2. As a user, I want to continue the same draft after going back to earlier steps, so that I do not lose work already completed.
3. As a user, I want multiple drafts under the same schema template, so that I can work on different source files separately.
4. As a user, I want to select a schema template first, so that the rest of the import flow is anchored to the correct target shape.
5. As a user, I want to see favorited mapping templates immediately after selecting a schema template, so that I can reuse the common path fast.
6. As a user, I want to choose a favorited mapping template, so that I can skip creating a new process when an existing one fits.
7. As a user, I want to create a new process only when needed, so that a new source system can get its own draft name.
8. As a user, I want to name the new process in a required field, so that the draft has a stable label before I upload a file.
9. As a user, I want the process name to be validated, so that I cannot continue with an empty or meaningless label.
10. As a user, I want the wizard to resume from a draft token, so that I can continue the same session from a link.
11. As a user, I want the final successful mapping to be saved, so that I can reuse it in the future.
12. As a user, I want the system to save reusable mappings only after final confirm, so that unfinished work does not become a future template.
13. As a user, I want the system to remember my successful import process, so that future imports can reuse it instead of repeating the work.
14. As a user, I want to mark a mapping template as a favorite, so that the most useful mapping is easier to find later.
15. As a user, I want the system to auto-suggest the best matching template for a new file, so that I can move faster on repeat imports.
16. As a user, I want the system to suggest the right template even when the source file is not identical, so that a similar third-party export can still be mapped quickly.
17. As a user, I want multiple saved templates under the same schema template, so that different source systems can map to the same target domain.
18. As a user, I want the system to rank favorite templates higher, so that my preferred reuse path shows up first.
19. As a user, I want to override the suggested template, so that I can choose a better match when the automatic suggestion is wrong.
20. As a user, I want the mapping draft to restore the uploaded file context, so that I do not need to re-upload after a pause.
21. As a user, I want the mapping draft to restore the current mapping state, so that I can continue editing from where I left off.
22. As a user, I want separate successful runs to remain available, so that a schema template can support many source systems over time.
23. As a user, I want a clear display name for each saved draft and template, so that I can manage them by business meaning instead of internal IDs.
24. As a user, I want a helper-tool experience without mandatory login, so that I can use the workflow with low friction.

## Implementation Decisions

- Use the existing `MappingRun` concept as the resumable draft session.
- Allow many mapping runs under one schema template.
- Use a unique internal ID plus a draft token as the real identity for a draft.
- Create the draft as soon as step 1 is confirmed so naming and identity exist before upload.
- Add an editable display name to the draft so users can rename it later.
- Treat step 1 as schema selection plus process selection/creation.
- Keep the selected mapping template or new draft attached to the same draft identity.
- Require the new-process name when the user does not pick an existing favorited mapping template.
- Keep the display name out of identity and lookup logic.
- Save the reusable mapping result only on final confirm.
- Use the existing `MappingTemplate` concept as the reusable successful result.
- Add a favorite flag to reusable mapping templates.
- Rank favorite templates higher during reuse suggestion.
- Auto-suggest the best matching reusable template on new imports.
- Base suggestion on source similarity signals such as header names, header order, sheet name, sample values, column count, and any available source metadata.
- Programmatically compare the uploaded source against the saved template signature before deciding whether reuse still fits.
- Use LLM matching only when programmatic comparison is weak, ambiguous, or clearly drifting.
- Allow the user to accept, override, or choose another reusable template when multiple candidates exist.
- Keep the feature authless for now, but protect resume with an unguessable draft token.
- Do not expose drafts as a public global list.

## Testing Decisions

- Good tests should verify external behavior only.
- Tests should cover draft resume, not internal state mutation details.
- Tests should cover multiple drafts per schema template.
- Tests should cover draft rename behavior without changing identity.
- Tests should cover step 1 behavior for selecting a schema template, choosing a favorite mapping template, and creating a new named process.
- Tests should cover process-name validation before the user can continue.
- Tests should cover final confirm creating a reusable template.
- Tests should cover favorite ranking during template suggestion.
- Tests should cover auto-suggest behavior when similarity is strong, weak, or ambiguous.
- Tests should cover programmatic source drift detection before LLM fallback.
- Tests should cover restoring draft context after reopening the same draft.
- Existing API-route and wizard-flow tests are the right seam to extend because they already cover the upload, mapping, confirm, and output flow.
- Existing domain-level tests around mapping confirmation, output generation, and workbook restore are the prior art to follow.

## Out of Scope

- Full login or account-based authorization.
- Multi-user collaboration on the same draft.
- Sharing drafts across unrelated users without a token.
- Version control with a full revision history for every edit inside a draft.
- Redesigning the wizard shell or step order.
- Changing the schema template creation flow.
- Building a full admin console for template governance.
- Rewriting the schema matching algorithm itself.
- Changing workbook parsing or upload behavior beyond what draft resume needs.
- Turning favorite mapping templates into global permissions or ownership controls.

## Further Notes

The key product shift is from a one-shot wizard to a reusable import tool.

The important user-facing concepts are:
- draft: a resumable in-progress import session
- template: a reusable successful mapping
- favorite: a ranking preference on a template
- source drift: a programmatic mismatch between the current upload and the saved source signature

Step 1 is now the gate where the user picks a schema template and decides whether they are:
- reusing a favorited mapping template, or
- starting a new process with a required name

The team should keep the terminology stable while slicing implementation work. The current repo glossary already anchors the names `schema template`, `mapping run`, `mapping template`, `draft token`, and `display name`.
