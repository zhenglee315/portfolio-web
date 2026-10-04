# API specification / API 規格

[openapi.json](openapi.json) is the machine-readable OpenAPI 3.1 contract for the six public GET routes implemented under `/portfolio` by the backend. Import it into an OpenAPI-compatible viewer or frontend tooling. English examples use the current localized mock fixtures.

[openapi.json](openapi.json) 是後端六支 `/portfolio` 公開 GET 路由的 OpenAPI 3.1 規格，可匯入相容工具供前端串接。英文範例採用目前的三語 mock 資料。

| Endpoint                        | Response / 回應                                  |
| ------------------------------- | ------------------------------------------------ |
| GET /portfolio/site             | Direct localized site object / 直接回傳網站物件  |
| GET /portfolio/journey          | Direct localized array / 直接回傳旅程陣列        |
| GET /portfolio/experiences      | Numbered page, six items / 六筆頁碼分頁          |
| GET /portfolio/projects         | Numbered page, full details / 六筆完整專案分頁   |
| GET /portfolio/skill-categories | Cursor page and six-skill previews / 游標與預覽  |
| GET /portfolio/skills           | Cursor page of localized labels / 分類技能游標頁 |

Read [API interface format](../docs/api-interface-format.md) for pagination, locale and error behavior. Successful responses contain direct data or page objects: category previews alone include `included.skills`, while `/skills` returns labels in `items`.

分頁、語系與錯誤規則見 [API interface format](../docs/api-interface-format.md)。成功回應直接提供資料或頁面物件；只有分類預覽另外提供 `included.skills`，技能列表在 `items` 直接帶文字。

After a contract or fixture change, update schemas and the matching English examples. The local spec test checks references, paths, parameters, required fields and examples against the fixtures. The backend's live `/openapi.json` remains the runtime source for deployment-specific metadata.

契約或 mock 改動後同步 schema 與英文回應範例。本地規格測試核對引用、路由、參數、必要欄位與資料範例；部署時的資訊以後端即時 `/openapi.json` 為準。
