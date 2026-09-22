# 當前頁面功能盤點

盤點日期：2026-09-21

範圍：`portfolio-web/src/` 程式、`mock/` JSON 資料與 `dist/` 靜態產物

程式基準：2026-09-21，含桌面圖示列 NAV-07、背景 SHARED-07～09 與維護一致性整理。

目的：記錄已存在的功能、資料來源與相依關係，作為後續動態化、正規化及 API 討論的基礎。

## 1. 統計方式與總覽

共 **9 類、55 項功能**。每個功能 ID 代表一項可單獨描述、檢查的展示或互動行為；同一個共用功能即使出現在多個區塊，也只計一次。例如技能展開功能同時用於經歷、專案、詳細視窗與 Skills，不重複計數。圖示、翻譯選項、資料筆數不逐一算成獨立功能。

這是依目前程式與資料做的功能盤點，不代表完成全面相容性或無障礙認證。下方功能表都是現有行為；後面的「待動態化」與「後續討論」不列入已完成數量。

| 類別                  | 功能 ID        |   數量 |
| --------------------- | -------------- | -----: |
| 導覽與側欄            | NAV-01～07     |      7 |
| Overview 與聯絡入口   | HOME-01～04    |      4 |
| 實習資訊對話框        | CHAT-01～06    |      6 |
| Journey 地圖與旅程    | JOURNEY-01～10 |     10 |
| Experience 經歷       | EXP-01～05     |      5 |
| Projects 專案         | PROJECT-01～06 |      6 |
| Skills 與共用技能標籤 | SKILL-01～04   |      4 |
| 多語言                | LANG-01～04    |      4 |
| 共用呈現與存取能力    | SHARED-01～09  |      9 |
| **合計**              |                | **55** |

### 當前資料量

| 資料                    | 數量／現況              | 備註                                                                               |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| 主區塊                  | 5                       | Overview、Journey、Experience、Projects、Skills                                    |
| 職涯記錄                | 6                       | 4 筆工作、2 筆學校；Journey 與 Experience 使用相同數字 ID                          |
| 地圖停駐點              | 6                       | Journey 直接提供經緯度，由前端投影                                                 |
| 專案                    | 15                      | 6 筆預設顯示、9 筆待按頁展開                                                       |
| 技能分類                | 7                       | 各分類數量見 SKILL-01                                                              |
| Skills 區塊技能         | 67 個不重複名稱         | 僅統計 `mock/skills.json 的 categories` 引用的技能；不等於所有經歷／專案標籤的聯集 |
| 顯示語言                | 3                       | 英文、簡體中文、繁體中文                                                           |
| 工作年資                | 74 個月，即 6 年 2 個月 | 依目前工作日期資料計算，不是固定文案                                               |
| 網站自身的後端 API 請求 | 0                       | 6 支 in-memory mock API；沒有 HTTP／AJAX 請求，外部連結另計                        |

## 2. 現有功能清單

### 2.1 導覽與側欄（7 項）

| ID     | 功能               | 當前行為                                                                                                             | 模組／函式入口                            | English implementation note                                                        |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| NAV-01 | 設定驅動的主選單   | 從同一份設定產生名稱翻譯鍵、圖示、編號、section ID 與網址片段；Skills 使用 braces-asterisk，Projects 使用 award-fill | `navigation / src/config/navigation.json` | Generate navigation from stable section keys, icons and aliases.                   |
| NAV-02 | 區塊跳轉           | 選單、Logo、Explore my work 可前往指定區塊，使用共用 section key；支援平滑捲動                                       | `navigation.moveTo (private)`             | Resolve section targets and scroll without duplicating URL definitions.            |
| NAV-03 | 捲動位置同步       | 捲動時更新選單高亮、aria-current 與網址；頁底可正確選中 Skills，手動捲動不持續新增歷史記錄                           | `navigation.update (private)`             | Synchronize reading position, active navigation and the URL fragment.              |
| NAV-04 | 深層連結與歷史還原 | 支援直接開啟區塊網址、重新整理、上一頁／下一頁；舊 #intro、#stack、#toolkit 轉為目前正式錨點                         | `navigation.restoreHash (private)`        | Restore canonical routes and translate supported legacy aliases.                   |
| NAV-05 | 手機導覽抽屜       | 小螢幕選單由左側滑入／收回，遮罩同步淡入／淡出；點遮罩、選項或 Escape 關閉，收合時停用鍵盤存取                       | `mobileMenu`                              | Keep mobile drawer visibility and accessible button state synchronized.            |
| NAV-06 | 旅程首尾摘要       | 左下角直接使用 Journey 第一筆與最後一筆的本地化 city，顯示「起點 → 終點」；單筆只顯示城市，空清單隱藏此摘要          | `content.journeyStops`                    | Derive the sidebar route from the first and last localized career entries.         |
| NAV-07 | 桌面圖示列收合     | 雙箭頭收合至圖示列；hover／focus 顯示三語標題；正文及背景同步滑動，手機維持完整抽屜                                  | `sidebarRail / sidebar-rail.css`          | Collapse the desktop rail while preserving localized routes and accessible labels. |

