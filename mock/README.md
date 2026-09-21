# Mock 資料維護說明

本目錄保存網站的模擬業務資料。JSON 必須維持標準格式，不加入 `//`、`/* */` 或 `_comment` 欄位；本文件及 [site 欄位註解](site/README.md) 是資料的伴隨註解，不會被打包進 API 回應。

目前第 1～4 支 site／journey／experiences／projects 已確認；共六支 API，第 5／6 支技能分類與技能仍保留現有格式，待下一輪討論。

## 檔案與資料用途

共 16 個 JSON，由 [建置清單](../config/build.json) 的 `mock.files` 明確登記，沒有掃描整個目錄自動載入文件。

| 檔案                       | 說明                                                  | English maintenance note                                                           |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `site/en.json`             | 完整英文 site 內容，也是整份語言資料缺失時的 fallback | Complete English SiteData; the fallback for a missing supported-locale fixture.    |
| `site/zh-Hans.json`        | 完整簡體中文 site 內容                                | Complete Simplified Chinese SiteData with the same field paths.                    |
| `site/zh-Hant.json`        | 完整繁體中文 site 內容                                | Complete Traditional Chinese SiteData with the same field paths.                   |
| `journey/en.json`          | 英文完整旅程陣列                                      | Complete direct-text Journey records in authoritative array order.                 |
| `journey/zh-Hans.json`     | 簡體中文旅程陣列                                      | Simplified Chinese content with stable numeric IDs.                                |
| `journey/zh-Hant.json`     | 繁體中文旅程陣列                                      | Traditional Chinese content with matching dates and coordinates.                   |
| `experiences/en.json`      | 英文直接文字經歷與全部技能                            | Complete Experience cards in server order.                                         |
| `experiences/zh-Hans.json` | 簡體經歷                                              | Simplified Chinese cards with stable numeric IDs.                                  |
| `experiences/zh-Hant.json` | 繁體經歷                                              | Traditional Chinese cards with identical IDs and order.                            |
| `projects/en.json`         | 英文完整專案                                          | Full localized projects with complete detail and skills.                           |
| `projects/zh-Hans.json`    | 簡體完整專案                                          | Matching numeric identities, dates and array order.                                |
| `projects/zh-Hant.json`    | 繁體完整專案                                          | Matching keys and total counts; no field mappings.                                 |
| `skills.json`              | items 技能字典與 categories 分類關聯                  | Unique skills and ordered category relationships, projected into bounded previews. |
| `locales/en.json`          | 其他資源的英文業務字典                                | English labels for skills and categories only.                                     |
| `locales/zh-Hans.json`     | 其他資源的簡體中文字典                                | Simplified Chinese business translations for skills and categories.                |
| `locales/zh-Hant.json`     | 其他資源的繁體中文字典                                | Traditional Chinese business translations for skills and categories.               |

site、journey、experiences、projects 的三語 JSON 都是直接文字；mock/locales 只供剩餘兩支技能 API。固定 UI 文案在 src/locales。

## 修改流程

1. 修改 site／journey／experiences／projects 時，在各自三份 `{locale}.json` 保留相同欄位名稱與型別；翻譯值可以不同，姓名及品牌也可以維持相同。
2. 修改技能分類時，維護穩定 skill ID 與分類關聯；業務翻譯鍵及插值參數需在三份 `locales` 一致。
3. 更新 `config/build.json` 的 `mock.revision`，避免把新資料與舊分頁 cursor 混用；新增／移除 JSON 也需同步 `mock.files`。
4. 執行 `node scripts/build.mjs`、`node scripts/test.mjs`。測試環境設定見 [README](../README.md)。
5. 若修改契約，同步 [API 規格](../docs/api-interface-format.md)、本目錄說明及 [開發對照](../docs/site-development.md)。

Journey 逐欄英文註解見 [journey/README.md](journey/README.md)，地圖接線與自動布局見 [Journey 開發對照](../docs/journey-development.md)。

## 模擬 API 與離線限制

建置讀取 JSON → mock transport 投影回應 → client 快取／去重 → store 委派 dataContracts 驗證／保存 → 功能模組呈現。元件不可直接讀 fixture 或自行依語言開 JSON 檔案。

目前沒有 AJAX。為支援 `file://`，所有 mock bytes 都已嵌入 `dist/app.js`。lazy loading 延後的是資源讀取、資料合併及 DOM 渲染；接正式 HTTP transport 後才會延後網路下載。

語言、導覽和執行參數在 `src/config/`，固定 UI 文案在 `src/locales/`，地圖／圖示／字型在 `src/assets/`；它們不是本目錄的業務資料。

## 外觀設定不是 mock 業務資料

背景配色、速度、強度及暫停是瀏覽器偏好，由 src/core/appearance-settings.js 管理；固定文案在 src/locales，色彩在 theme.css，不加入以上 API JSON。說明見 [背景開發文件](../docs/appearance-development.md)。

Experience 欄位英文註解與分頁規則見 [experiences/README.md](experiences/README.md)。Experience 不查 entities、skills 或 locales 字典。

Projects 欄位英文註解見 [projects/README.md](projects/README.md)，接線見 [Projects 開發文件](../docs/projects-development.md)。已移除無使用者的舊 entities 與 project 翻譯鍵來源。
