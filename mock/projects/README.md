# Projects mock field notes

`en.json`, `zh-Hans.json` and `zh-Hant.json` contain complete records in authoritative server order. The transport returns six records per page without renaming fields. Keep the same numeric IDs, order, dates and item counts across languages. JSON does not allow comments; this companion document supplies the field comments without polluting API payloads.

| Field                       | Type                         | English field comment                                                                                                                   |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| id                          | number                       | Persistent positive integer identity, independent of array position or language. Maximum 9007199254740991 for exact JavaScript numbers. |
| organizationName            | string                       | Localized organization display name.                                                                                                    |
| organizationCode            | string                       | Organization display abbreviation; not a foreign key to resolve.                                                                        |
| organizationTitle           | string                       | The person's role or study program at this organization.                                                                                |
| startMonth                  | string                       | Project start month in YYYY-MM, not employment start month.                                                                             |
| endMonth                    | string or null               | Project end month in YYYY-MM; null means ongoing. Must not precede startMonth.                                                          |
| expected                    | optional boolean             | Explicit planned completion marker; true requires endMonth. Omission means false.                                                       |
| projectName                 | string                       | Project name shown on the card and dialog heading.                                                                                      |
| projectTitle                | string                       | Short project classification or subtitle; distinct from organizationTitle.                                                              |
| intro                       | string                       | Brief card introduction, not repeated in the detail dialog.                                                                             |
| detail                      | object, null or empty string | Complete dialog content. Null or empty string removes its opener. An object with all empty sections also removes the opener.            |
| detail.workflowDescription  | string or null               | Detailed end-to-end process: input, processing steps and consumers. Empty values hide this section.                                     |
| detail.flow                 | string array or null         | Ordered process labels. Empty or null hides the flow; one label has no connecting arrow.                                                |
| detail.technicalDescription | string or null               | Technical architecture, implementation choices and service interactions.                                                                |
| detail.contribution         | string or null               | The person's concrete responsibilities and implementation work.                                                                         |
| detail.outcome              | string or null               | Supported results or impact; do not invent metrics.                                                                                     |
| skills                      | string array or null         | Complete localized display labels, in display order. Empty or null hides tags; no skill ID lookup or additional request.                |

All fields except `expected` are required. When detail is an object, retain its five keys and use null/empty values for absent content. Empty string values are accepted for display text; skill and flow elements must be nonblank strings. Additional fields are retained but not automatically displayed.

Use ordinary plain text with real line breaks in editor input. A JSON serializer represents breaks as `\n`; users do not type HTML, Markdown or escape codes. The frontend escapes text and preserves line breaks. Keep displayed skills readable (for example Python and FastAPI).

The three fixtures contain 15 projects. Opening details or expanding skills never requests another resource. Only collection pages are lazy loaded. Do not add `scope`, `earlier`, `organizationId`, `skillIds`, `flowKeys` or translation-key mappings.

See [API format](../../docs/api-interface-format.md) and [Projects development](../../docs/projects-development.md) for paging, rendering and verification responsibilities. Update the build revision after editing fixtures.
