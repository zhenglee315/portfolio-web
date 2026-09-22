# 背景、主題與偏好設定

此功能屬於前端呈現，不新增 API、mock JSON 或資料庫欄位。參考 `temp_web` 的背景幾何與雙拍呼吸效果，沒有引入示範文字、示範頁選單或外部執行資源。

## 模組責任

| 檔案                                         | 責任                                                | English implementation note                                                      |
| -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/core/appearance-settings.js`            | 定義合法設定、預設值、範圍與儲存；啟動時先套用配色  | Normalize local preferences and restore the theme before content initialization. |
| `src/features/appearance.js`                 | Palette 圓形入口、滑桿、主題按鈕、暫停及重置        | Bind accessible controls directly to canonical preference keys.                  |
| `src/features/background-field.js`           | 依可視區域生成 SVG、隨機雙拍、進場與播放生命週期    | Allocate viewport geometry and suspend animation while hidden or motion-reduced. |
| `src/styles/theme.css`                       | 全部配色與語意色彩 token                            | Keep palette colors and shared tonal values out of component styles.             |
| `src/styles/components/background-field.css` | 背景網格、四邊定位及內容短暫閃現                    | Render a noninteractive decorative layer behind readable content.                |
| `src/styles/components/appearance.css`       | 設定面板、響應式邊界、控制狀態                      | Keep the panel inside the viewport and preserve native keyboard controls.        |
| `src/locales/{locale}.json`                  | 三語固定 UI 標籤                                    | Localize appearance labels without requesting business content.                  |
| `tests/appearance-browser.cjs`               | HTTP Cookie 與 file://、三語、四主題、RWD、動態偏好 | Verify persisted user outcomes in real browser contexts.                         |

`backgroundField.whenReady` 是一次性的進場完成 Promise，chatme 宣告依賴並等待它，不複製進場秒數。完成後 chatbox 淡入 400ms，再開始完整 3 秒 idle 倒數；淡入期間 hover／鍵盤焦點仍會保留浮框。減少動態時略過進場與淡入，直接开始倒數。

`appearanceSettings` 提供 `get()`、`update(patch)`、`reset()`，以及唯讀 `themes`、`defaults`、`ranges`。`get()` 回傳副本；所有修改經過同一驗證入口，完成後發送 `portfolio:appearancechange`。設定面板與動畫各自訂閱，不互相呼叫，也不依賴 SiteData 或 Journey。

## 設定格式與命名

```json
{
  "theme": "mint",
  "speed": 1,
  "brightness": 80,
  "paused": false
}
```

| key          | 合法值／預設                                 | 用途                                                                             |
| ------------ | -------------------------------------------- | -------------------------------------------------------------------------------- |
| `theme`      | `mint`、`blue`、`amber`、`mist`；預設 `mint` | 薄荷、冰藍、琥珀、霧白；英文 Mint、Ice、Amber、Mist；簡體 薄荷、冰蓝、琥珀、雾白 |
| `speed`      | 0.4～2，步進 0.1；預設 1                     | 背景十字呼吸與新訊號間隔的倍率                                                   |
| `brightness` | 20～100，步進 5；預設 80                     | 背景訊號圖層強度，不降低正文對比                                                 |
| `paused`     | boolean；預設 false                          | 使用者暫停背景動畫的偏好，不控制 Journey 飛機或其他元件                          |

上述 key 在儲存 JSON、service state 與控制項一致。主題 ID 同時用於 CSS `data-theme`、按鈕 `data-theme-option` 及 `ui.theme{ID}` 翻譯鍵，沒有額外業務 mapping table。非法 theme 回預設；數值限制至合法範圍／步進；非 boolean 的 paused 回預設。

## 儲存與離線行為

Cookie 名稱為 `portfolio-appearance`，內容是 URI 編碼的 JSON，`Path=/`、`Max-Age=31536000`、`SameSite=Lax`，HTTPS 加上 `Secure`。偏好只屬於目前瀏覽器，不要求登入或呼叫後端。

讀取順序：有效 Cookie → localStorage 同名備份 → 預設值。每次有效修改同時嘗試寫入 Cookie 與本機備份。直接開啟 `file://` 時通常不支援 Cookie，改由 localStorage 記憶；若瀏覽器連本機儲存也禁止，當次頁面仍可調整，重新開啟則無法保留。網站來源與 file:// 的儲存不互通。

