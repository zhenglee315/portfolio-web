# Experience mock 欄位註解

`en.json`、`zh-Hans.json`、`zh-Hant.json` 各自保存完整經歷陣列；前端使用 locale 請求，mock transport 才依 page／size 切頁。檔案本身不是 Page 回應，不包含 metadata。三份陣列的 ID、順序及非語言資料一致。

| 欄位              | 規則                            | English field comment                                                       |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------- |
| id                | 正整數，與 Journey 同筆記錄一致 | Stable numeric identity, never derived from array index or translated text. |
| order             | 有限數字；前端不拿來排序        | Backend ordering value retained without client-side reordering.             |
| type              | work 或 education               | Select the shared work or education icon.                                   |
| countryCode       | ISO alpha-3                     | Country code preserved without a frontend mapping table.                    |
| countryName       | 字串                            | Localized country display name.                                             |
| city              | 字串                            | Localized city display name.                                                |
| organizationCode  | 字串                            | Organization abbreviation supplied by the backend.                          |
| organizationName  | 字串                            | Localized organization name.                                                |
| organizationTitle | 字串                            | Localized job title or degree program.                                      |
| startMonth        | YYYY-MM                         | Inclusive starting calendar month.                                          |
| endMonth          | YYYY-MM 或 null                 | Inclusive ending month; null represents an ongoing experience.              |
| endDay            | 選填整數                        | Optional valid calendar day within endMonth; requires a non-null endMonth.  |
| expected          | 選填 boolean                    | Mark an expected end date; omitted is treated as false.                     |
| content           | 純文字                          | Localized experience description; never HTML.                               |
| skills            | 完整 string[]                   | All localized skill labels, in display order; no additional skill requests. |
| detail            | 選填物件或 null                 | Supplemental experience; omit or use null to hide it.                       |
| detail.startMonth | YYYY-MM                         | Supplemental starting month.                                                |
| detail.endMonth   | YYYY-MM 或 null                 | Supplemental ending month; null means ongoing.                              |
| detail.content    | 純文字                          | Localized supplemental role or description.                                 |

detail 亦接受選填 endDay，英文說明：Optional real calendar day within the detail endMonth.

skills 沒有資料時使用 []。detail 有值時以上三個子欄位必填，不使用空物件 {}。所有文字經共用 HTML escape 處理，不解析 HTML 或 Markdown。

API 與前端模組對照見 [Experience 開發文件](../../docs/experiences-development.md)，完整回應見 [API 規格](../../docs/api-interface-format.md)。
