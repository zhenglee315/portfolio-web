# Site API 與前端開發對照

目前進度：第 1 支 `/site` 的四群組契約已實作。這份文件聚焦 Site；第 2 支 Journey 的落地規格另見 [Journey 開發對照](journey-development.md)。請求／回應格式以 [API 規格](api-interface-format.md) 為準，資料欄位註解見 [mock/site/README.md](../mock/site/README.md)。

## 命名與唯一資料來源

| API 欄位                       | 前端入口                                                   | 顯示位置                              |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------- |
| `brand.title/titleSub`         | `data.site.brand` → `siteContent.refresh`                  | 桌面、手機及頁尾 wordmark             |
| `brand.copyrightYear`          | `data.site.brand.copyrightYear`                            | 側欄及頁尾版權                        |
| `profile.firstName/familyName` | `siteContent.fullName(data.site.profile)`                  | 主標姓名、版權、首頁連結、網頁標題    |
| `profile.nickName`             | `profile.nickName` + 前端 home 標籤模板                    | 首頁連結 aria-label                   |
| `profile.content`              | `data-site="profile.content"`                              | 個人介紹及 meta description           |
| `profile.eduCode/program`      | `data.site.profile`                                        | `#education-summary`，與 Journey 解耦 |
| `profile.introContent`         | `data-site="profile.introContent"`                         | 姓名上方短句                          |
| `profile.footerContent`        | `data-site="profile.footerContent"`                        | 頁尾短句                              |
| `social.{key}`                 | `data-social="{key}"`                                      | 社群、Email、頁尾及 chatme 聯絡入口   |
| `chatme.title/titleSub`        | `data-site="chatme.title"` / `data-site="chatme.titleSub"` | 桌面及手機 chatme                     |
| `chatme.content`               | `data-site-paragraphs="chatme.content"`                    | 以 escaped paragraphs 顯示換行        |
| `chatme.icon`                  | `data-site-src="chatme.icon"`                              | 桌面及手機對話框圖片                  |

`data-site` 是 dot path，與 API key 原樣對應；不要把資料轉成舊的 identity、contacts 或 ui.\* 內容鍵。固定 UI 翻譯繼續使用 `data-i18n`。CSS class 用 kebab-case，JavaScript／JSON 欄位用 camelCase，不需要為 CSS 改 API key。

### API 欄位與前端名稱的區別

- `data-social="email"` 表示 `site.social.email`，並非另一份 contacts 資料。`ui.contacts` 只翻譯社群區的無障礙標籤，不是 API key。
- `data-profile-name` 及 `data-profile-home` 是衍生姓名與首頁 aria-label 的綁定；`fullName` 是格式化函式，不要求後端多回傳欄位。
- `.wordmark`、`.chatme-eyebrow` 等是呈現用途的 CSS class；分別使用 brand 欄位及 `chatme.titleSub`，不轉換或另存 API 欄位。
- `PORTFOLIO_RUNTIME.chatme` 只含前端 idleMs／fadeMs；`data.site.chatme` 只含 title／titleSub／content／icon。兩者職責分開，不混成同一物件。

## 模組責任與刷新順序

1. `scripts/lib/mock-data.mjs` 依建置清單讀取 site 三語及其他 JSON；`scripts/build.mjs` 將它們嵌入離線 bundle。這不是瀏覽器 AJAX。
2. `src/api/mock-transport.js` 依請求 locale 回傳整份 site，並加共同 envelope；不把網站內容再放入 included.translations。
3. `src/api/client.js` 自動帶 locale，依 path + query 分開快取、去重及檢查 revision。
4. `src/core/data-contracts.js` 的 `validateSite`（由 store 委派） 檢查必要欄位型別、年份、社群格式及圖片路徑；通過才存入 `siteByLocale`。`data.site` 是當前語言的凍結物件，不能直接修改。
5. `src/features/site-content.js` 綁定 site 欄位及衍生姓名／SEO／教育摘要；`src/features/chatme.js` 建立對話框容器、管理開關、定位及閒置計時。
6. `src/app.js` 在刷新時先套用固定 UI 字典，再依順序執行 content → siteContent → chatme 等模組。siteContent 填好文字後，chatme 再量測位置；不能為了刷新文案重新初始化計時器。

切換語言時，I18n 等待 `data.prepareLocale` 取得已讀資源的目標語言並驗證 site 與 journey。成功後才改當前 locale、保存偏好及發出刷新事件；失敗保持原語言。不同語言的 site 分別快取，晚到的舊選擇不會覆蓋當前畫面。

`data.snapshot/replace` 管理其餘正規化集合，不包含獨立按語言快取的 site 與 journey。不要透過 replace 修改姓名或品牌；應修改 site mock 並重建，未來則由 `/site` 的 HTTP 回應提供。

## 維護界線

- `PORTFOLIO_RUNTIME` 僅為 `src/config/runtime.json` 的前端呈現參數；沒有姓名、社群或 site 別名。
- `src/locales/` 維護按鈕、無障礙標籤、格式模板等固定 UI 文本；`mock/locales/` 仍供其他 API 的業務翻譯，兩者不取代 site 三語內容。
- HTML 中的初始英文內容是啟動前的靜態 fallback，載入後由綁定覆寫；日常業務內容維護以 mock/site 為準，不另改一份前端個人資料設定。
- 新增 site 欄位時，同步三份 mock、data-contracts 驗證、對應 DOM 綁定、API 規格及欄位註解。新增社群管道也需要前端入口及圖示；新增物件 key 本身不會自動產生 UI。
- 本輪沒有新增 API、cookie、HTTP adapter、CMS 或資料庫表。Journey 已於下一輪完成；第 5～6 支 API 留待逐支確認。

## 驗證

執行方式及環境見 [README](../README.md)；完整範圍見 [回歸對照](regression-coverage.md)。

- `tests/api.test.cjs`：site 契約、locale、快取、無效欄位原子拒絕與重試。
- `tests/api-browser.cjs`：替換品牌、漢字姓名、介紹、教育、Email 與 chatme，確認畫面跟隨新 key；檢查文字 escaping、社群空值、三語切換及離線。
- `tests/chat-entry-browser.cjs` / `tests/chat-idle-browser.cjs`：手機首次顯示、3 秒淡出、hover／焦點及開關狀態。
- `tests/build.test.cjs`：來源／產物一致、已登記模組、引用資產與本地主題規則。

只修改註解或文件時，檢查連結及資料一致性並重建受影響的 bundle；不要把上次完整瀏覽器回歸誤寫成這次重新執行的結果。

## 外觀設定與 SiteData 分離

右上 Palette 控制是固定前端 UI；不向 brand／profile／social／chatme 添加主題欄位。全站元件改用目前 theme token 顯示，資料物件與三語 SiteData 契約不變，見 [appearance-development.md](appearance-development.md)。

### Medium 社群入口

`social.medium` 直接綁定 `data-social="medium"`，值為普通 URL（目前 `https://medium.com/@WilsonLeee`）；空字串隱藏入口。使用本地 Bootstrap `medium` SVG，輸出 `bi bi-medium` class，沿用既有 Icons 元件，無需 icon font 或 CDN。三語 aria-label／title 在 `ui.medium`，連結以新分頁開啟。
