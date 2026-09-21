# 桌面圖示列與手機抽屜

導覽繼續使用 `src/config/navigation.json` 作為唯一選單來源，不新增 API 或後端欄位。桌面收合只改變呈現方式，圖示、路由、翻譯鍵與選中狀態不另建清單。

## 檔案與功能責任

| 檔案                                     | 責任                                                   | English implementation note                                                               |
| ---------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `src/features/navigation.js`             | 生成選單、標題與 accessible name，處理路由和 scrollspy | Keep visible labels and accessible names tied to the canonical navigation entries.        |
| `src/features/sidebar-rail.js`           | 桌面收合控制、三語 tooltip、鍵盤與指標生命週期         | Toggle desktop presentation and position one shared localized tooltip.                    |
| `src/features/mobile-menu.js`            | 手機抽屜開關、遮罩、inert 及尺寸切換                   | Keep mobile drawer interaction independent of desktop compact state.                      |
| `src/styles/components/sidebar-rail.css` | 圖示列、文字退場、提示標題、正文與背景寬度動畫         | Coordinate rail width, content offset and background position through shared tokens.      |
| `src/styles/layout/navigation.css`       | 一般導覽結構與手機滑入／收回                           | Preserve the full mobile drawer below the CSS-owned breakpoint.                           |
| `src/styles/theme.css`                   | 標準／精簡側欄寬度、共用動畫時間及曲線                 | Define geometry and motion once for all dependent components.                             |
| `src/features/chatme.js`                 | 觀察側欄尺寸，於收合過程持續對齊聊天圖示               | Reposition an open chat bubble while the rail animates without requiring a window resize. |
| `tests/sidebar-rail-browser.cjs`         | 雙向動畫、三語提示、鍵盤、四尺寸及手機隔離測試         | Verify actual layout, interaction and offline behavior in the built page.                 |

## 桌面收合

- 桌面右上雙箭頭使用本地 Bootstrap `chevron-double-left`，收合後旋轉指向右側。按鈕以 `aria-expanded`、三語 label 與 title 表明作用。
- 收合後寬度為 `--rail-compact-width: 80px`，保留聊天圖示與所有導覽圖示。品牌文字、選單文字、編號與頁尾淡出；展開後恢復。
- `html[data-sidebar-collapsed="true"]` 只在桌面 media query 內覆寫 `--rail-width`。側欄 width、正文 margin-left 及背景 left 共用 `--duration-drawer` 和 `--ease-drawer`，避免動畫期間錯位。
- 當次頁面的收合狀態由 sidebarRail 管理；語言切換不重設，手機與桌面間切換也會保留。重新載入預設展開，不混入背景主題 Cookie 或 API 資料。

## 標題提示

只有桌面收合狀態才顯示 tooltip。滑鼠停留或鍵盤聚焦導覽連結時，讀取 `.nav-label` 上既有 `data-i18n` 翻譯鍵；不複製任何標題文字或業務 mapping table。連結的 `aria-label` 同樣來自原本的 labelKey。

所有連結共用一個 `#sidebar-tooltip`，掛在 body，以 fixed 座標放在圖示列右側，避免被側欄捲動區裁切。ResizeObserver 持續對齊寬度動畫；捲動、視窗尺寸改變、失焦、點選路由或 Escape 會隱藏。提示框不攔截點擊。展開或切至手機時不顯示 tooltip。

## 手機與減少動態

760px 以下隱藏桌面雙箭頭，保留原本的完整手機抽屜、遮罩與文字。桌面收合不會將手機抽屜變成圖示列，也不改變 drawer 的 inert 規則。`prefers-reduced-motion` 依共用樣式立即切換，功能與可存取名稱仍保留。

## 維護與驗證

新增選單只修改 navigation.json；圖示、URL、文字及精簡 tooltip 一同生成。修改尺寸／速度使用 theme.css 的 token，不在功能程式中複製 breakpoint 或動畫秒數。完整檢查使用 `node scripts/build.mjs` 及 `node scripts/test.mjs`，最新結果見 [regression-coverage.md](regression-coverage.md)。

## 非同步內容初始化

navigation 必須處理 API 早於或晚於 window.load 兩種情況。若 load 已完成，透過 microtask 等待 app.refresh 完成第一批 DOM，再執行 initializeNavigation／restoreHash；尚未完成則註冊一次性 load listener。避免依 API 速度決定深層連結與 scrollspy 是否正常。測試位於 tests/api-browser.cjs 的 verifyStartup。