### 2.2 Overview 與聯絡入口（4 項）

| ID      | 功能           | 當前行為                                                                  | 模組／函式入口                 | English implementation note                                             |
| ------- | -------------- | ------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| HOME-01 | 個人介紹       | 顯示姓名、CV profile、領域簡介與學位摘要                                  | `I18n / siteContent.refresh`   | Render direct profile fields and education display text from SiteData.  |
| HOME-02 | 工作總年資計算 | 只納入 work；起訖月皆計入，重疊月份只算一次，空檔與學校不計入；顯示年與月 | `CareerDates.workDuration`     | Count unique work months while excluding education and employment gaps. |
| HOME-03 | 社群及聯絡入口 | LinkedIn、GitHub、Email；頁尾與實習對話框也有 mailto 聯絡入口             | `siteContent.refresh / chatme` | Bind contact destinations directly to the shared social object keys.    |
| HOME-04 | 頁尾識別資訊   | 品牌、標語、設定的版權年份與旅程最後所在地展示                            | `siteContent.refresh`          | Combine brand and profile fields with the final journey location.       |

### 2.3 實習資訊對話框（6 項）

| ID      | 功能           | 當前行為                                                                                                      | 模組／函式入口                        | English implementation note                                                       |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| CHAT-01 | 進站自動顯示   | 等待背景、內容及導覽進場完成，再淡入目前尺寸的桌面／手機對話框；分界 760px                                    | `chatme`                              | Await the shared entrance before fading in the disclosure for the current layout. |
| CHAT-02 | 手動開啟與關閉 | 點 Bootstrap chat-dots-fill 切換；hover／聚焦只加亮 SVG 輪廓，無方形底色；x-lg／Escape 關閉，手機可點外部關閉 | `chatme / Portfolio.disclosure`       | Apply open state, labels and focus restoration through a shared primitive.        |
| CHAT-03 | 閒置淡出       | 首次淡入完成後才啟動完整 3 秒計時；重新開啟沿用相同 idle 規則，之後約 400ms 淡出                              | `chatme.scheduleChatmeHide (private)` | Use a single configurable inactivity and fade policy for both layouts.            |
| CHAT-04 | 互動暫停倒數   | 滑鼠停留或框內鍵盤可見焦點暫停關閉；移開後重新倒數，淡出途中滑入可恢復；觸控不產生永久 hover 狀態             | `chatme.chatmeEngaged (private)`      | Suspend dismissal while pointer hover or visible keyboard focus is active.        |
| CHAT-05 | 自適應定位     | 桌面放在聊天圖示右側，手機維持在可視範圍；階梯式箭頭朝向觸發圖示，具半透明層次                                | `chatme.positionChatme (private)`     | Anchor the disclosure and its tail while respecting viewport boundaries.          |
| CHAT-06 | 實習資訊內容   | 實習狀態、地點、每週工時、介紹、專長、聯絡連結與右側工程師吉祥物；各語言有對應文字                            | `chatme / site content + runtime`     | Render localized chatme text while sharing timing, mascot and contact settings.   |

