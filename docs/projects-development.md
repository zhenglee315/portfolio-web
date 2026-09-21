# Projects 開發對照

第 4 支 API 已確認並落地：`GET /api/v1/projects?locale=en&page=1&size=6`。成功直接回傳 `{total,pages,page,size,items}`。後端決定排序，前端只依 items 順序追加；三語 ID、順序及總數一致。ID 維持正整數 JSON number，需在 JavaScript 安全整數範圍 1～9007199254740991。完整規格與範例見 [API 文件](api-interface-format.md)，英文逐欄註解見 [mock 說明](../mock/projects/README.md)。

## 命名與內容分工

mock → transport → client → store → renderer 全程使用 API 原始 key，不建立欄位別名或組織／技能 mapping table。`organizationCode` 為顯示簡稱，不需要查表。`projectName` 是專案名稱，`projectTitle` 是分類短標題；`organizationTitle` 是職稱或學位名稱。

| 欄位                        | 呈現與內容                                 |
| --------------------------- | ------------------------------------------ |
| intro                       | 卡片上的簡短介紹                           |
| detail.workflowDescription  | 視窗內完整業務流程，說明輸入、處理與使用端 |
| detail.flow                 | 按 API 順序呈現的流程節點                  |
| detail.technicalDescription | 架構、技術選擇與實作方式                   |
| detail.contribution         | 個人負責的具體工作                         |
| detail.outcome              | 可核實的成果與影響                         |

已依現有 CV 與專案資料補充三語流程說明；例如 HolmesBase 將跨廠資料、共用處理、排程與使用端串起，再於 technicalDescription 說明 REST／gRPC、FastAPI 及監控。沒有重複把 intro 填進詳情。

## 模組與工程結構

| 檔案                                                                      | 責任                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `mock/projects/{locale}.json`                                             | 完整三語來源，數字 ID 與順序一致                                                              |
| `config/build.json`、`scripts/lib/mock-data.mjs`                          | 登記並嵌入三語 fixtures，支援 file:// 離線                                                    |
| `src/api/mock-transport.js`                                               | 依 locale、page、size 切片；完整回傳 detail 與 skills                                         |
| `src/api/client.js`                                                       | 共用 Page 結構驗證、按語言快取與請求去重                                                      |
| `src/core/data-contracts.js`                                              | validateProjects 驗證安全 ID、日期、技能與可空詳情                                            |
| `src/core/store.js`                                                       | data.projects 與 replaceProjects 保留原始 key；共用 numbered 資源調度處理分頁、驗證和語言快取 |
| `src/features/render.js`                                                  | projectCard／projectDetail 同名欄位取值、純文字 escaping、可空區塊隱藏                        |
| `src/features/projects.js`                                                | 數字 selectedId、原生 dialog、關閉與焦點還原；無非同步詳情請求                                |
| `src/features/collection-disclosure.js`、`pagination.js`                  | 共用六筆預覽、展開收合、下頁／重試控制                                                        |
| `src/features/skill-layout.js`                                            | 共用 3/4 寬度技能預覽；專案技能完整在本地展開                                                 |
| `src/core/dates.js`                                                       | 專案自身起訖月、預計／至今及含頭尾月期間                                                      |
| `src/styles/base.css`、`components/projects.css`、`components/dialog.css` | 共用純文字換行、卡片和 dialog 樣式，配色取自 theme.css                                        |

numbered 只登記各資源的 cache 與 validator，沒有轉換 object key。技能分類仍使用既有字典；這是尚待討論的第 5／6 支 API，不影響 Projects 的直接文字。

## 分頁、快取與空值

初始載入六筆，total 超過六才顯示共用展開入口。首次展開取得第二頁；後續按鈕每次取六筆，成功後 page 才加一。正在載入時去重，失敗保留原頁碼與資料並重試同頁。剩餘未載入筆數是 `total - loadedCount`；收合入口的數量是 `total - 6`，包含快取中已載入但被收起的卡片。收合不清除快取，重開不重複請求。

不再劃分近期／歷史，不要求 scope、earlier、meta.groups 或組織年份摘要。同月份僅將相鄰卡片分組，絕不為分組重排後端資料。

detail 和 skills 每頁一次回傳。detail=null 或空字串時不顯示詳情入口；物件五個欄位都空也不顯示。文字 null／空白不顯示該段標題；flow=[]／null 不顯示流程，單節點不顯示箭頭；skills=[]／null 不顯示標籤。flow 與 skills 的非空元素必須是非空字串。欄位缺失屬契約錯誤，不猜測預設結構。

使用者正常輸入文字與換行即可；JSON 編碼由 serializer 負責。內容不執行 HTML／Markdown，輸出一律 escaping，再以 pre-wrap 保留換行；長字串可換行。detail 技術標題等固定 UI 標籤在 src/locales，API 只提供已翻譯資料。

切換語言重取已載入頁，確認相同 ID、順序與 total 後才切換，保留展開與 selectedId。失敗保留原語言，可重試。沒有 revision 的頁碼契約無法保證跨請求快照隔離；total 改變或重複 ID 會拒收，後端仍須保證穩定排序。

## 驗證與維護

`tests/projects.test.cjs` 驗證三語、6/6/3 分頁、空值、非法 ID／日期、重試、去重與語言切換原子性；`tests/api-browser.cjs` 驗證大量資料和完整技能；`tests/browser.cjs` 驗證 15 個 dialog × 三語、RWD 與原生互動。`tests/maintenance.test.cjs` 核對文件範例與 mock 一致。

修改來源後執行 `node scripts/build.mjs` 及 `node scripts/test.mjs`。CSS 統一由 index.css 調度，顏色只使用 theme.css token。沒有新增執行期套件、外部素材或 AJAX；離線檔案包含完整 fixtures，真正網路 lazy loading 需未來替換 HTTP transport 並停用 mock 嵌入。
