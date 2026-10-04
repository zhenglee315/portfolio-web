# Mock 資料維護說明

本目錄保存網站的模擬業務資料。JSON 必須維持標準格式，不加入 `//`、`/* */` 或 `_comment` 欄位；本文件及 [site 欄位註解](site/README.md) 是資料的伴隨註解，不會被打包進 API 回應。

六支 `/portfolio` GET API 的資料格式均已確認。`site`、`journey` 直接回傳完整資料；`experiences`、`projects` 使用頁碼分頁；`skill-categories`、`skills` 使用游標分頁。

## 檔案與資料用途

供前端模擬 API 使用的 18 個 JSON 由 [建置清單](../config/build.json) 的 `mock.files` 明確登記，沒有掃描整個目錄自動載入文件。建置會依請求分頁產生 `dist/mock-pages/` 的靜態 JS 回應片段。另保留 `skills.json` 與三份 `locales/*.json` 供後端資料庫種子匯入；這四份不會進入前端 API mock 片段。

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
| `skill-categories/en.json`      | 英文分類標籤與完整技能 ID 順序                     | Full category membership source; the API trims each preview to six IDs.            |
| `skill-categories/zh-Hans.json` | 簡體分類標籤與相同技能 ID 順序                     | Localized category labels with stable IDs and membership order.                    |
| `skill-categories/zh-Hant.json` | 繁體分類標籤與相同技能 ID 順序                     | Localized category labels with stable IDs and membership order.                    |
| `skills/en.json`                | 英文技能 ID 與直接顯示標籤                         | Each skill is `{id,label}`; the API pages skills within a category.                |
| `skills/zh-Hans.json`           | 簡體技能 ID 與直接顯示標籤                         | Simplified Chinese labels with the same IDs and order.                             |
| `skills/zh-Hant.json`           | 繁體技能 ID 與直接顯示標籤                         | Traditional Chinese labels with the same IDs and order.                            |
| `skills.json`                   | **僅供後端 seed** 的舊技能與分類關聯               | Backend seed source only; excluded from frontend API mock bundle.                  |
| `locales/en.json`               | **僅供後端 seed** 的英文翻譯鍵                     | Backend seed dictionary only; not a frontend response input.                       |
| `locales/zh-Hans.json`          | **僅供後端 seed** 的簡體翻譯鍵                     | Backend seed dictionary only; not a frontend response input.                       |
| `locales/zh-Hant.json`          | **僅供後端 seed** 的繁體翻譯鍵                     | Backend seed dictionary only; not a frontend response input.                       |

六組三語 API JSON 都包含直接可顯示的文字；技能 API 使用 `label`，不要求前端查翻譯鍵。固定 UI 文案在 `src/locales`。

## 修改流程

1. 修改任一 API 資源時，在該組三份 `{locale}.json` 保留相同欄位名稱、型別、ID 與排序；僅顯示文字依語言不同。
2. 修改技能分類時，維護穩定的分類／技能 ID 與關聯順序；同步 `skills/{locale}.json` 的標籤。舊 `skills.json` 與 `locales/*.json` 若作為後端 seed 來源，也要保持對應一致。
3. 新增／移除前端 API 資料檔時，同步 `config/build.json` 的 `mock.files`；後端 seed-only 檔不加進前端 bundle。
4. 執行 `node scripts/build.mjs`、`node scripts/test.mjs`。測試環境設定見 [README](../README.md)。
5. 若修改契約，同步 [API 規格](../docs/api-interface-format.md)、本目錄說明及各資源 README。

Journey 逐欄英文註解見 [journey/README.md](journey/README.md)，地圖接線與自動布局見 [Journey 開發對照](../docs/journey-development.md)。

## 模擬 API 與離線限制

建置讀取 18 份 API JSON → 輸出按頁分開的 `dist/mock-pages/` JS → mock transport 按請求載入 → client 快取／去重 → store 委派資料契約驗證／保存 → 功能模組呈現。元件不可直接讀 fixture 或自行依語言開 JSON 檔案。

`dist/app.js` 只保存前端程式、設定與片段索引，不嵌入完整 mock。首次進站載入 Site、Journey 及列表第一頁；後續專案與分類技能頁在使用者操作時才讀取對應片段。這些 JS 檔可直接由 `file://` 載入，不需要本機伺服器；託管時則以 HTTP 按需下載相同的靜態檔案。離線交付時須保留 `dist/mock-pages/`，修改來源後須重新建置。

語言、導覽和執行參數在 `src/config/`，固定 UI 文案在 `src/locales/`，地圖／圖示／字型在 `src/assets/`；它們不是本目錄的業務資料。

## 外觀設定不是 mock 業務資料

背景配色、速度、強度及暫停是瀏覽器偏好，由 src/core/appearance-settings.js 管理；固定文案在 src/locales，色彩在 theme.css，不加入以上 API JSON。說明見 [背景開發文件](../docs/appearance-development.md)。

Experience 欄位英文註解與分頁規則見 [experiences/README.md](experiences/README.md)。Experience 不查 entities、skills 或 locales 字典。

Projects 欄位英文註解見 [projects/README.md](projects/README.md)，接線見 [Projects 開發文件](../docs/projects-development.md)。已移除無使用者的舊 entities 與 project 翻譯鍵來源。

技能分類與技能的完整來源、六筆預覽、直接標籤及游標接續分別見 [skill-categories/README.md](skill-categories/README.md) 和 [skills/README.md](skills/README.md)。