> 此 chatbox 是資訊提示框，目前沒有聊天輸入、訊息傳送或 AI 對話服務。

### 2.4 Journey 地圖與旅程（10 項）

| ID         | 功能               | 當前行為                                                                                                                    | 模組／函式入口                                                    | English implementation note                                                         |
| ---------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| JOURNEY-01 | 本地世界地圖       | SVG 國家輪廓、城市點、城市標籤、路線與地圖資訊；不呼叫地圖圖磚服務                                                          | `journey.build / MapGeometry.project`                             | Project latitude/longitude and use countryCode directly against the atlas.          |
| JOURNEY-02 | 自動飛行播放       | 飛機依順序移動、繪製進度路線；終點停留後回到第一筆重新播放，沒有額外畫返程航線                                              | `journey.frame (private)`                                         | Advance playback through the ordered career list without a synthetic return flight. |
| JOURNEY-03 | 播放控制           | 暫停、繼續、從頭播放，控制文字與狀態同步                                                                                    | `journey.controls (private)`                                      | Keep playback controls synchronized with current state and data availability.       |
| JOURNEY-04 | 手動選擇地點       | 點城市點或下方地點選項可切換並暫停播放；城市點支援 Enter／空白鍵，可見城市名稱統一支援滑鼠互動                              | `journey.select`                                                  | Select by career ID and pause automatic playback for manual navigation.             |
| JOURNEY-05 | 旅程狀態面板       | 顯示目前序號／總數、日期、機構、職稱、地區與下一段路線；標題旁地點數量由清單長度計算                                        | `journey.status / content.journeyStops`                           | Derive selection labels, next destination and counts from the same records.         |
| JOURNEY-06 | 城市資訊浮框       | hover、鍵盤聚焦或觸控選擇呈現城市、國家、期間、依 type 顯示圖示的機構名稱、職稱／學位及可空 detail 資訊；支援關閉與邊界定位 | `cityBubble`                                                      | Render and position localized city details without depending on SVG node identity.  |
| JOURNEY-07 | 城市高亮與呼吸效果 | 選取、hover、焦點及飛機抵達時讓相應城市點高亮／呼吸                                                                         | `journey.highlight (private) / src/styles/components/journey.css` | Highlight the selected or reached city while preserving motion preferences.         |
| JOURNEY-08 | 最後所在地國家高亮 | 取最後一筆 countryCode 對應國家輪廓，以主題色持續平滑呼吸高亮；減少動態時保留靜態填色，與目前選取的城市點分開呈現               | `journey.build (private)`                                         | Highlight the final array entry countryCode without a lookup table.                 |
| JOURNEY-09 | 可滑動地點清單     | 寬度溢出才出現左右箭頭，到邊界停用；支援手指、觸控板與方向鍵／Home／End，並自動帶出被選中或抵達的地點                       | `carousel`                                                        | Measure overflow, scroll destinations and reveal the active item.                   |
| JOURNEY-10 | 地圖尺寸調整       | 隨容器及螢幕尺寸調整地圖呈現，超寬及新增範圍擴充 viewBox；標籤量測避讓，浮框同步重新定位                                    | `journey.resize / MapGeometry.layoutLabels / cityBubble.position` | Resize the geographic viewport and reposition open tooltips.                        |

### 2.5 Experience 經歷（5 項）

