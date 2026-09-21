# API specification / API 規格

[openapi.json](openapi.json) is the machine-readable OpenAPI 3.1 contract for the current mock adapter. Import it into an OpenAPI-compatible viewer or backend tooling. It describes a planned `/api/v1` HTTP interface; the website currently runs without HTTP requests.

[openapi.json](openapi.json) 是目前 mock adapter 的 OpenAPI 3.1 規格，可匯入相容工具供後端開發。`/api/v1` 為未來 HTTP 路徑，目前網站沒有真的 HTTP API。

| Endpoint              | Status / 狀態                                                   |
| --------------------- | --------------------------------------------------------------- |
| GET /site             | Confirmed / 已確認                                              |
| GET /journey          | Confirmed / 已確認                                              |
| GET /experiences      | Confirmed / 已確認                                              |
| GET /projects         | Confirmed / 已確認                                              |
| GET /skill-categories | Current mock only; pending discussion / 僅記錄現有 mock，待討論 |
| GET /skills           | Current mock only; pending discussion / 僅記錄現有 mock，待討論 |

Read [API interface format](../docs/api-interface-format.md) for behavior and [backend handoff](../docs/backend-handoff.md) for implementation decisions. Do not silently redesign the last two endpoints while implementing the first four.

行為規則見 [API interface format](../docs/api-interface-format.md)，實作交接見 [backend handoff](../docs/backend-handoff.md)。開發前四支時不要自行變更尚未討論的兩支技能 API。

After a contract or fixture change, update schemas and the corresponding English response examples. `tests/spec.test.cjs` verifies all local references, operation IDs, review status, required field names and examples against real mock responses. This is a repository consistency check, not a replacement for a full OpenAPI validator in the backend toolchain.

契約或 mock 改動後同步 schema 與英文回應範例。`tests/spec.test.cjs` 核對引用、操作 ID、確認狀態、必要欄位與實際回應；這是專案一致性檢查，後端仍可另接完整 OpenAPI validator。
