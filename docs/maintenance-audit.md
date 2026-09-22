# 專案維護檢查

檢查範圍：`portfolio-web/` 的來源、設定、mock、樣式、測試、文件、資產及發布產物。工作區中的履歷、其他專案與 `temp_web` 示範頁不屬於本專案清理範圍。

## 最新檢查（2026-09-23）

- 函式及註解：補齊前端公開介面、getter、window 工廠與 helper 的索引及英文註解；目前共 232 個函式／介面條目。匿名回呼由所屬功能／測試說明，JSON 欄位說明維持相鄰 Markdown，不寫非法 JSON 註解。
- 工程結構：29 個瀏覽器 JS 模組均列入建置清單；CSS 均由單一入口載入；16 份業務 mock 均已登記。資料契約、快取、呈現與互動分離，API key 不轉換。
- 清理：移除 Projects 不再分開請求詳情後留下的 `.detail-retry` 樣式；合併專案卡片重複／被覆蓋的字級、間距、按鈕尺寸及不生效的 transform 規則。沒有新增套件。
- 檔案歸屬：補齊根目錄 LICENSE 的用途及目錄樹；dist、測試、供應商授權、README 圖片有明確用途。忽略版控的工具快取及驗證截圖不屬於部署來源。
- 檢查方式：建置及引用清單、JS 語法樹比對（172 個前端具名函式／公開介面均已收錄）及宣告／識別字候選掃描、CSS 選擇器引用與人工追查、token 消費者、三語字典、Markdown 連結、OpenAPI／mock 範例及瀏覽器回歸。動態生成的主題標籤與 SVG graticule 有實際消費者，不能因靜態文字搜尋找不到而刪除。
- 限制：未發現其他可確認的廢棄程式；文字掃描與瀏覽器測試不能數學上保證所有動態路徑皆無死碼。文件索引遵循專案格式慣例；驗證涵蓋目前 Edge 與 mock 情境，未宣稱所有瀏覽器／未來資料都已驗收。

最新完整測試結果見 [final-verification.md](final-verification.md)，機器可讀紀錄在忽略版控的 `artifacts/test-results.json`。

## 先前架構與修正

| 項目       | 結果與處理                                                                                                       | English implementation note                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 資料契約   | 從 store 抽出 `src/core/data-contracts.js`，集中 Site、Journey、集合驗證；store 保留合併、不可變快照與請求狀態   | Keep validation separate from cache mutation and UI lifecycle.                     |
| API 命名   | Site／Journey／Experience／Projects 使用已確認的 API keys；不新增轉換表。其餘兩支 API 保留現有契約，等待逐支討論 | Preserve approved direct field names and existing resource contracts.              |
| 重複元件   | 四處技能 chips 共用 skills；Experience／Projects 共用 collectionDisclosure；分頁 loading／retry 共用 paging      | Reuse behavior with the same lifecycle; keep map playback and dialogs independent. |
| 圖示與文字 | 移除技能翻譯中的 `+`／`−` 字元及執行時剝除邏輯，圖示只由 plus-lg／dash-lg 提供                                   | Catalogs own labels; the icon renderer owns visual symbols.                        |
| 非同步啟動 | navigation 在 window.load 已完成時直接初始化，避免未來較慢 API 使深層連結／scrollspy 失效                        | Initialize navigation whether data resolves before or after window.load.           |
| 啟動失敗   | loading／error／retry 使用三語前端字典，不需要成功取得 Site API                                                  | Localize bootstrap failures independently of remote content.                       |
| 主題與樣式 | 每份 authored CSS 由 index.css 唯一引用，配色沿用 theme.css；移除無引用的 map-gradient-start                     | Compose styles once and keep semantic colors in the theme layer.                   |
| 註解       | 補齊設定保存、面板關閉、聊天框定位、滑鼠事件及啟動時序的英文說明                                                 | Explain ownership and non-obvious lifecycle decisions in English.                  |
| 文件       | project-structure 補新檔案責任，更新 API／Site／Journey／模組說明與 mock 註解，新增維護契約檢查                  | Document maintained files and validate examples against canonical fixtures.        |

## 命名與修改規則