| ID     | 功能                 | 當前行為                                                                                                                   | 模組／函式入口                                       | English implementation note                                                      |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| EXP-01 | 共用職涯資料的時間軸 | 與 Journey 使用相同數字 ID；Experience 依後端 items 陣列順序追加，order 保留但前端不排序，顯示組織、職稱、城市、國家及介紹 | `data.experiences / content.refresh`                 | Render paginated Experience records with numeric career IDs shared with Journey. |
| EXP-02 | 工作／教育分類       | type=work 顯示 building-fill；type=education 顯示 mortarboard-fill，附本地化類別說明                                       | `CategoryIcon / runtime.categoryIcons`               | Map validated career categories to one shared icon configuration.                |
| EXP-03 | 日期與附加經歷展示   | 結構化月份轉換日期文字；支援預計完成、持續中、指定結束日及可選助教記錄                                                     | `CareerDates.labels / content.refresh`               | Format structured dates and optional teaching periods consistently.              |
| EXP-04 | 時間軸互動高亮       | 未 hover 任何卡片時第一張保持高亮與節點呼吸；hover 其他卡片時效果轉移至該筆                                                | `src/styles/components/experience.css / axis tokens` | Share the rail center and transfer highlight and pulse on hover.                 |
| EXP-05 | 超過六筆展開         | 初始顯示六筆，超過時顯示剩餘數及呼吸加號；展開才追加六筆，可繼續分頁、收合與快取重開，與 Projects 共用元件                 | `collectionDisclosure.render / data.loadPage`        | Reuse a paginated disclosure while keeping six Experience cards visible.         |

### 2.6 Projects 專案（6 項）

| ID         | 功能               | 當前行為                                                                                                                                       | 模組／函式入口                             | English implementation note                                              |
| ---------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| PROJECT-01 | 專案時間軸分組     | 保持後端陣列順序，僅相鄰且同開始月份的專案共用節點                                                                                             | `content.projectGroups (private)`          | Group adjacent equal months without sorting server records.              |
| PROJECT-02 | 專案摘要卡片       | 機構、期間、類別、名稱、摘要與技能；不顯示原本 01／02 卡片序號，內容靠上且高度隨內容調整                                                       | `content.projectCard (private)`            | Render safe project summaries with stable IDs and content-driven height. |
| PROJECT-03 | 期間月數計算       | 起訖月份含頭含尾計算並加上本地化括號；例如 Sep 2025—Jan 2026 為 5 個月；卡片與詳細視窗共用                                                     | `CareerDates.projectPeriod`                | Reuse inclusive month arithmetic in cards and detail dialogs.            |
| PROJECT-04 | 專案展開／收合     | 單一列表六筆預覽，超過六筆共用 plus-circle-dotted 呼吸入口；每次追加六筆，失敗重試，收合重開使用快取                                           | `collectionDisclosure / content.refresh`   | Preserve server order and reuse the shared paginated disclosure.         |
| PROJECT-05 | 詳細資料視窗       | 右上角箭頭共用展開加號的心跳高亮；開啟專案完整流程說明、流程節點、技術說明、個人貢獻、成果與技能；可用關閉鈕、背景或原生 dialog 的 Escape 關閉 | `projects.refresh / content.projectDetail` | Keep the selected project dialog attached to its stable record ID.       |
| PROJECT-06 | 專案高亮與節點呼吸 | 預設第一張高亮；hover 其他專案時轉移至該卡片及其所屬時間軸節點                                                                                 | `src/styles/components/projects.css`       | Transfer project highlight and pulse to the hovered timeline group.      |

### 2.7 Skills 與共用技能標籤（4 項）

| ID       | 功能             | 當前行為                                                                                                                                                              | 模組／函式入口                                     | English implementation note                                            |
| -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| SKILL-01 | 分類技能展示     | 7 類：Backend & APIs（8）、AI & agents（8）、Platform & security（10）、Data & storage（13）、Workflows & delivery（7）、ML & research（14）、Web & integrations（7） | `data.snapshot.skillCategories / content.refresh`  | Render skill categories through shared skill references.               |
| SKILL-02 | 共用標籤產生     | 經歷、專案、詳細視窗及 Skills 共用 skills.tags；展開使用本地 Bootstrap plus-lg SVG，收合使用 dash-lg，單組去重並保留順序；技術品牌名稱可保留英文                      | `skills.tags / data.skillLabel`                    | Reuse one safe tag template and one normalized skill dictionary.       |
| SKILL-03 | 寬度驅動的預覽   | 實測標籤、間距及按鈕寬度；超過標籤列可用寬度 3/4 才收合，預覽連同 +N 按鈕放在該預算內，不使用固定筆數                                                                 | `skills.layout`                                    | Measure labels and the toggle against the configured width budget.     |
| SKILL-04 | 展開／收合與重排 | +N 顯示實際隱藏數，展開使用整列並換行；resize、字型載入、語言切換及原本隱藏區塊開啟後重算，保留展開狀態                                                               | `skills.capture / skills.restore / skills.refresh` | Preserve expansion by owner ID while recalculating responsive layouts. |

