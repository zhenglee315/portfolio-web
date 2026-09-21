# Project structure / 專案目錄與責任

This is the complete maintained file ownership index linked from the bilingual README. / 本文件記錄各目錄與每個維護中檔案的用途，作為 README 的詳細結構參考。

Repository root: portfolio-web. Browser code lives in src, business fixtures in mock, and reproducible deployment output in dist. / 以 portfolio-web 為專案根目錄；src 為程式、mock 為資料、dist 為可重建產物。

`scripts/package.mjs` 先驗證來源與產物，再依 manifest 白名單輸出網站封裝與離線 ZIP。暫存的 `artifacts/release-*` 會在成功或失敗後自動清除；`artifacts/` 保留目前的測試報告、網站封裝和離線 ZIP；瀏覽器測試產生的截圖供人工檢視後移除。

```text
portfolio-web/
├── .openai/hosting.json
├── config/build.json
├── mock/                  # Canonical JSON fixtures
│   ├── projects/           # Direct localized full Projects, six per page
│   ├── experiences/        # Direct localized paginated Experience cards
│   ├── journey/            # Direct localized Journey arrays in server order
│   ├── site/               # Complete site payload per locale
│   └── locales/            # Business translations only
├── src/
│   ├── index.html
│   ├── app.js
│   ├── config/             # Fixed navigation, locales and runtime defaults
│   ├── locales/            # Fixed UI translations
│   ├── api/                # Mock transport and transport-independent client
│   ├── core/               # Shared services and data contracts
│   ├── features/           # UI behavior and rendering modules
│   ├── styles/
│   │   ├── index.css
│   │   ├── theme.css
│   │   ├── base.css
│   │   ├── motion.css
│   │   ├── layout/
│   │   └── components/
│   └── assets/
│       ├── maps/            # Static world SVG
│       ├── fonts/
│       └── icons/bootstrap/
├── scripts/
├── tests/
├── spec/                   # OpenAPI backend handoff
├── docs/
├── dist/                   # Generated and committed release output
├── artifacts/              # Ignored reports and packages
├── package.json
├── .gitattributes
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├── OFFLINE-README.txt
└── README.md
```

| 目錄                          | 責任                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `config/`                     | 建置設定；不放網頁業務資料                                   |
| `src/`                        | 網頁程式來源；業務資料另在 mock 維護                         |
| `mock/`                       | 16 個業務 JSON：網站內容、關聯、職涯、專案、技能與翻譯       |
| `mock/journey/`               | 三份完整旅程陣列；不排序、不查表，欄位說明在同目錄 README.md |
| `mock/site/`                  | 三份完整 SiteData；欄位英文註解見同目錄 README.md            |
| `mock/locales/`               | 三語業務文字來源；API 每次僅投影請求語言                     |
| `src/config/`                 | 固定語言清單、導覽與執行參數                                 |
| `src/locales/`                | 三語固定 UI 文案，直接隨前端建置                             |
| `src/assets/maps/`            | 版本化 SVG 國界，不透過 API 取得                             |
| `src/api/`                    | 隔離 mock／未來 HTTP transport，統一快取與請求契約           |
| `src/core/`                   | 跨功能共用服務與資料契約                                     |
| `src/features/`               | 各自管理狀態與互動的功能模組                                 |
| `src/styles/`                 | 樣式入口、主題與共用規則                                     |
| `src/styles/layout/`          | 整體頁面骨架                                                 |
| `src/styles/components/`      | 按功能歸屬的元件樣式                                         |
| `src/assets/`                 | 會原樣複製到 dist 的離線資產                                 |
| `src/assets/fonts/`           | 字型檔、CSS、來源校驗與授權                                  |
| `src/assets/icons/`           | 工程師素材與 Bootstrap 供應商資產                            |
| `src/assets/icons/bootstrap/` | 固定版本 SVG、來源與授權                                     |
| `scripts/`                    | 建置、預覽、測試、包裝及供應商同步工具                       |
| `tests/`                      | 資料／建置契約與實際瀏覽器回歸測試                           |
| `spec/`                       | 機器可讀 API schema 與確認狀態，供後端實作                   |
| `docs/images/`                | README 真實網站截圖，不放進網站執行產物                      |
| `docs/`                       | 功能、模組契約與驗收文件                                     |
| `dist/`                       | 自動產生的發布目錄；不要直接修改                             |
| `artifacts/`                  | 忽略版本控制的測試報告、離線 ZIP 及發布封裝                  |
| `.openai/`                    | 既有 Sites 站點識別與靜態發布設定                            |

