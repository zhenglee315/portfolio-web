# Backend handoff / 後端開發交接

The frontend uses an asynchronous in-memory transport over local JSON. No HTTP server, AJAX, database, CMS, authentication or write API is implemented. The API contract is designed for a future adapter; it does not prescribe database table names or require mapping tables.

前端目前使用本地 JSON 的非同步 in-memory transport，尚未建立 HTTP、AJAX、資料庫、CMS、認證與寫入 API。規格約束回應格式，不強制資料庫表設計，也不要求額外 mapping table。

## Contract sources / 規格來源

- [OpenAPI 3.1](../spec/openapi.json): parameters, required fields, types, nullability, bounds, responses and current examples.
- [API interface format](api-interface-format.md): resource boundaries, sorting, lifecycle, empty values and error semantics.
- [Mock field comments](../mock/README.md): the three localized datasets and per-resource field explanations.

前四支 API 已確認；最後兩支技能 API 仍待逐支討論。OpenAPI 的 `x-contract-status` 明確區分，不把尚未確認的 mock 當成最終後端設計。

## Requests and localization / 請求與語言

Use GET under the planned `/api/v1` base path. Send `locale=en`, `zh-Hans` or `zh-Hant` on every request; omitted requests default to English, unsupported values return 400. Return only the requested language's content, with identical IDs, order and totals across translations. Do not return Markdown links or HTML-escaped text.

每個請求用 query 傳語言代碼，由後端查詢對應內容。固定按鈕、選單、錯誤提示由前端 `src/locales` 負責。語言偏好目前存在 localStorage；主題偏好有 cookie，兩者不混用。未來若語言改 cookie，仍保留明確 query，避免快取混用不同語言。

For editors, accept ordinary text with normal line breaks. Let the JSON serializer encode `\n`; frontend text nodes/escaping prevent execution and CSS preserves intended breaks. Backend input validation and authorization remain backend responsibilities.

編輯器使用者正常輸入及換行即可，不需輸入跳脫符號。後端以 JSON serializer 編碼；前端當純文字顯示，正常保留換行。輸入驗證與編輯權限仍由後端負責。

## Numbered collections / 經歷與專案分頁

`GET /experiences?locale=en&page=1&size=6` and `GET /projects?locale=en&page=1&size=6` return exactly the five Page fields, without an envelope:

```json
{ "total": 0, "pages": 0, "page": 1, "size": 6, "items": [] }
```

page starts at one; size is always six. Reject `all`, `cursor`, `limit` and `scope`. `pages=ceil(total/size)`; final partial pages retain size=6. A request after the last page returns empty items and preserves the requested page number. An empty collection uses pages=0, not one. Each project returns complete detail and skills; there is no `/projects/{id}` resource.

page 由一開始，size 固定六；空集合 pages=0，末頁仍回 size=6。第一次只取六筆，後續成功才前進頁碼，失敗重試同頁。Projects 的 detail 與 skills 一次完整回傳，卡片展開不再查另一支 API。

The provided `paginate_orm` utility is compatible when invoked with validated integer page and size=6. Its generic `all` branch is not exposed by these two public routes. Enforce the endpoint limits before executing the query, and serialize rows into the documented localized DTO instead of exposing raw database column names.

既有 paginate_orm 可以沿用；這兩個 route 先驗證 page 和 size=6，不向前端開放 all。資料庫 row 轉成已確認 DTO，再交給 Page 回應，不把 ORM 原始欄位名直接當 API 契約。

## Identity and ordering / ID 與排序

Journey, Experience and Project IDs are positive JSON numbers up to 9007199254740991. SQL int8 can store them, but its full range exceeds JavaScript's exact number range. Validate that bound before serialization. IDs are persistent identities, never array indices. Experience and Journey may share the corresponding career ID; Project IDs belong to their own resource.

後端決定穩定順序，前端只依 items 陣列順序追加；Experience 的 order 保留但不在前端重新排序。排序需有唯一 tie-breaker，例如業務排序欄位後接主鍵；三語必須完全一致。不得把不同語言的缺譯記錄直接濾掉，否則分頁總數會不一致。

