# Final verification / 最後驗證

The current mock contract uses all six `/portfolio/*` routes, three localized skill/category fixtures, direct responses and locale-bound cursors without revision. A backend HTTP adapter has not yet been verified here. / 現行 mock 契約為六支 `/portfolio/*`、三語分類與技能直接文字、無包裝回應及綁定語言的 cursor；尚未驗證後端 HTTP adapter。

## Latest: on-demand offline mock pages / 最新：離線按需分頁（2026-10-05）

**13/13 suites and 40 contract/maintenance cases passed.** The deterministic build generated 126 files, including 69 localized mock page chunks. Opening `dist/index.html` with `file://` loaded the initial pages; the browser requested later project pages only after paging and category skill continuations only after expansion. The offline ZIP contains the chunks and passed its build check. / **13／13 組、40 個契約與維護案例通過。** 建置產生 126 個檔案，包含 69 個三語 mock 分頁片段。以 `file://` 開啟時先載入首頁所需頁，後續專案及分類技能片段在操作後才讀取；離線 ZIP 也包含這些片段並通過建置檢查。

The previous results below are historical records. / 以下較早的數字為歷史紀錄。

## Latest: maintainability audit / 最新：可維護性檢查（2026-09-23）

**13/13 suites passed after cleanup, including 36 contract/maintenance cases; 57 JavaScript files passed syntax checks.** Source and generated output match. / 整理後完整重跑，13／13 組及 36 個契約／維護案例通過，57 份 JavaScript 語法檢查通過，來源與建置產物一致。執行結果在 `artifacts/test-results.json`。

The function reference contains **232 entries**, including window factories, public object arrows and accessors. Independent syntax-tree inspection confirmed all **172 named browser functions/interfaces** are represented. / 函式索引現有 232 項，補齊 window 工廠、物件箭頭介面和 getter/setter；另以語法樹核對前端 172 個具名函式／介面，沒有漏項。匿名回呼由所屬功能／測試情境說明，產生器仍遵循專案宣告格式。

Removed unused detail-retry CSS and redundant project-card declarations. Updated stale Projects view documentation, root LICENSE ownership and maintenance rules. No packages were added. / 移除無引用的 detail-retry 舊樣式、合併專案卡重複及被覆蓋的規則，修正過時 view 描述、授權檔責任及函式維護規則；沒有新增依賴。

Coverage includes three locales, four themes, mobile/tablet/desktop/4K, startup ordering, interactions, pagination, empty/single/multiple records and offline resources. No other confirmed dead code was found; tested scenarios do not prove every possible dynamic path. / 覆蓋三語、四主題、多尺寸、冷啟動、互動、分頁及空／單筆／多筆資料。目前沒有發現其他可確認的廢棄代碼；保留資產與檢查界線見 [maintenance-audit.md](maintenance-audit.md)。

## Previous: cold-start entrance / 前次：冷啟動進場（2026-09-22）

**13/13 suites passed, including 36 contract/maintenance cases.** Added a browser suite that holds deferred JavaScript before first paint, disables cache and delays data. It verifies no pre-ready content leakage across three locales and 390/1024/1440/3840px widths, plus reduced motion, saved pause and localized failure/retry. Existing chat entrance, hover retention and three-second idle tests also pass. / **13/13 組通過，包含 36 個契約／維護案例**。新增測試從 JS 下載前開始逐幀檢查，涵蓋慢速資料、三語四尺寸、動態偏好與錯誤重試；既有聊天框進場、hover 保留及三秒淡出仍通過。

The fix reuses data-ready and the existing backgroundField.whenReady boundary. HTML, app lifecycle comments, component CSS, build output, function reference and architecture/appearance docs are synchronized. Offline packaging and whitespace checks pass. / 修正沿用 data-ready 與既有 whenReady，不增加另一套動畫計時；HTML、生命週期註解、元件樣式、建置結果及開發文件已同步，離線封裝與空白檢查通過。

