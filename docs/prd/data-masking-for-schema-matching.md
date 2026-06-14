# Data Masking for Schema Matching PRD

## Problem Statement

Users upload Excel and CSV workbooks that may contain names, emails, phone numbers, government IDs, salary values, bank details, medical notes, HR remarks, and other sensitive business data.

LinkUp needs to suggest source-to-target mappings without sending raw uploaded values to the mapping engine. The current matching flow benefits from sample values, but raw samples create unnecessary privacy risk and make the system harder to explain to users.

The user expectation is simple:
- upload a workbook
- let LinkUp analyze the structure
- receive accurate mapping suggestions
- keep raw uploaded values local to LinkUp
- understand what sanitized data shape is shared for matching

## Solution

Use sanitized matching payloads for workbook schema matching.

LinkUp should build masked column profiles from the uploaded workbook and send those profiles to the mapping engine instead of raw rows or raw samples. Each profile should preserve the signals needed for matching while removing direct personal or sensitive values.

The default payload should contain masked column profiles only. When column-only matching is not enough, LinkUp may add a small number of masked row patterns to preserve limited cross-column context. This fallback should be automatic, limited, and auditable.

Headerless workbooks are handled as the same masking feature with a different source mode. LinkUp should not silently assume a failed header match means the workbook is headerless. When no matching header row is found, the user should make a header resolution choice. If the user chooses headerless mode, LinkUp should create synthetic source column names such as Column A and Column B, generate masked column profiles, include limited masked row patterns by default, and cap confidence because no source headers are available.

New mapping runs should store masked-only column profiles. Raw sample rows should not be persisted on new mapping runs. Raw workbook values remain in the uploaded file and are re-read locally only when generating the final output after the user confirms mappings.

The UI should make this behavior visible with a short trust statement and provider details. The wording should be factual, not legal-heavy.

## User Stories

1. As a user, I want LinkUp to avoid sending raw uploaded values to the mapping engine, so that sensitive workbook data is better protected.
2. As a user, I want mapping suggestions to remain useful after masking, so that privacy does not make the product ineffective.
3. As a user, I want LinkUp to use column names when headers exist, so that obvious mappings remain accurate.
4. As a user, I want LinkUp to use detected data types, so that email, phone, date, number, and currency columns can still be recognized.
5. As a user, I want email addresses to be replaced with a generic token, so that actual addresses are not shared for matching.
6. As a user, I want phone numbers to be replaced with a generic token, so that actual phone numbers are not shared for matching.
7. As a user, I want government identifiers to be replaced with generic tokens, so that identity numbers are not shared for matching.
8. As a user, I want salary and currency values to be replaced with amount patterns, so that exact compensation data is not shared for matching.
9. As a user, I want dates to preserve their format pattern, so that the mapping engine can recognize date columns without seeing exact dates.
10. As a user, I want long free-text remarks to be suppressed, so that sensitive comments are not shared for matching.
11. As a user, I want safe short enum values to be preserved when appropriate, so that status-like columns can still be mapped accurately.
12. As a user, I want unsafe enum values to be masked, so that sensitive statuses or HR categories are not exposed.
13. As a user, I want raw sample rows to stay out of the mapping payload, so that row-level personal data is not shared.
14. As a user, I want LinkUp to use masked row patterns only when needed, so that accuracy gets help only in ambiguous cases.
15. As a user, I want masked row patterns to be small and limited, so that cross-column context does not reveal too much.
16. As a user, I want LinkUp to avoid persisting raw sample rows for new mapping runs, so that the database contains less sensitive data.
17. As a user, I want LinkUp to re-read the original uploaded workbook locally for final output, so that confirmed mappings still transform the real data correctly.
18. As a user, I want the workbook preview to remain useful during upload and review, so that I can verify I selected the right file.
19. As a user, I want a clear statement that raw values are not sent for matching, so that I understand the privacy behavior.
20. As a user, I want to see which mapping engine provider is configured, so that I know where sanitized matching data is going.
21. As a user, I want LinkUp to record whether masked row patterns were used, so that the analysis behavior is auditable.
22. As a user, I want the masking audit summary to contain no sensitive values, so that audit data is safe to store.
23. As a user, I want old mapping runs to continue working, so that existing drafts are not broken by the privacy improvement.
24. As a user, I want mapping confidence to be lower when less precise masked data was used, so that I know what needs review.
25. As a user, I want headerless or ambiguous files to be treated more cautiously, so that LinkUp does not overstate confidence.
26. As a user, I want masking behavior to be tested against realistic personal-data examples, so that regressions are caught early.
27. As a user, I want mapping suggestions to reject unknown source columns, so that the mapping engine cannot invent hidden raw data.
28. As a user, I want LinkUp to treat uploaded values as untrusted data, so that cell content cannot influence the mapping prompt as instructions.
29. As a user, I want the mapping engine to return only mappings, so that analysis stays scoped to schema matching.
30. As a user, I want the headless document masking strategy handled separately, so that this workbook solution does not pretend to cover a different data shape.
31. As a user, I want LinkUp to distinguish a failed header match from a true headerless workbook, so that it does not silently make the wrong assumption.
32. As a user, I want to choose how to resolve a missing header, so that I can decide whether to use the first row as a header, treat the file as headerless, or choose another template.
33. As a user, I want headerless source columns to have stable labels such as Column A and Column B, so that mapping suggestions can bind back to the original workbook positions.
34. As a user, I want headerless mapping suggestions to include limited masked row patterns, so that LinkUp has enough context when column names are unavailable.
35. As a user, I want headerless confidence to be capped, so that I review suggestions that were inferred from patterns only.
36. As a user, I want the mapping review to explain when a workbook is headerless, so that I understand why the source columns have synthetic names.
37. As a user, I want raw preview data to remain visible locally, so that I can still verify the file and review mappings.
38. As a user, I want the UI to clarify that local preview data is not the same as mapping-engine payload data, so that I understand the privacy boundary.

