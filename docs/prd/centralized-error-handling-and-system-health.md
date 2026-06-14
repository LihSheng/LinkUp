# Centralized Error Handling and System Health PRD

## Problem Statement

Users can currently hit errors while using LinkUp without a consistent explanation of what failed or whether the whole system is unavailable.

The current implementation is moving toward centralized API error handling, but the behavior is still split across route handlers, client fetch calls, page-level error boundaries, and ad hoc local catches. That means future error handling changes may require edits in many places, and users may see different messages for the same class of failure.

The product needs one reliable error contract that covers two user-facing scenarios:

1. The system is not operational, such as database connectivity failure or another critical dependency outage that prevents LinkUp from functioning.
2. A partial feature failed, such as upload, schema template editing, mapping suggestion, confirmation, or output generation failing while the rest of LinkUp can still be used.

## Solution

Create a centralized error handling model for LinkUp API endpoints and client API access.

All LinkUp API responses should use a shared error envelope when something fails. The envelope should describe the error category, user-safe message, reference code, retryability, and whether the failure represents a system outage or a local feature failure.

The server should normalize thrown errors at the API boundary. Route handlers should focus on business behavior and throw typed domain/application errors when they need a specific response. Database connectivity and critical dependency failures should be classified as system-level errors. Validation, not-found, conflict, and feature-specific failures should be classified as partial errors unless they prove the system is unavailable.

The client should stop reading API failures manually in each screen. All application API calls should go through one connector that parses the shared envelope, raises a typed client error, and triggers the correct user feedback pattern.

The user experience should be:

- If LinkUp is down, show a clear system unavailable state with retry guidance and a support reference.
- If one function fails, keep the rest of the page usable and show localized feedback for the failed action.
- If a page render crashes, show the existing page error fallback with a reference code that can be matched to logs.
- If a user action fails, show a consistent toast or inline error based on the feature context.

## User Stories

1. As a LinkUp user, I want to know when the whole system is unavailable, so that I do not waste time retrying individual actions.
2. As a LinkUp user, I want to know when only one action failed, so that I can continue using other parts of the system.
3. As a LinkUp user, I want clear retry guidance after a temporary failure, so that I can recover without guessing.
4. As a LinkUp user, I want a support reference code when something breaks, so that support can locate the matching log entry.
5. As a LinkUp user, I want validation errors to be explained separately from system failures, so that I can fix my input instead of assuming LinkUp is down.
6. As a LinkUp user, I want upload failures to appear near the upload workflow, so that the rest of the wizard remains understandable.
7. As a LinkUp user, I want schema template failures to stay localized to schema selection or editing, so that I can decide whether to retry or pick another template.
8. As a LinkUp user, I want mapping suggestion failures to explain that the mapping step failed, so that I know the upload and schema may still be valid.
9. As a LinkUp user, I want output generation failures to explain that final output failed, so that I do not lose confidence in earlier mapping work unnecessarily.
10. As a LinkUp user, I want the dashboard and wizard to use the same error language, so that LinkUp feels predictable.
11. As a LinkUp user, I want retryable errors to be marked as retryable, so that I know when trying again may help.
12. As a LinkUp user, I want non-retryable errors to tell me what to correct, so that I do not repeat the same action.
13. As a LinkUp user, I want a database outage to be treated as a system problem, so that I understand that my import data is not the cause.
14. As a LinkUp user, I want a single failed API endpoint to be treated as a partial failure when the rest of the system is still available, so that I can keep working.
15. As a LinkUp user, I want SWR loading and error states to follow the same behavior as button-triggered actions, so that page load failures and action failures feel consistent.
16. As a LinkUp user, I want the page-level error screen to show a reference code that support can actually trace, so that reported crashes are actionable.
17. As a developer, I want route handlers to rely on one shared error normalizer, so that new endpoints do not copy error response logic.
18. As a developer, I want client API calls to rely on one connector, so that future error UI changes do not require edits across every screen.
19. As a developer, I want typed application errors for expected business failures, so that domain failures are not treated as unknown crashes.
20. As a developer, I want database connection failures to be classified centrally, so that all affected endpoints return the same system-level response.
21. As a developer, I want validation, not-found, conflict, and permission-style failures to be classified centrally, so that API behavior remains predictable.
22. As a developer, I want an operational health endpoint, so that the app can tell whether LinkUp is available before or after a critical failure.
23. As a developer, I want tests around the error contract, so that new endpoints cannot accidentally return a different shape.
24. As a developer, I want tests around client error handling, so that system-down and partial-failure behavior remain distinct.
25. As a developer, I want legacy manual fetch parsing removed gradually, so that the codebase becomes cleaner without a risky rewrite.
26. As a developer, I want partial failures to preserve the current wizard state where possible, so that users do not lose mapping run work after a recoverable failure.
27. As a developer, I want critical failures to be observable in logs with stable fields, so that production diagnosis is faster.
28. As a developer, I want the implementation to fit Next.js App Router conventions, so that it remains compatible with the current project shape.