## Previous full audit / 前次完整稽核

Date / 日期：2026-09-21。Scope / 範圍：portfolio-web only.

Result: **12/12 suites passed, including 36 contract and maintenance cases**. All 56 authored JavaScript files passed syntax checks; git diff whitespace checks passed. The generated index documents 198 named functions/helpers with English comments. The additional Markdown table guard also passed after the full run. / 結果：**12/12 組通過，包含 36 個契約與維護案例**；56 份 authored JavaScript 語法及 git diff 空白檢查通過。函式索引記錄 198 個具名函式／helper 與英文註解；完整回歸後新增的 Markdown 表格欄數檢查亦通過。

Actual desktop, mobile, tablet and 4K views were inspected; the [README](../README.md) includes real local desktop/mobile screenshots. / 已檢視桌面、手機、平板與 4K 畫面，README 使用實際本地網站截圖。

## Coverage / 驗證範圍

- 55 documented features: navigation, intro, chat, journey map, experience, projects, skills and shared appearance/accessibility behavior. / 55 項已登記功能，逐項測試對照見 [功能回歸](regression-coverage.md)。
- 10 viewport widths × 3 locales: 320, 390, 760, 761, 1024, 1080, 1440, 1920, 2560 and 3840 CSS pixels. / 手機、平板、桌面與 3840px 4K，另驗證 breakpoint 兩側。
- Offline startup with 0, 1, 6, 7 and 19 records in every locale; complete pagination and dialogs at mobile, tablet and 4K sizes. / 空、單筆、六筆邊界及多頁資料的真正初次載入、完整分頁與詳細視窗。
- Larger fixtures: 126 projects, 81 experiences and 120 skills per record; errors, retry, cache, concurrency and locale switching. / 大量資料、失敗重試、快取、併發及語系切換。
- Six API specifications, response examples, safe numeric IDs, nullable fields, date rules and HTML escaping. / 六支 API 範例與欄位驗證；下方執行數字屬舊版契約的歷史紀錄。
- Source ownership, CSS import graph, theme token consumers, asset references, mock registration, English function comments, generated function index and local Markdown links. / 來源責任、樣式調度、資產引用、mock 登記、英文註解與文件一致性。

## Cleanup / 清理

Removed the unused collection disclosure caption parameter, markup and selectors; merged repeated skill-chip declarations and mobile grid rules. No package dependencies are declared, so no dependency was removed merely to reduce a count. / 移除無使用者的集合摘要參數、標記與樣式，合併技能標籤及手機網格的重複規則；專案原本沒有套件依賴，不為了刪除數量移除必要工具。

All registered source modules, local fonts, SVG icons, maps and licensing files retain consumers or documented provenance. Generated dist is kept for direct offline use. Temporary test screenshots are removed after review; README images remain versioned. / 有用途的來源、離線資產與授權皆保留；dist 供直接離線使用。驗收暫存圖片檢視後清除，README 圖片保留版控。

## Reproduce / 重現

```sh
node scripts/build.mjs
node scripts/test.mjs
node scripts/document-functions.mjs --check
```

Browser setup is in [README](../README.md). The latest machine-readable run is written to ignored artifacts/test-results.json. / 瀏覽器工具設定見 README，當次報告輸出至未加入版控的 artifacts/test-results.json。

## Limits / 範圍限制

Browser tests use local Edge (Chromium) and emulated viewport sizes; these are not physical-device, Safari or Firefox certification. The 4K test covers a 3840px CSS viewport, not every OS scaling setting. The sibling backend implements HTTP routes and a database, but this frontend has not run an HTTP integration suite against them. / 使用本機 Edge 與模擬尺寸，未宣稱實體裝置、Safari、Firefox 或所有系統縮放均已驗收；相鄰後端已有 HTTP 路由與資料庫，但本前端尚未對其執行 HTTP 整合測試。
