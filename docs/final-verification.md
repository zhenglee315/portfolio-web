# Final verification / 最後驗證

## Latest: cold-start entrance / 最新：冷啟動進場（2026-09-22）

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
- Six API specifications, response examples, safe numeric IDs, nullable fields, date rules and HTML escaping. / 六支 API 範例與欄位驗證，前四支已確認，後兩支待討論。
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

Browser tests use local Edge (Chromium) and emulated viewport sizes; these are not physical-device, Safari or Firefox certification. The 4K test covers a 3840px CSS viewport, not every OS scaling setting. No production HTTP API or database exists yet; OpenAPI consistency checks do not replace backend validation or integration tests. / 使用本機 Edge 與模擬尺寸，未宣稱實體裝置、Safari、Firefox 或所有系統縮放均已驗收；尚未有正式 HTTP API 與資料庫，後端仍需執行自己的驗證及整合測試。