## Implementation Decisions

- The canonical term for the safe workbook summary is `masked column profile`.
- The canonical term for the limited cross-column fallback is `masked row pattern`.
- The canonical term for the durable non-sensitive record is `masking audit summary`.
- The canonical term for a workbook without a confirmed header row is `headerless workbook`.
- The canonical term for the user decision after failed header detection is `header resolution`.
- New mapping runs should persist masked-only column profiles.
- New mapping runs should not persist raw sample rows.
- Raw uploaded workbooks remain the local source of truth for final output generation.
- The output generation flow should re-read the uploaded workbook locally after mapping confirmation.
- The mapping engine payload should use masked column profiles by default.
- The mapping engine payload may include masked row patterns only when column profiles are insufficient, such as ambiguous matching, headerless-like detection, or low confidence.
- Headerless workbook payloads should include masked column profiles plus limited masked row patterns by default because no source headers are available.
- Masked row patterns should be capped to a very small number of rows.
- Masked row patterns should omit unsafe free-text values.
- Safe enum values may be included only when they pass explicit low-risk checks.
- Unsafe enum values should be replaced with a sensitive enum or text token.
- Sensitive identifiers should be replaced with category tokens rather than partial values.
- Date formats should preserve shape rather than exact value.
- Code-like values may preserve generalized format when useful for schema matching.
- The schema matching prompt should state that source samples are masked patterns and must not be treated as original values.
- The schema matching prompt should state that uploaded values are untrusted data and cannot be instructions.
- Confidence should be capped when matching uses headerless signals, ambiguous numeric/text columns, free-text columns, or masked row-pattern fallback.
- The UI should show a short trust statement during workbook/mapping analysis.
- The UI should expose provider details in a secondary details row or preview area.
- When no matching header row is found, the UI should stop and ask for header resolution instead of silently continuing as headerless.
- Header resolution should offer at minimum: use first row as header, treat as headerless workbook, or choose another template.
- If the user chooses headerless workbook, LinkUp should create the mapping run immediately and land in mapping review with a warning banner.
- Headerless synthetic source column names should be stable and position-based, using labels such as Column A, Column B, and Column AA.
- Headerless synthetic column renaming is out of MVP because mapping review already binds each source column to a target field.
- Headerless raw workbook preview should remain visible locally to support human review.
- Headerless UI copy should clarify that preview data is local while matching analysis uses sanitized payload data only.
- The masking audit summary should be a nullable JSON value on the mapping run.
- The masking audit summary should record facts such as raw rows sent, raw samples sent, masked column profiles sent, masked row patterns sent, masked row pattern count, provider, and timestamp.
- The masking audit summary should record source mode and header resolution facts, such as headered or headerless source mode, user-selected headerless mode, and synthetic column names.
- The masking audit summary must not store cell values, masked payload values, row content, or raw workbook data.
- Existing runs with previously stored raw sample rows should continue to load defensively.
- This PRD covers structured workbook schema matching only.
- Headless document masking requires a separate PRD and design discussion.