### 2.8 多語言（4 項）

| ID      | 功能               | 當前行為                                                                                                                                                      | 模組／函式入口                                                      | English implementation note                                      |
| ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| LANG-01 | 三語切換選單       | 英文、簡體、繁體，取得已讀資源的目標語言後切換，不重新載入頁面；失敗保留原語言並提示重試；選中標記、縮寫及鍵盤選單操作                                        | `languageMenu / I18n.setLanguage`                                   | Provide an accessible language menu without reloading the page.  |
| LANG-02 | 語言偏好記憶       | 預設英文；明確選擇後記錄於 localStorage，不可用時退回記憶體狀態                                                                                               | `I18n`                                                              | Persist supported locale preferences with an in-memory fallback. |
| LANG-03 | 文案與格式本地化   | UI、記錄內容、技能、日期、單複數、title／alt／aria-label、頁面標題及 meta description；字典查無翻譯時回退英文／鍵名；site／journey 必要欄位缺失則拒絕整份內容 | `I18n.t / I18n.applyStatic / content.refresh / siteContent.refresh` | Resolve fixed UI labels and render direct localized API fields.  |
| LANG-04 | 切換時保留互動狀態 | 保留地圖選取位置與播放進度、已展開集合／技能、開啟中的專案詳細視窗；已開城市浮框更新文案                                                                      | `app.refresh / feature refresh methods`                             | Coordinate content updates while preserving valid feature state. |

### 2.9 共用呈現與存取能力（9 項）

| ID        | 功能               | 當前行為                                                                                                   | 模組／函式入口                                                | English implementation note                                                     |
| --------- | ------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| SHARED-01 | RWD 與自適應內容   | 手機／桌面側欄切換、卡片與技能換行、內容高度、浮框尺寸與超寬畫面配置                                       | `src/styles/index.css / Portfolio.isMobile`                   | Share responsive mode between CSS and behavior without separate breakpoints.    |
| SHARED-02 | 本地與離線開啟     | HTML、CSS、JS、字型、圖示、翻譯及地圖都在本地；完整 dist 可用 file:// 直接開啟，不需先連線或執行伺服器     | `index.html / local data and assets`                          | Load all page resources locally without a runtime API or CDN.                   |
| SHARED-03 | 鍵盤與語意支援     | Skip link、焦點外框、按鈕狀態、導覽目前位置、Escape 關閉、原生 dialog、tooltip 關聯與圖示文字標籤          | `core / feature event handlers`                               | Preserve semantic controls, delegated interactions and keyboard focus behavior. |
| SHARED-04 | 減少動態效果偏好   | 尊重 prefers-reduced-motion：初始停止自動飛行，停用呼吸／過渡動畫，導覽避免平滑捲動，提示框到時直接關閉    | `Portfolio.reducedMotion / src/styles/components/journey.css` | Respect reduced motion in playback, scrolling and visual transitions.           |
| SHARED-05 | 統一圖示與視覺資產 | Bootstrap Icons 1.13.1 本地 SVG 與共用渲染器、工程師 SVG、品牌字樣、本地字型及像素浮框樣式                 | `Icons / assets / shared CSS tokens`                          | Reuse bundled visual assets and component styles across features.               |
| SHARED-06 | 滑鼠柔光           | 目前主題色的徑向光暈跟隨滑鼠；移出／失焦時淡出，觸控及減少動態效果時停用；不攔截點擊，無網路依賴           | `pointerGlow / theme.css`                                     | Track the pointer once per frame and respect input and motion preferences.      |
| SHARED-07 | 背景訊號場         | 可視區域細網格、交點十字隨機雙拍呼吸；背景分頁停排程，支援暫停及減少動態                                   | `backgroundField`                                             | Draw bounded viewport geometry and schedule soft double-beat signals.           |
| SHARED-08 | 首次進場           | 四邊定位後，內容閃現與整塊側欄／手機導覽淡入；完成後 chatbox 才淡入，滿 3 秒閒置才淡出；減少動態時直接呈現 | `backgroundField / background-field.css`                      | Reveal existing content after a finite frame entrance.                          |
| SHARED-09 | 配色與背景偏好     | 右上 Palette 圓形入口；薄荷／冰藍／琥珀／霧白，速度／強度／暫停／重置；Cookie 優先及離線備份，三語控制     | `appearance / appearanceSettings / theme.css`                 | Share validated preference keys across controls, storage and themes.            |