Numbered responses have no revision token. The client rejects changed totals, duplicate IDs and inconsistent localized order, but cannot guarantee snapshot isolation across queries. Keep ordering stable during paging or provide a future separately agreed consistency mechanism. Legacy cursor resources bind cursors to owner, resource and revision; frontend treats them as opaque.

頁碼契約沒有 revision token，前端能攔截部分資料變動，不能取代資料庫的一致性保證。若要加入 snapshot token，需另行討論，不在這輪偷偷增加欄位。技能游標仍綁定 owner、資源與 revision，前端只原樣帶回。

## Validation details / 驗證細節

| Rule / 規則           | Backend responsibility / 後端處理                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required vs optional  | Follow required arrays in OpenAPI. Do not omit required keys merely because their value is empty. / 依 required 清單，空值不等於可省略。                       |
| Plain display strings | Names and content may be empty strings where no minimum is stated; label array elements must be nonblank. / 未限制最短長度的文字可空；技能與流程元素須非空白。 |
| Month ranges          | YYYY-MM; endMonth cannot precede startMonth. null means ongoing. / 結束不得早於開始，null 表示至今。                                                           |
| endDay                | Career fields only; real day within a non-null endMonth. / 職涯的 endDay 必須是該結束月的合法日期。                                                            |
| expected              | Journey requires boolean; Experience/Project may omit it. Project true requires endMonth. / Journey 必填，其餘選填；Project 預計結束需有結束月。               |
| Career detail         | Optional or null; populated object contains content and its own month range. / 可省略或 null，有值則具備內容與起訖月。                                         |
| Project detail        | Object, null or empty string; all five object keys retained. / 物件、null 或空字串；物件須保留五個欄位。                                                       |
| Project skills/flow   | Complete string array or null; empty/null hides that UI. / 完整文字陣列或 null，空值不顯示。                                                                   |
| Unknown fields        | Frontend retains extra fields but never auto-renders them. / 前端保留額外欄位，不自動建立介面。                                                                |
| Page arithmetic       | Validate total, pages, requested page/size and exact slice length. / 檢查總數、頁數與該頁筆數。                                                                |

OpenAPI describes structural validation; month ordering, actual calendar days, cross-language identities, unique record IDs and Page arithmetic also require application-level validation. UI validators fail atomically and retain previously accepted state.

## Errors and HTTP integration / 錯誤與接線

Return the documented error body with an appropriate non-2xx status. The future HTTP adapter should convert it to Error with status, code, retryable and body, matching the current transport interface. Do not return an HTML error page as successful JSON. Frontend displays its own localized retry text, rather than rendering server messages into HTML.

目前 mock transport 支援 400／404／405／409／500／503 錯誤；client 另會產生 STALE_REVISION 一致性錯誤。無效資料、逾期游標或需重新整理的狀況保留現有內容；503 可重試同頁。HTTP timeout、abort、CORS、快取標頭與正式認證策略尚未實作，依後端部署方式另定。

Replace the transport behind `createPortfolioApi` with the same `request({method,path,query})` shape. Keep client/store/features boundaries. Stop embedding complete mocks in an HTTP production build; otherwise network lazy loading cannot reduce the initial mock bytes. Continue supplying local fonts/icons/map assets so optional API integration does not add third-party asset dependencies.

接正式 API 時只替換 transport、保留 client／store／features 分工，並在該建置模式停止嵌入完整 mock。現有離線版本仍可保留為另一個交付模式，圖示、字型與地圖繼續使用本地素材。

## Acceptance / 交付驗收

Run the mock contract tests against an HTTP adapter in a future integration suite, covering all locales, 0/1/6/7/many records, complete pagination, partial last page, same-month order, failed-page retry, null detail, plain line breaks and concurrent language changes. Current tests validate the offline implementation only; they do not certify a backend that has not yet been written.

後端接好後，應以相同契約測試再驗證 HTTP adapter，涵蓋三語、零／單／六／七／多筆、末頁、排序、重試、空值、換行及切換語言。這輪完成的是離線實作與交接規格，不把尚未開發的後端宣稱為已驗證。