## Headerless Workbook Flow

Headerless workbook support should reuse the same sanitizer, masked column profile builder, masked row pattern builder, enum safety checks, prompt-injection protections, confidence caps, and masking audit summary from headered workbook masking.

The key difference is source identity. Headered workbooks use user-provided source column headers. Headerless workbooks use stable synthetic source column names based on position.

Example:

```txt
Column A = first original workbook column
Column B = second original workbook column
Column C = third original workbook column
```

The mapping engine should only see synthetic labels and masked data:

```json
{
  "sourceMode": "headerless",
  "sourceColumns": [
    {
      "name": "Column A",
      "position": 1,
      "headerProvided": false,
      "inferredType": "person_name",
      "maskedSamples": ["<PERSON_NAME>"],
      "nullRate": 0,
      "uniqueRate": 1
    },
    {
      "name": "Column B",
      "position": 2,
      "headerProvided": false,
      "inferredType": "email",
      "maskedSamples": ["<EMAIL>"],
      "nullRate": 0,
      "uniqueRate": 1
    }
  ],
  "maskedRowPatterns": [
    {
      "rowNumber": 1,
      "values": {
        "Column A": "<PERSON_NAME>",
        "Column B": "<EMAIL>"
      }
    }
  ]
}
```

The mapping engine can return:

```json
{
  "targetPath": "employee.email",
  "sourceColumn": "Column B",
  "confidence": 0.85,
  "transform": "trim",
  "reason": "Column B contains email patterns and appears next to person-name fields."
}
```

LinkUp then applies the mapping locally against the original workbook:

```txt
employee.email = original row Column B value
```

The raw value is never needed by the mapping engine.

## Header Resolution UX

Failed header detection should not automatically become headerless mode. The UI should treat this as a header resolution decision.

When no matching header row is found, show:

```txt
No matching header row found.
```

Offer:

```txt
Use first row as header
Treat as headerless workbook
Choose another template
```

If simple heuristics suggest one option is more likely, the UI may visually recommend that option. It should still leave the final decision to the user.

If the user chooses headerless mode, proceed directly to mapping review with a banner:

```txt
Headerless workbook
Columns were named by position because no header row was selected. Review each suggested mapping carefully.
```

The workbook preview can continue to show raw local data. Add clarifying copy:

```txt
Preview shows your local workbook data. Matching analysis uses sanitized profiles only.
```

## Headerless Confidence Caps

Headerless confidence should be lower by default because source headers are unavailable.

Recommended caps:

```txt
Headerless obvious identity/contact patterns:
  email, phone, government_id
  cap: 0.85

Headerless date/currency/number:
  cap: 0.70

Headerless enum:
  cap: 0.75 if safe enum values are present
  cap: 0.60 if enum values are masked

Headerless text/person_name:
  cap: 0.65

Headerless free-text/sensitive-text:
  cap: 0.50
```