## 3. 模組化後的共用資料

功能從 data 模組取得資料：data.site、data.journey、data.experiences、data.projects 各自快取直接語言內容，保留 API 同名 key。data.snapshot 僅含 schemaVersion、skills 和 skillCategories；只有分類技能使用 mock/locales 業務字典。

| 資料來源                    | 責任                                                 | 共用位置                                          |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| mock/experiences/\*.json    | 三語直接經歷文字、完整 skills、可空 detail           | Experience page／size 分頁                        |
| mock/projects/{locale}.json | 三語原樣專案與完整 detail／skills                    | 卡片、時間軸及 dialog                             |
| mock/skills.json            | 唯一技能實體與分類關聯                               | Skills 分類標籤                                   |
| src/config/navigation.json  | 穩定 section key、icon、slug、aliases                | 選單、網址、跳轉                                  |
| mock/journey/{locale}.json  | 直接語言內容、數字 id、經緯度、日期與 type；陣列原序 | 地圖、首尾、年資、頁尾                            |
| mock/site/{locale}.json     | brand、profile、social、chatme 四個群組              | 品牌、介紹、教育摘要、對話框、聯絡入口、頁尾      |
| mock/locales/{locale}.json  | 分類與技能的業務字典                                 | Skills                                            |
| src/assets/maps/world.svg   | 本地 SVG 世界國界                                    | 地圖背景與國家高亮；城市位置由 Journey 經緯度計算 |

聯絡資料來自 data.site.social；固定標籤在 UI 字典。profile 直接提供本人姓名、介紹、教育摘要與短句，不使用字典鍵。

欄位用途與英文註解見 [Site mock 說明](../mock/site/README.md)，模組對照見 [Site 開發對照](site-development.md)。

mock/site/en.json、zh-Hans.json、zh-Hant.json 各提供完整 brand、profile、social、chatme。chatme 使用 title、titleSub、content、icon；前端以同名路徑呈現，文字安全換行。

固定語言清單由 `src/config/localization.json` 提供；UI 文案在 `src/locales/*.json`，動畫／技能比例／分類圖示／前端頁大小在 `src/config/runtime.json`。以上與導航、SVG 均不由 API 回傳。

年資、月數、旅程筆數、首尾城市、最後國家、經歷年份範圍與專案剩餘筆數維持衍生計算。技能 +N 由寬度決定可見數，再以 API 的關聯 total 減去可見數；僅分類後續技能使用 GET /skills；Experience／Projects skills 完整返回。

## 4. 本次重構的評析與實作

完整模組職責、重複性評估、公開函式、資料契約、事件順序、英文註解規範與測試方式，見 [模組架構文件](module-architecture.md)。上方全部 55 項均已補上模組／函式入口及英文實作註解；函式標示 private 表示僅由所屬模組內部調用。

本次新增的是內部共用模組，不另外灌入「功能總數」。重排資料改以穩定 ID 保留地圖、專案與技能狀態；集合資料支援驗證後整份替換；site／journey 另依 locale 快取，不由 data.replace 修改。空旅程／專案也有處理。Projects 依後端順序呈現且沒有近期／歷史分類。

## 5. 尚未存在與仍待決定的能力

仍沒有網站 CMS、資料庫、HTTP API、網站自有帳號權限、內容編輯／發布後台、搜尋／篩選、表單寄信或 AI 聊天服務。Sites 託管存取設定不等於網站程式內已存在登入功能。