## Implementation Decisions

- Keep centralized server handling at the API route boundary through a shared route wrapper or route factory.
- Do not rely on middleware as the main error catcher, because route handler exceptions need to be normalized at the handler boundary.
- Standardize API failures into one error envelope with:
  - user-safe message
  - stable reference code
  - category
  - HTTP status
  - retryable flag
  - operational scope
- Use `system` scope for critical dependency failures that make LinkUp unavailable, especially database connectivity failure.
- Use `partial` scope for feature-level failures where the application shell and other workflows can remain usable.
- Use typed application errors for expected business failures such as not found, conflict, validation, unsupported input, and feature-specific blocked actions.
- Keep unexpected thrown errors as internal failures, but normalize them into the shared envelope before responding.
- Log the same reference code returned to the client, along with the normalized category and original server error details.
- Add or formalize a health check endpoint that verifies the critical system dependency needed for LinkUp to operate.
- Treat the database as a critical health dependency for this phase.
- Keep AI provider outages as partial failures when the base application, schema work, upload, and manual mapping can still operate.
- Create a single client API connector for application API calls.
- The client API connector should catch both non-OK HTTP responses and network-level fetch failures.
- The client API connector should throw a typed client error that carries category, status, reference code, retryability, and operational scope.
- SWR fetchers should use the same client connector instead of raw JSON parsing.
- User-triggered mutations should use the same client connector instead of per-screen response parsing.
- System-level errors should trigger a global system unavailable surface or blocking banner.
- Partial errors should trigger feature-local feedback, such as inline error state or toast, while preserving usable page state.
- Page-level render crashes should use the Next.js error boundary and display a traceable reference. When Next.js provides a digest, prefer that digest over generating an unrelated client-only code.
- Existing local feature handling may remain only where it adds domain-specific recovery behavior, but it should consume typed errors from the connector instead of parsing raw responses.
- Avoid broad UI redesign in this PRD; focus on behavior, contract, and consistency.

## Testing Decisions

- Good tests should verify external behavior and contracts, not implementation details.
- Server tests should assert that all normalized API errors return the shared envelope.
- Server tests should cover database connection failure as a system-level `503` response.
- Server tests should cover unknown route failure as a partial or internal `500` response with a reference code.
- Server tests should cover validation failure as a non-system `400` response.
- Server tests should cover not-found and conflict responses as expected partial failures.
- Server tests should cover typed application errors so domain failures do not become unknown crashes.
- Server tests should verify that response reference codes are included in log payloads.
- Health endpoint tests should cover healthy database connectivity and failed database connectivity.
- Client connector tests should cover successful JSON response parsing.
- Client connector tests should cover shared error-envelope parsing.
- Client connector tests should cover non-JSON error responses without crashing the UI.
- Client connector tests should cover network-level fetch failure as system-unavailable behavior.
- Client connector tests should cover retryable and non-retryable error metadata.
- SWR fetcher tests should verify that page load failures use the same typed error path as mutation failures.
- Wizard-flow tests should cover upload, mapping run creation, suggestion, confirmation, and output generation failures as partial failures that preserve as much local state as possible.
- Page error boundary tests should verify that the user sees a retry action and a traceable reference.
- Prior art for these tests includes the existing utility tests, Prisma error classification tests, and wizard API behavior tests.

## Out of Scope

- Building a full production observability platform.
- Adding external error reporting services.
- Adding authentication, roles, or permission enforcement.
- Rewriting the whole wizard state model.
- Redesigning every error message visually.
- Changing the schema template, workbook upload, mapping run, mapping template, or generated output database models unless a small metadata field is proven necessary.
- Changing the AI matching algorithm.
- Treating every AI provider failure as a full system outage.
- Implementing offline mode.
- Adding multi-region or high-availability infrastructure.
- Publishing a public status page.

## Further Notes

Recommended testing seams:

- API route wrapper / route factory for server normalization.
- Error classifier for Prisma, typed application errors, validation errors, and unknown errors.
- Health endpoint for operational status.
- Client API connector for fetch response parsing and network failures.
- SWR fetcher integration for page load behavior.
- Wizard action flows for partial failure behavior.
- Next.js error boundary for render crash behavior.

The key product distinction is not HTTP status alone. The important distinction is operational scope:

- `system`: LinkUp cannot reliably operate because a critical dependency is unavailable.
- `partial`: one feature or action failed, but the user may continue elsewhere.

The implementation should make future error-handling changes happen in the shared server normalizer, the shared client connector, and the small number of UI feedback surfaces, not across every endpoint and page.
