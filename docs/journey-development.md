# Journey API 與地圖開發對照

第 2 支 GET /api/v1/journey 已依確認格式實作。第 5～6 支保留既有契約，尚未進入下一輪討論。請求 locale 與回應 envelope 沿用 site；page 為 null，included 的關聯陣列與業務翻譯為空。

## 原樣命名與資料流

mock/journey/{locale}.json → MockPortfolioTransport → PortfolioApi → data.journey → Journey／城市資訊框／首尾摘要／工作年資。所有內容直接讀取同名 key，不轉成 company、short、role、country 或 text 翻譯鍵。

| API 欄位                               | 使用者                           | 用途                                             |
| -------------------------------------- | -------------------------------- | ------------------------------------------------ |
| id                                     | journey、cityBubble、carousel    | 選取與互動識別；數字，與 Experience 同筆記錄一致 |
| countryCode                            | journey                          | 直接比對 SVG data-country，最後一筆國家高亮      |
| countryName、city                      | cityBubble、journey、siteContent | 地區文字、首尾摘要及頁尾                         |
| latitude、longitude                    | MapGeometry、siteContent         | SVG 投影及座標顯示                               |
| type                                   | CategoryIcon、CareerDates        | 工作／學校圖示及工作月份聯集                     |
| startMonth、endMonth、endDay、expected | CareerDates                      | 本地化年月、可選日期與預計標示                   |
| organizationName                       | journey、cityBubble              | 狀態列、資訊框機構全名                           |
| organizationCode                       | content.journeyStops             | 下方旅程選項的機構簡稱                           |
| organizationTitle                      | journey、cityBubble              | 職稱／學位                                       |
| detail                                 | cityBubble                       | 非空時顯示附加期間與 content                     |

地圖元件內的 point、date、year 是純計算結果，不是 API 欄位別名；不存回 mock 或資料庫。前端 DOM attribute 必然是字串，只在事件入口 Number(...) 還原數字 ID，不建立 string-ID／numeric-ID mapping table。

API 的 camelCase 對應 CSS／DOM 的 kebab-case：organizationName → journey-organization-name／stop-organization-name，organizationTitle → journey-organization-title，organizationCode → stop-organization-code，detail → journey-detail。stop-summary 是職稱與地區的合成文字，不是 API 欄位別名。

## 模組界線

- src/core/data-contracts.js：validateJourney，檢查 API 原始欄位與日期。
- src/core/store.js：委派 validateJourney、管理 journeyByLocale 與唯讀 data.journey；保持陣列順序，驗證後才採用。replaceJourney(rows, notify) 供完整資料更新／測試，僅替換當前語言。
- src/core/map-geometry.js：Mercator 投影、距離推導的飛行曲線、量測式文字避讓；無城市特例或 lookup table。
- src/core/category-icon.js：CategoryIcon(type) 與 runtime.categoryIcons 共用；work 是 building-fill，education 是 mortarboard-fill。
- src/features/journey.js：播放、選取、RWD viewBox、節點與標籤互動；接收 API 原始欄位。
- src/features/city-bubble.js：安全呈現原始欄位，organizationName 前插入共用圖示；detail 為空不留空白區塊。
- src/features/render.js：旅程選項、年資與完整年份範圍使用 data.journey，不受 Experience 分頁影響；Experience 卡片使用 data.experiences 直接欄位；Projects 使用 data.projects 的原始欄位，detail 隨列表完整提供。
- src/features/site-content.js：旅程首尾與頁尾地區使用 data.journey，教育摘要仍來自 site.profile。
- src/styles/components/icons.css：共用分類圖示；pixel-bubble.css 管理資訊框圖示顏色與間距。

site 與 journey 分別按語言快取，均不放進 data.snapshot。切換語言先驗證兩份直接文字回應，成功才換語言；失敗保留原內容，拒絕的回應從快取移除以供重試。集合分頁不修改或截短 Journey。

## 地圖投影與自動布局

world.svg 使用 Mercator：scale=365、center=[58,34]、translate=[540,245]；參數集中於 runtime.journey.projection，座標陣列順序為 [longitude, latitude]，translate 為 [x,y]。這是整張底圖的版本設定，不是每個城市的硬編碼。

MapGeometry.project 接收 latitude／longitude。緯度在計算時限制至約 ±85.051129°，避免極點無窮值；原始 API 值不改寫。新站超過既有歐亞裁切範圍時，viewBox 擴大包含站點。底圖本身仍是目前隨站點交付的 SVG，不是外部地圖服務。

標籤以 getBBox 量測文字，在多個方向與距離嘗試放置，避開其他標籤、節點與邊界。選取／抵達城市優先配置；無空間時隱藏文字但保留停駐點、tooltip 與滑動選項。resize、語言、資料、字型載入與高亮變化都會重新布局。圓點與可見名稱統一支援互動。

## 最後所在地的持續呼吸高亮

`journey.build` 每次重建地圖時，以 Journey 陣列最後一筆的 `countryCode` 比對本地 SVG 的 `data-country`，只為匹配輪廓加上 `final-country`。保持後端排序，與播放／手動選取的城市無關；換資料或語言時重新判定。空陣列或底圖沒有匹配輪廓時，不高亮任何國家，不回退到寫死的國家，也不增加 mapping table 或 API 欄位。

`journey.css` 的 `country-breathe` 只改變填色、邊框及柔光，固定 4 秒循環，以 ease-in-out 持續由暗漸亮再回暗；0%／100% 為低點、50% 為高點，與聊天圖示相同節奏，沒有隨機排程或雙拍停頓，沒有縮放或改動地圖座標。速度、峰值填色與柔光由 `theme.css` 的 `--duration-country-pulse`、`--country-pulse-fill`、`--country-pulse-glow` 統一調整，四種主題共用。`prefers-reduced-motion` 停用動畫並保留靜態國家高亮。此裝飾效果與飛機播放獨立，不新增 JS 計時器。

## 維護與驗證

三語 mock 需同時維護，資料版本與檔案清單在 config/build.json。API 格式見 [API 規格](api-interface-format.md)，逐欄英文註解見 [mock/journey/README.md](../mock/journey/README.md)。

- tests/api.test.cjs：沒有 entity／翻譯表也可讀 Journey；不排序、數字 ID、nullable endMonth／detail、endDay、座標範圍、驗證失敗原子保留及重試。
- tests/journey-browser.cjs：播放／抵達／手動暫停、三語、1／24 站、圖示、手機與桌面標籤不重疊、新座標、null detail 與文字 escaping。
- 其餘回歸套件維持 55 項功能；最新結果見 [回歸文件](regression-coverage.md)。

背景主題切換同步更新地圖與浮框的 theme token，但不更改 Journey API、地圖座標或國家高亮判定。背景動畫的暫停不控制飛機；兩個功能各自管理播放狀態。

### 契約驗證位置

Journey 欄位檢查由 `src/core/data-contracts.js` 的 `validateJourney` 統一管理；store 保留 `data.validateJourney` 入口並負責凍結／快取／通知。此拆分不改變 API 欄位、數字 ID 或後端陣列順序，沒有新增 mapping table。