重置會套用並保存全部預設值。Cookie 及本機值失效、損毀或格式錯誤不會阻止頁面啟動。這裡不變更既有語言偏好的儲存契約。

## 動畫與樣式規則

- 預設薄荷沿用原 Tiffany 配色。冰藍、琥珀共享 tonal scale，只改主題 hue 與主色；卡片、地圖、聊天框、標籤與滑鼠光暈一同使用 theme token。
- 只建立可視區域網格，頁面變長不增加 SVG 節點；ResizeObserver 在視窗或側欄尺寸改變時重新計算十字和網格交點。
- 初次進入先完成上、下、左、右定位，再呈現內容及整塊側欄／手機導覽；側欄底色、文字與圖示一起淡入，避免底色提早出現。1.4 秒內完成進場。切換語言或載入更多不重播。
- 圖層使用 `aria-hidden` 與 `pointer-events: none`，不攔截點擊／鍵盤，也不增加閱讀順序。
- 背景分批啟動雙拍訊號，沒有整頁 requestAnimationFrame 永久迴圈。暫停或切到背景分頁停止排程，現有動畫暫停；回到前景依偏好恢復。
- 系統 `prefers-reduced-motion` 優先：取消訊號動畫與進場，顯示說明並停用播放按鈕；不覆蓋使用者已保存的 paused 值。
- 設定面板使用標準 range 與 button；開啟聚焦第一個滑桿，Escape 關閉並回到 Palette 按鈕，點擊／聚焦外部關閉。小螢幕以可視寬高限制並允許面板內捲動。

所有圖形由本地 CSS／SVG／Web Animations 產生。`palette-fill` 已加入固定版本 Bootstrap Icons 的本地 vendor 資產；沒有 CDN、遠端字型或 demo 頁面的外部資源請求。

## 驗證

執行 `node scripts/build.mjs`，再執行 `node scripts/test.mjs`。Appearance 套件驗證三語按鈕名稱、四組主題、六種尺寸、設定操作、Cookie 優先還原、file:// 離線備份、損毀值、數值限制、Escape／外部關閉及 reduced motion。其他既有套件覆蓋導覽、浮框、地圖、技能、專案、經歷與 lazy loading。驗證結果見 [regression-coverage.md](regression-coverage.md)。

## 霧白亮色主題

新增 `mist`（霧白／雾白／Mist），沿用相同設定物件、Cookie、本機備份與前端翻譯。theme.css 使用 `color-scheme: light`、灰白背景、深灰綠文字及深青綠重點色；卡片、地圖、聊天框、導覽與陰影各自使用語意 token。`--on-accent` 統一控制深色重點底上的文字對比。四個選項以兩欄排列，避免窄螢幕擁擠；預設仍為薄荷。

## Cold-start entrance / 冷啟動進場（2026-09-22）

HTML declares data-ready=false. Until app.refresh completes, background-field.css hides main, the skip link, sidebar and mobile header with visibility:hidden. Layout remains measurable for map geometry and skill chips; unfinished controls cannot receive keyboard focus. / HTML 從第一個畫面即宣告尚未就緒；CSS 隱藏正文、跳轉連結及導覽，同時保留布局量測，避免初次 JS 下載或資料等待時閃現靜態內文。

app.js sets data-ready=true only after data initialization, feature startup and the first refresh. The existing field-entering animations then control content/navigation entrance, and backgroundField.whenReady remains the sole chat greeting boundary. No extra animation timer or duplicate ready flag is introduced. / 初次刷新完成才解除隱藏；進場樣式和既有 whenReady 繼續管理內容、選單及聊天框，不新增另一套計時或就緒狀態。

The startup loading/error/retry status lives outside the hidden surfaces. Data failure keeps unfinished content hidden while the localized retry button remains visible and focusable. Reduced motion and saved pause skip the animation but still wait for valid content. / 載入狀態及三語錯誤／重試位於獨立區域；減少動態或已保存暫停偏好會略過動畫，但仍須等待資料完成。

Regression: tests/cold-entry-browser.cjs holds app.js before its execution, disables browser cache, delays mock responses, samples pre-ready frames, and verifies desktop/mobile/tablet/4K, all three locales, reduced motion, pause and failure/retry. tests/chat-entry-browser.cjs continues to verify the later chat fade and three-second idle lifecycle. / 冷啟動測試覆蓋 JS 執行前、慢速資料、逐幀防閃爍、尺寸、三語及錯誤恢復；聊天框的淡入與三秒閒置由既有測試接續覆蓋。