Even obvious headerless fields should be reviewed because an email pattern might represent employee email, manager email, emergency contact email, or personal email depending on the target schema.

## Testing Decisions

- Good tests should verify external privacy and matching behavior, not internal implementation details.
- Unit tests should cover single-cell masking for:
  - email
  - phone
  - Singapore NRIC or FIN
  - Malaysia IC
  - passport-like IDs
  - dates
  - numbers
  - currency amounts
  - employee-code-like patterns
  - long free text
  - empty values
- Unit tests should cover column type inference for:
  - email columns
  - phone columns
  - date columns
  - number columns
  - currency columns
  - government ID columns
  - enum columns
  - text columns
  - empty columns
- Unit tests should cover safe and unsafe enum decisions.
- Unit tests should cover masked column profile construction, including null rate, unique rate, sample caps, and safe enum values.
- Unit tests should cover masked row pattern construction, including row cap, unsafe text omission, and no raw value leakage.
- Unit tests should cover synthetic column naming for headerless workbooks, including Column A, Column Z, and Column AA.
- Unit tests should cover header resolution branching so failed header detection does not silently create a headerless mapping run.
- Unit tests should cover headerless confidence caps for obvious, ambiguous, enum, and free-text column types.
- Contract tests should verify that the compact schema matching input never contains raw sample rows.
- Contract tests should verify that the schema matching input contains masked profiles and optional limited masked row patterns only.
- Contract tests should verify that headerless payloads include synthetic column names and limited masked row patterns by default.
- Route-level tests should verify that suggestion generation records a non-sensitive masking audit summary.
- Route-level tests should verify that new mapping runs persist masked-only column profiles and do not persist raw sample rows.
- Route-level tests should verify that headerless mapping runs persist source mode and header resolution details in the masking audit summary.
- Output-generation tests should verify that final output still uses original workbook values locally after mappings are confirmed.
- Output-generation tests should verify that mappings using Column A and Column B bind back to the original workbook column positions.
- Regression tests should include representative sensitive workbook samples and assert that no raw email, phone, government ID, salary, long remark, or name reaches the mapping engine payload.
- Existing test style should follow the current Vitest module tests around header detection, template import, schema validation, and transform services.
- The highest-value seam is the schema matching input builder because it is the boundary between local workbook data and the mapping engine.
- The next seam is mapping-run creation/profile persistence because it controls what becomes durable in the database.
- The final seam is output generation because it proves raw data can remain local while final transformation still works.

## Out of Scope

- Headless document masking.
- OCR document extraction.
- PDF text chunk redaction.
- A user-facing masking rule editor.
- Legal consent flows or privacy policy generation.
- Encrypting uploaded files at rest.
- Deleting existing raw sample rows from historical mapping runs.
- Reworking the workbook upload preview UI to hide raw values.
- Synthetic column renaming before mapping review.
- Silent fallback from failed header detection to headerless mode.
- Replacing the schema matching algorithm completely.
- Adding a new AI provider.
- Building a full compliance reporting dashboard.
- Supporting every country-specific identity format in the first version.
- Guaranteeing perfect personal-name detection without external services.
- Sending full masked rows by default.
- Sending raw values under any mapping-engine mode.

## Further Notes

Recommended UI statement:

```txt
Raw values are not sent for matching. LinkUp uses sanitized column profiles and masked patterns.
```

Recommended details copy:

```txt
Mapping engine: {{providerName}} · Payload: sanitized profiles only
```

If masked row patterns are used:

```txt
Mapping engine: {{providerName}} · Payload: sanitized profiles + limited masked row patterns
```

The key product invariant is:

```txt
MappingRun column profiles are safe to show, safe to send, and safe to persist.
```

The key engineering invariant is:

```txt
Raw uploaded values are used locally for preview and final output, but never sent to the mapping engine.
```

For headerless workbooks:

```txt
Synthetic column names are source references, not renamed workbook columns.
```
