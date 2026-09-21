# Experience 開發對照

第 3 支 `GET /api/v1/experiences` 已確認。第 5～6 支 API 保留原契約，尚待逐支討論。沒有新增 API、HTTP adapter 或資料庫。

## 契約與命名

請求 `locale=en|zh-Hans|zh-Hant`、`page=1`、`size=6`。成功回應直接是 `{ total, pages, page, size, items }`，沒有 `data`、`included` 或 `meta` 包裝。`items` 每筆使用原始 key，不轉換成 company／role／description／tags。

| API 欄位                                                | 前端使用                                         | English maintenance note                                              |
| ------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| id                                                      | data-experience-id、experience-{id} 技能展開識別 | Keep a positive numeric ID stable across languages and Journey.       |
| order                                                   | 原樣保留                                         | Preserve the field; render the response array without client sorting. |
| type                                                    | CategoryIcon(type)                               | Reuse work/education icons with Journey.                              |
| countryCode / countryName / city                        | 保留代碼，直接呈現地區文字                       | No location or country lookup table is required.                      |
| organizationCode / organizationName / organizationTitle | 保留簡稱；名稱、職稱直接呈現                     | Keep API names throughout the store and card template.                |
| startMonth / endMonth / endDay / expected               | CareerDates 驗證與顯示                           | Reuse date formatting; a null endMonth means present.                 |
| content                                                 | 經歷介紹                                         | Escape plain text at the rendering boundary.                          |
| skills                                                  | 共用 skills.tags 元件                            | Render the complete localized string array without a skill request.   |
| detail                                                  | 補充期間及內容                                   | Omitted or null hides the supplemental paragraph.                     |

## 模組責任

- `mock/experiences/{locale}.json`：三份完整直接文字陣列，按後端預期順序維護。它們是完整測試資料庫，transport 再切成每頁六筆。
- `scripts/lib/mock-data.mjs`、`config/build.json`：明確登記來源，建置時嵌入離線 bundle。JSON 不加入註解，欄位英文註解放在 [mock 說明](../mock/experiences/README.md)。
- `src/api/mock-transport.js`：依語言選擇陣列、檢查 page／size、切頁；不查 entities 或業務字典。
- `src/api/client.js`：驗證 Page 回應、依 path/query/locale 快取、合併重複請求。translate 回傳 `{ path, query, response }` 描述，以識別沒有 meta 的 Experience 回應；這是內部請求紀錄，不是 API 額外包裝或欄位 mapping。
- `src/core/data-contracts.js`：validateExperiences 驗證 ID、文字、日期、skills、可空 detail；失敗不提交資料。
- `src/core/store.js`：experiencesByLocale 保存原樣不可變陣列；data.experiences 只讀取當前語言。loadPage 管理已成功載入頁碼、重試與列表狀態。
- `src/features/render.js`：依 data.experiences 順序輸出卡片，直接引用 API key；只在顯示時計算日期文字。
- `src/features/skill-layout.js`：與專案及技能分類共用 chips、3/4 寬度計算及 plus-lg／dash-lg。Experience／Projects 傳入完整文字；只有技能分類仍使用 skillIds。
- `src/features/collection-disclosure.js`、`src/features/pagination.js`：共用列表展開、收合、載入中及重試 UI。內部 hasMore 由 page < pages 推導，不要求後端提供。

## 分頁、多語系與狀態

1. 初始只請求第 1 頁。展開時請求下一頁，驗證成功後才追加並更新 page。
2. 每頁容量固定六筆，末頁可以不足六筆；size 仍為 6。零筆時 total=0、pages=0、page=1、items=[]。超出末頁回空 items。
3. 載入中去重，失敗保留舊資料及頁碼，重試同頁；收合只移除額外 DOM，重開不重新請求。
4. 切換語言重取已載入頁碼，原子驗證完成後才切換。三語的 ID、總數、順序及非語言欄位應相同。失敗仍保留原語言，修正後可重試。
5. 技能 +N = skills.length - 可見數。技能展開完全是前端顯示，不呼叫 /skills，沒有技能 cursor 或頁碼。
6. 此 Page 契約沒有 revision。重複 ID、total 改變或語言順序不一致會被拒絕，但前端不能保證資料庫跨請求的快照一致；後端保持穩定排序，資料變更時重新整理列表。
7. `data.replaceExperiences` 只供完整當前語言陣列匯入／測試；獨立於 `data.replace` 的舊集合快照。它不修改 mock 或 API 快取。

## 清理與維護

已移除 mock/careers.json、career.\* 業務翻譯鍵、Experience 的 organizationId／locationId／skillIds／text／teaching 轉換流程，以及 /skills 的 career owner。Projects 已於第 4 支完成直接文字整合；只有技能分類仍使用 skills 和 mock/locales，entities 已移除。第 5～6 支留待下一輪討論。

維護者修改內容應同步三語 JSON；新增記錄保持相同 ID 與順序，detail 可省略或 null，skills 無值使用 []。新增欄位需同步 validator、實際使用的模板及 API 文件，不添加只為舊命名相容而存在的轉換表。

## 驗證入口

`tests/experiences.test.cjs` 涵蓋精確回應結構、三語、不依賴名稱表、6/12/14 分頁、空頁、非法參數、重試、去重、完整技能、可空 detail、語言切換與原子驗證。`tests/api-browser.cjs` 驗證超過六筆的展開／收合、語言保留與離線；`tests/browser.cjs` 驗證三語排版、直接文字轉義與共用元件。統一執行入口為 `node scripts/test.mjs`。