目前已實作 mock API、loading／error／retry、成功快取、Experience／Projects 頁碼分頁與分類 cursor 分頁。HTTP adapter、遠端快照／離線策略、翻譯管理及後端資料驗證尚待實作。Profile 自然語言介紹是人工文案；版權年份是集中設定；地圖仍需要正確投影座標，並沒有地理編碼服務。相同 UI 原則不代表任意資料格式都能直接載入。

目前完整 dist 可以 file:// 離線開啟；託管網址、LinkedIn、GitHub 與 Medium 仍需網路，Email 交由裝置 mailto 處理。沒有 Service Worker／PWA。

## 6. 維護方式

新增、修改、移除功能時維護上方 ID、數量、模組入口與英文註解。資料筆數改變時更新第一節的快照統計。此文件是人工維護的功能基準，不是自動統計報表；模組間的關聯以 module-architecture.md 為準。

## 7. 工程化與回歸驗證

目前功能清單共 55 項，來源改由 `src/` 維護，`scripts/build.mjs` 產生單一 classic JS 與彙整 CSS。主題設定集中在 `src/styles/theme.css`，布局及元件各自管理 RWD。

每項功能對應的可重跑測試與驗證結果見 [regression-coverage.md](regression-coverage.md)；目錄與每個檔案的責任見 [README](../README.md)。所有功能列保留英文實作說明。

## 8. Mock API 與按需載入補充

既有 55 項頁面功能維持原 ID；以下是共用資料機制及既有行為的擴充，不重複灌入功能總數。6 支 API 與每個欄位見 [API interface format](api-interface-format.md)。

| 對應功能              | 資料入口與新行為                                                                                    | English implementation note                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| NAV／HOME／CHAT／LANG | /site 提供品牌、profile、social、chatme；導覽及 UI 字典由前端維護；/journey 提供首尾與年資索引      | Load localized site content through the client and keep navigation and UI catalogs in the frontend. |
| JOURNEY、HOME-02      | 精簡完整旅程，不隨 Experience 卡片分頁截短                                                          | Keep the complete lightweight route and work-month index independent of card pages.                 |
| EXP-01                | /experiences 一頁 6 張，載入更多才追加                                                              | Append validated experience pages without truncating the journey index.                             |
| PROJECT-01／04        | /projects 以 page／size=6 追加，收合卸下額外 DOM 但保留資料快取                                     | Append complete project pages in server order.                                                      |
| PROJECT-05            | detail 隨列表完整返回；開視窗不新增 API 請求，空詳情隱藏入口                                        | Open complete local details without a separate request.                                             |
| SKILL-01              | /skill-categories 分頁，共用更多按鈕                                                                | Page skill categories through the shared collection controller.                                     |
| SKILL-03／04          | Experience／Projects 技能完整隨卡片回傳；只有分類 /skills 按 owner 分頁；3/4 預覽含正確的遠端剩餘數 | Measure visible chips and derive hidden counts from authoritative totals.                           |
| 共用資料存取          | mock/client/store 分層；去重、快取、版本與原子驗證                                                  | Isolate transport, deduplicate requests and merge only valid snapshots.                             |

16 個 mock JSON 是業務資料來源，前端固定設定與 UI 字典另在 src 維護；元件不讀取 fixtures。為維持 file://，build 將完整 mock 嵌入 app.js，所以目前 lazy loading 是資料與 DOM 層級；後續 HTTP adapter 才會延後網路下載。

語言 client 自動附上當前 locale；首次請求前還原 localStorage 偏好。切換只重取曾載入的列表頁面／分類技能頁，保持分頁與互動狀態；快取依語言分開。語言 cookie、動態導航與 HTTP 請求仍未實作；外觀設定已有獨立 cookie。

## 維護檢查補充

驗證規則由 dataContracts 管理，store 委派驗證後才更新狀態。啟動錯誤三語化、較慢 API 的導航初始化及技能圖示／文字分工屬於既有功能修正，不新增功能數量。完整檢查與清理依據見 [maintenance-audit.md](maintenance-audit.md)。