- JS 函式、註冊模組名稱、API 欄位使用 camelCase；來源檔名、CSS class 和 DOM ID 使用 kebab-case。
- DOM 的 `data-site` 路徑與 Site key 完全一致；Journey 不建立城市、國家或組織 ID 轉換表。
- 前端固定 UI 使用 `src/locales`；業務內容使用 `mock`；JSON 維持有效 JSON，欄位英文註解放相鄰 README 與 API TypeScript 規格，不加入不合法的行內註解。
- `dataContracts` 驗證輸入，`data` 管理資料生命週期，feature 模組呈現及互動，`app.js` 只協調啟動和刷新。
- `dist` 必須從來源建置，不手動修改。新增 JS 登記 build.json；新增 CSS 登記 index.css；新增可維護檔案補 docs/project-structure.md 的責任清單。
- 小型元件的定位值留在對應元件；跨元件配色、主要版面寬度與共用動畫 token 由 theme.css 管理。避免把無共同行為的功能強制合併。

## 清理依據

已移除一個無引用的 `--map-gradient-start` token（包含三組配色定義）、未使用的 `data-profile-description` 標記，技能文案中重複的符號和兩段清理字串邏輯，以及沒有消費者的衍生欄位 tooltipDate／short。它們不是 Site／Journey API 欄位，不影響後端契約。

引用檢查未找到可安全刪除的剩餘來源模組、CSS、技能、業務翻譯或 Bootstrap 圖示。保留本地字型所有 CSS 引用的字元子集、SVG 地圖、工程師圖片、供應商 SVG／來源／授權與測試；它們都有用途。`dist` 是必要的離線發布結果，不當成重複來源刪除。

`artifacts` 的瀏覽器截圖只用於驗收；檢視後移除本輪產生的截圖。保留最新測試 JSON、網站 tar 與離線 ZIP。打包暫存資料夾由 package.mjs 在確認絕對路徑後自行清理。

## 可重複驗證

執行 `node scripts/build.mjs` 後執行 `node scripts/test.mjs`。完整入口為 13 組；最新案例數與結果見 final-verification.md；維護檢查覆蓋來源責任清單、英文檔頭註解、CSS 引用圖、token 消費者、Markdown 本地連結、JSON 範例及功能清單／回歸清單 ID 一致性。

Browser API 回歸另檢查三語啟動失敗，以及資料晚於 window.load 時的深層連結與捲動同步。最新結果與限制記於 [regression-coverage.md](regression-coverage.md)，實際執行報告位於 `artifacts/test-results.json`。靜態檢查與 Edge 瀏覽器回歸不等於所有瀏覽器和所有未來資料都已驗收。

### CSS 整理

合併 base 的重複 a／button 規則；page 的側欄偏移與左右留白直接由 theme token 調度，移除後續已覆蓋的 195px／百分比設定；navigation 合併側欄、品牌、選單及圖示的分散宣告，移除沒有 DOM 目標的舊選擇器；chatme 合併關閉按鈕共同樣式並移除被 ID 規則覆蓋的桌面字級與舊結構選擇器。14 組尺寸／展開狀態比對共用骨架計算樣式一致；非同步技能重排會影響正文總高度，因此總高度另由完整 RWD 測試驗證。

## Experience 契約遷移補充（2026-09-21）

已新增三語 mock/experiences，移除 mock/careers.json、career.\* 翻譯鍵、舊 Experience view 轉換及未使用的 location view helper。Experience 直接保存同名欄位，不建立相容 mapping。技能完整隨卡片返回，移除 /skills 的 career owner；專案／分類維持既有 API。

README、API 規格、功能清單、模組架構、mock 說明及開發對照已同步；新增 Experience 專用開發文件與欄位英文註解。完整回歸 11/11 組、32 個契約案例通過，紀錄見 regression-coverage.md。

## Projects 契約整合（2026-09-21）

刪除未使用的 mock/projects.json、mock/entities.json 及 project／organization／country／location 業務翻譯鍵；新增三語直接 Projects，API 總數降為六支。移除舊 scope／group 統計、view 欄位別名、獨立詳情 API、專案技能分頁和無使用者的 UI 文案。Experience 與 Projects 共用頁碼狀態、快取、驗證及語言切換調度，保留各自 validator。新功能與同名欄位責任見 [Projects 開發對照](projects-development.md)。

Projects 整合後再移除 15 筆只供舊專案／經歷 ID 查表、未被分類引用的技能字典記錄與三語 labels。卡片上的完整技能文字保留，Skills 七分類及 67 個名稱不變。移除 store 中無使用者的 text-key 合併分支。