### 每個維護中來源檔案

| 檔案                                              | 責任                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/index.html`                                  | 頁面語意骨架與靜態翻譯綁定；JS 標記由建置流程填入                                                   |
| `src/app.js`                                      | 唯一啟動入口，協調語言／資料刷新並保存互動狀態                                                      |
| `mock/site/en.json`                               | 完整英文 SiteData：brand、profile、social、chatme                                                   |
| `mock/site/zh-Hans.json`                          | 完整簡體中文 SiteData，欄位結構與英文一致                                                           |
| `mock/site/zh-Hant.json`                          | 完整繁體中文 SiteData，欄位結構與英文一致                                                           |
| `src/config/navigation.json`                      | 選單 key、網址 slug、舊別名與圖示的單一來源                                                         |
| `src/config/localization.json`                    | en／zh-Hans／zh-Hant 清單、顯示名稱與預設語言                                                       |
| `src/config/runtime.json`                         | 動畫時間、技能預覽比例、分類圖示與前端請求頁大小                                                    |
| `src/locales/en.json`                             | 英文固定 UI 文案與 fallback                                                                         |
| `src/locales/zh-Hans.json`                        | 簡體中文固定 UI 文案                                                                                |
| `src/locales/zh-Hant.json`                        | 繁體中文固定 UI 文案                                                                                |
| `src/api/mock-transport.js`                       | 6 路由、Experience／Projects 頁碼分頁及分類 cursor 分頁、關聯 include、少量技能預覽、延遲／失敗注入 |
| `src/api/client.js`                               | locale 請求、語言隔離快取、去重、版本檢查及已讀資源重取                                             |
| `src/core/registry.js`                            | 功能註冊、相依解析及共用 DOM／尺寸／開關工具                                                        |
| `src/core/data-contracts.js`                      | 純資料驗證：Site、Journey 與正規化集合契約；不修改快取與 DOM                                        |
| `src/core/store.js`                               | API 啟動／增量合併、分頁狀態、委派契約驗證、不可變原樣資料與語言快取                                |
| `src/core/map-geometry.js`                        | 經緯度投影、路線曲度及量測式標籤布局                                                                |
| `src/core/category-icon.js`                       | Experience／Journey 共用的工作與學校圖示                                                            |
| `mock/journey/en.json`                            | 英文完整 JourneyItem 陣列，數字 ID 與 API 原始欄位                                                  |
| `mock/journey/zh-Hans.json`                       | 簡體中文旅程，保持相同 ID 與順序                                                                    |
| `mock/journey/zh-Hant.json`                       | 繁體中文旅程，保持相同 ID 與順序                                                                    |
| `src/core/dates.js`                               | 含起訖月份的期間計算及工作月份聯集                                                                  |
| `src/core/i18n.js`                                | 固定語言清單、插值、偏好還原及非同步語言切換調度                                                    |
| `src/core/icons.js`                               | 由供應商腳本產生的可信 Bootstrap SVG 字典與渲染器                                                   |
| `mock/experiences/en.json`                        | 英文經歷完整陣列，依後端顯示順序排列                                                                |
| `mock/experiences/zh-Hans.json`                   | 簡體經歷與完整技能文字                                                                              |
| `mock/experiences/zh-Hant.json`                   | 繁體經歷與完整技能文字                                                                              |
| `mock/experiences/README.md`                      | Experience mock 欄位英文註解與維護規則                                                              |
| `docs/experiences-development.md`                 | 第 3 支 API、模組責任、同名欄位與分頁行為                                                           |
| `tests/experiences.test.cjs`                      | Experience 三語、頁碼分頁、驗證、快取及重試契約                                                     |
| `mock/projects/en.json`                           | 英文完整專案、detail 與 skills，依後端順序排列                                                      |
| `mock/projects/zh-Hans.json`                      | 簡體專案，同數字 ID、順序與筆數                                                                     |
| `mock/projects/zh-Hant.json`                      | 繁體專案，同名 API 欄位                                                                             |
| `mock/projects/README.md`                         | Projects 逐欄英文註解與空值維護規則                                                                 |
| `docs/projects-development.md`                    | Projects 同名欄位、共用分頁與詳情模組                                                               |
| `tests/projects.test.cjs`                         | Projects 直接契約、三語、六筆分頁、空值與原子切換                                                   |
| `mock/skills.json`                                | 唯一技能字典與分類關聯                                                                              |
| `src/assets/maps/world.svg`                       | 本地 SVG 國家輪廓，不依賴外部地圖服務                                                               |
| `src/features/chatme.js`                          | 桌面／手機浮框、進場後淡入、定位、互動與閒置淡出                                                    |
| `src/features/city-bubble.js`                     | 城市浮框內容、定位、hover／鍵盤／觸控互動                                                           |
| `src/features/journey.js`                         | 路線、飛機播放、停駐點選取及地圖尺寸                                                                |
| `src/features/language-menu.js`                   | 語言選單鍵盤操作、選中狀態及焦點                                                                    |
| `src/features/sidebar-rail.js`                    | 桌面圖示列收合、三語 hover／focus 提示與呈現狀態                                                    |
| `src/features/mobile-menu.js`                     | 手機滑動抽屜、遮罩、鍵盤與尺寸切換狀態                                                              |
| `src/features/navigation.js`                      | 錨點、scrollspy、深層連結及瀏覽歷史                                                                 |
| `src/features/pagination.js`                      | 經歷／專案／分類共用載入、重試與終止按鈕                                                            |
| `src/core/appearance-settings.js`                 | 前端主題設定驗證、Cookie 優先與離線備份、共用設定事件                                               |
| `src/features/appearance.js`                      | Palette 面板、三語標籤、滑桿及鍵盤控制                                                              |
| `src/features/background-field.js`                | 可視區域網格、隨機雙拍、四邊進場與播放生命週期                                                      |
| `src/features/pointer-glow.js`                    | 滑鼠光暈座標、事件合併、輸入裝置與動態偏好管理                                                      |
| `src/features/collection-disclosure.js`           | 經歷與專案共用的展開／收合、延遲載入及焦點管理                                                      |
| `src/features/projects.js`                        | 專案本地完整詳情視窗、數字 ID 選取與焦點還原                                                        |
| `src/features/render.js`                          | 共用資料轉成經歷／專案／技能模板，統一 escaping                                                     |
| `src/features/site-content.js`                    | 同名 site 欄位綁定、姓名／SEO／教育摘要、聯絡與旅程摘要                                             |
| `src/features/skill-layout.js`                    | 技能標籤模板、3/4 寬度量測及展開狀態                                                                |
| `src/features/stop-carousel.js`                   | 地點滑動列、溢出箭頭、邊界及鍵盤操作                                                                |
| `mock/locales/en.json`                            | 英文專案／技能實體與記錄文字，亦為翻譯回退來源                                                      |
| `mock/locales/zh-Hans.json`                       | 簡體中文，鍵及插值參數與英文一致                                                                    |
| `mock/locales/zh-Hant.json`                       | 繁體中文，鍵及插值參數與英文一致                                                                    |
| `src/styles/index.css`                            | 唯一樣式入口，宣告主題／基礎／版面／元件的載入順序                                                  |
| `src/styles/theme.css`                            | 全部 authored CSS 色彩、字型、主要尺寸、動畫時間與 RWD 模式                                         |
| `src/styles/base.css`                             | 元素預設、通用文字連結、焦點與 reduced-motion 規則                                                  |
| `src/styles/motion.css`                           | Experience 與 Projects 共用的時間軸呼吸動畫                                                         |
| `src/styles/layout/page.css`                      | 主內容區、section 標題與頁尾響應式布局                                                              |
| `src/styles/layout/navigation.css`                | 側欄、品牌、手機 header 及導覽抽屜                                                                  |
| `src/styles/components/chatme.css`                | 資訊浮框、半透明表面、箭頭及淡出樣式                                                                |
| `src/styles/components/dialog.css`                | 原生專案 dialog、遮罩與架構流程樣式                                                                 |
| `src/styles/components/experience.css`            | 經歷卡片、節點居中與預設／hover 高亮                                                                |
| `src/styles/components/icons.css`                 | 共用 Bootstrap SVG 基礎尺寸與顏色繼承                                                               |
| `src/styles/components/journey.css`               | 地圖、城市點、播放狀態及地點滑動列                                                                  |
| `src/styles/components/language.css`              | 語言選單、縮寫與選取狀態                                                                            |
| `src/styles/components/overview.css`              | 首頁介紹、姓名標題及聯絡圖示                                                                        |
| `src/styles/components/pixel-bubble.css`          | 共用像素圓角外殼／箭頭及城市資訊浮框                                                                |
| `src/styles/components/pagination.css`            | 載入、錯誤／重試與追加技能的主題化樣式                                                              |
| `src/styles/components/sidebar-rail.css`          | 桌面收合、正文／背景同步寬度動畫與標題提示                                                          |
| `src/styles/components/appearance.css`            | 背景設定面板與響應式控制                                                                            |
| `src/styles/components/background-field.css`      | 裝飾背景、四邊定位與內容閃現                                                                        |
| `src/styles/components/pointer-glow.css`          | 不攔截互動的柔光圖層；顏色、半徑使用 theme.css                                                      |
| `src/styles/components/collection-disclosure.css` | 經歷／專案共用展開入口、數量、呼吸加號及 RWD                                                        |
| `src/styles/components/projects.css`              | 專案時間軸與卡片                                                                                    |
| `src/styles/components/skills.css`                | 技能標籤、量測容器與展開按鈕                                                                        |

### 工具、測試與文件

| 檔案                           | 責任                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| config/build.json              | 唯一 script 順序、CSS 入口與資產來源；加入新 JS 必須登記                                                 |
| scripts/lib/mock-data.mjs      | 分別載入業務 fixture 與前端設定／UI 字典／SVG，驗證路徑，沒有 AJAX                                       |
| scripts/build.mjs              | 驗證路徑、串接 classic JS、展開本地 CSS imports、複製資產、產生 SHA-256 manifest；--check 比對來源與產物 |
| scripts/serve.cjs              | 限於 dist 的本機靜態預覽伺服器，不作 production 後端                                                     |
| scripts/test.mjs               | 統一調度測試、彙整 exit code 並輸出報告                                                                  |
| scripts/package.mjs            | 驗證後以 manifest 白名單產生網站封裝及離線 ZIP                                                           |
| scripts/vendor-icons.mjs       | 從官方固定版本同步 SVG／授權，產生 src/core/icons.js；只有這個維護動作需要網路                           |
| tests/fixtures.cjs             | 共用讀取真實 JSON fixture 與建立完整測試快照                                                             |
| tests/api.test.cjs             | 16 個 API 契約案例：路由、cursor、快取、重試、空集合及原子合併                                           |
| tests/api-browser.cjs          | 大量資料的實際 UI 分頁、失敗重試、detail 按需載入、三語及離線驗證                                        |
| tests/helpers.cjs              | 以 VM 建立隔離的資料／服務測試環境                                                                       |
| tests/data.test.cjs            | 三語契約、關聯驗證、原子更新、重排／空集合、月份業務規則、模組生命週期                                   |
| tests/maintenance.test.cjs     | 來源責任清單、英文檔頭、CSS 引用／token、Markdown 連結、JSON 範例與功能驗收 ID 同步                      |
| tests/build.test.cjs           | 發布校驗碼、離線資源引用、單一入口與主題色約束                                                           |
| tests/browser.cjs              | 15 專案 × 3 語言、狀態保存、資料異動與 30 組 RWD                                                         |
| tests/journey-browser.cjs      | 飛行抵達、地圖選取、tooltip、播放及 1／24 個地點的滑動列                                                 |
| tests/sidebar-rail-browser.cjs | 收合／展開動畫、三語提示、聊天框定位、四尺寸、手機隔離與離線                                             |
| tests/navigation-browser.cjs   | 所有錨點、舊別名、query／歷史還原、scrollspy、長畫面與手機選單                                           |
| tests/chat-idle-browser.cjs    | 自動／重開倒數、hover／焦點暫停、淡出救回、關閉及 reduced motion                                         |
| tests/chat-entry-browser.cjs   | 7 種尺寸首次顯示、3 秒淡出、觸控及邊界                                                                   |
| tests/appearance-browser.cjs   | 三語／四主題、六尺寸、Cookie／file:// 備份、重置、錯誤值及動態偏好                                       |
| tests/interactions-browser.cjs | 共用內容、圖示、資源、hover、焦點、標籤計數、語言記憶及手機外部關閉                                      |
| mock/README.md                 | 全部 mock 檔案責任、資料界線與維護流程                                                                   |
| mock/site/README.md            | SiteData 逐欄用途、型別及英文註解                                                                        |
| mock/journey/README.md         | 旅程逐欄英文註解、順序、座標與可空欄位說明                                                               |
| docs/journey-development.md    | 第 2 支 API 與地圖模組、命名及自動布局對照                                                               |
| docs/site-development.md       | 第 1 支 API 與 DOM／模組命名對照、資料流及修改步驟                                                       |
| docs/api-interface-format.md   | 6 支 GET 的完整輸入／回應、欄位、錯誤、版本及 lazy loading 契約                                          |
| docs/sidebar-navigation.md     | 桌面图示列／手機抽屜責任、命名、動態樣式與維護步驟                                                       |
| docs/appearance-development.md | 背景功能、設定格式、離線儲存、主題 token 及動畫生命週期                                                  |
| docs/current-page-features.md  | 55 項功能、來源／模組入口與每項英文實作註解                                                              |
| docs/module-architecture.md    | 重用評估、資料契約、依賴方向、更新調度與未來 API 邊界                                                    |
| docs/maintenance-audit.md      | 全專案檢查結果、修正、清理依據與維護規則                                                                 |
| docs/regression-coverage.md    | 每項功能的驗證入口、驗收結果及環境限制                                                                   |
| .openai/hosting.json           | 原有 Sites project_id 與 dist 靜態輸出位置                                                               |
| package.json                   | 專案識別、Node 版本及標準開發命令別名；無 runtime 套件                                                   |
| .gitattributes                 | authored／generated 文字使用 LF；供應商資產保留原始位元組，確保跨平台建置與 checksum 一致                |
| .gitignore                     | 排除本機工具、測試截圖與封裝產物                                                                         |
| .prettierrc.json               | 2 spaces、分號、雙引號與 trailing comma 規範                                                             |
| .prettierignore                | 第三方資產、自動輸出與暫存不重複格式化                                                                   |
| OFFLINE-README.txt             | 交付給訪客的離線開啟步驟與外部連結說明                                                                   |
| README.md                      | 專案操作、目錄／檔案責任及維護規則                                                                       |

### 產物與資產檔案

| 檔案／規則                                | 責任                                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dist/index.html                           | 由 src/index.html 產生，引用單一 app.js 與 styles.css                                                                                                                                   |
| dist/app.js                               | 按 config/build.json 順序組合的 classic script，含原始檔路徑註記與英文註解                                                                                                              |
| dist/styles.css                           | 展開 src/styles/index.css 的所有樣式模組；保留本地字型 CSS 引用                                                                                                                         |
| dist/build-manifest.json                  | 每個發布檔案的 SHA-256 清單，建置可重現且不加入時間戳                                                                                                                                   |
| dist/assets/\*\*                          | src/assets 原樣複製；不得分別編輯兩份                                                                                                                                                   |
| src/assets/icons/cow-engineer.svg         | 從使用者素材抽出的獨立工程師圖像                                                                                                                                                        |
| src/assets/icons/bootstrap/\*.svg         | 每個檔名等於 Bootstrap Icon 名稱；例如 building-fill.svg 為工作、mortarboard-fill.svg 為學校、award-fill.svg 為 Projects、braces-asterisk.svg 為 Skills，其餘為同名操作／導覽／社群圖示 |
| src/assets/icons/bootstrap/LICENSE        | Bootstrap Icons MIT 授權                                                                                                                                                                |
| src/assets/icons/bootstrap/SOURCES.json   | 每個 SVG 的版本與來源對照                                                                                                                                                               |
| src/assets/fonts/fonts.css                | 本地 @font-face 家族、字重與字元範圍的唯一映射                                                                                                                                          |
| src/assets/fonts/\*.woff2                 | DM Sans、IBM Plex Mono 字型子集；雜湊檔名及每個來源／checksum 詳見 SOURCES.json，保留供應商檔名                                                                                         |
| src/assets/fonts/DM-Sans-OFL.txt          | DM Sans 開放字型授權                                                                                                                                                                    |
| src/assets/fonts/IBM-Plex-Mono-OFL.txt    | IBM Plex Mono 開放字型授權                                                                                                                                                              |
| src/assets/fonts/SOURCES.json             | 每個字型的來源 URL 與 SHA-256 清單                                                                                                                                                      |
| artifacts/test-results.json               | 最近一次測試的時間、各組結果與耗時；不提交 Git                                                                                                                                          |
| artifacts/site.tar.gz                     | Sites 封裝，內含 dist/.openai/hosting.json                                                                                                                                              |
| artifacts/Zheng-Lee-Portfolio-Offline.zip | 完整離線版，解壓縮後開 index.html                                                                                                                                                       |

## Audit and handoff additions / 本輪新增工具與文件

| File / 檔案                      | Responsibility / 責任                                        |
| -------------------------------- | ------------------------------------------------------------ |
| `docs/project-structure.md`      | 各資料夾與維護中檔案的責任索引                               |
| `docs/function-reference.md`     | 由函式英文註解產生的具名函式索引                             |
| `docs/backend-handoff.md`        | 後端實作、驗證、語言、錯誤與未實作 HTTP 邊界                 |
| `docs/final-verification.md`     | 本輪清理、資料邊界、4K、文件與完整測試結果                   |
| `docs/images/desktop.png`        | 1440px 英文桌面實際畫面，README 預覽                         |
| `docs/images/mobile.png`         | 390px 繁體中文手機實際畫面，README 預覽                      |
| `scripts/document-functions.mjs` | 函式註解與 Markdown 索引產生／一致性檢查                     |
| `scripts/capture-readme.cjs`     | 以本地網站重拍 README 截圖，不更改部署縮圖                   |
| `tests/boundaries-browser.cjs`   | 0／1／6／7／19 筆、三語、手機／平板／4K 初始載入與分頁       |
| `tests/spec.test.cjs`            | OpenAPI 引用、狀態、DTO 名稱與實際 mock 範例一致性           |
| `spec/openapi.json`              | 六支 GET API 的 OpenAPI 3.1 schema；前四支已確認，兩支待討論 |
| `spec/README.md`                 | API schema 使用、更新與驗證方式                              |

## Ownership rules / 維護規則

- CSS is composed once through src/styles/index.css; shared colors and motion values come from theme.css. / CSS 只由單一入口載入，配色與共用參數來自主題。
- Add JS modules and mock files explicitly to config/build.json. / 新 JS 與 mock 檔案須登記建置清單。
- Keep numeric API identities and original field names; do not add alias tables. / 保留數字 ID 與同名欄位。
- Generated dist and vendor SVG/font sources are intentional copies; keep provenance and licenses. / dist 與供應商素材有明確用途，不當成冗餘來源刪除。
- No runtime packages are installed. package.json supplies metadata and command aliases. Optional test tools are external development dependencies. / 無執行期套件，package.json 為專案資訊與命令；瀏覽器測試工具屬開發環境。
- Temporary reports/packages belong to ignored artifacts; reproducible README images belong to docs/images. / 暫存報告與封裝忽略版控，README 圖片則提交。
