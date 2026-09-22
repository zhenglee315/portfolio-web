# 完整功能回歸對照

驗收日期：2026-09-21。範圍是 [功能清單](current-page-features.md) 的全部 **55 項功能**，不是僅檢查首頁載入。

最新全專案驗證見 [final-verification.md](final-verification.md)，包含三語 30 組尺寸、0／1／6／7／19 筆啟動與 4K。以下保留各次歷史驗收結果。

## 冷啟動修正（2026-09-22）

新增 tests/cold-entry-browser.cjs，從 deferred script 尚未執行時開始檢查，補上過去從 data-ready 之後才開始驗證的缺口。逐幀核對就緒前內容不外露，並驗證三語 × 390／1024／1440／3840px、減少動態、保存暫停、載入失敗與重試。實際執行結果見 [最後驗證](final-verification.md)。

## 歷史：Projects 第 4 支 API 驗收（2026-09-21）

清理後完整執行 node scripts/test.mjs：**11/11 組通過，32 個契約案例通過**。52 份 authored JavaScript 語法檢查通過，git diff --check 通過。桌面英文與 390px 繁體 HolmesBase 詳情已視覺檢視，流程、技術說明及換行呈現正常。

新增 Projects 三語 6/6/3 分頁、同名 key、數字安全 ID、日期／expected、可空 detail／flow／skills、失敗保留頁碼、併發去重、語言排序一致性與失敗重試。大量資料測試使用 126 專案、81 經歷和每筆 120 個完整技能；初始只呈現六張卡，詳細視窗與技能展開沒有新增請求。瀏覽器另驗證 HTML 字串不執行、正常換行、空段落隱藏和單流程節點無箭頭。

既有 15 專案 × 三語、21 組 RWD、地圖、導覽、側欄、聊天框、四主題與离線零外部資源請求全部通過。維護測試核對三語 ID／順序／日期、API 範例與 canonical mock，以及文件連結、來源責任、註解及 CSS 調度。清理了舊 entity／project 字典資料、無使用者的欄位轉接與 15 筆不再被分类引用的技能實體。API 現為六支，第 5／6 支留待後續討論。

以上驗證使用本機 Edge／Playwright；沒有接上正式後端，不宣稱已驗證未來 HTTP 或資料庫實作。以下為先前歷史紀錄。

## 歷史：工程維護與清理驗收

2026-09-21：完整執行 `node scripts/test.mjs`，**11/11 組通過，29 個契約案例通過**。50 份 authored JavaScript 語法檢查與 git diff 空白檢查通過。涵蓋本頁 55 項功能，三語、21 組 RWD、四主題、桌面／手機選單、圖示列、聊天框、地圖與大量資料 lazy loading；新增三語啟動失敗及 API 晚於 window.load 的導航／scrollspy 驗證。

本輪拆出 dataContracts、補英文註解、統一技能圖示與文案責任，清除覆蓋式 CSS／未使用 token／舊衍生欄位，補齊來源與文件一致性檢查。另比對 14 組尺寸／開關狀態的共用骨架樣式，檢視桌面圖示列與手機亮色設定面板。檢查過程的文件連結解析與功能表取樣範圍誤報已修正；較慢 API 的導航測試曾揭露首批卡片尚未完成渲染就定位的時序問題，改為首輪渲染完成後初始化，最後完整回歸通過。

測試使用本機 Edge／Playwright，無執行時外部資源請求。完整清理依據見 [maintenance-audit.md](maintenance-audit.md)；以下各次 9／10 組結果是歷史紀錄。

## 歷史：Journey API 驗收

2026-09-21：第 2 支 Journey 改為三語直接文字陣列，數字 ID、後端陣列順序、經緯度投影及自動標籤避讓。Experience 與城市浮框共用分類圖示。完整重新執行 scripts/test.mjs，**9/9 組通過，26 個資料／建置／API 契約案例通過**。

新增驗證包括：沒有 entity／翻譯字典仍可取得 Journey、同月份仍保持陣列順序、ID／日期／經緯度的原子驗證、失敗語言重試、兩種機構圖示、null detail、任意新增地點、文字 escaping，以及 320／390／760／1080／1920px × 三語標籤邊界及不重疊。既有 1／24 站、播放抵達／重播、鍵盤、tooltip、首尾與 RWD 回歸仍執行。

完整回歸另找出歷史專案載入失敗時，重繪中的原生 details toggle 可能意外自動重試。已加入載入／錯誤狀態防護，並驗證重繪事件不會新增請求，只有使用者按重試才重新載入。

10 份維護中文件已同步 site／journey 的直接文字邊界、13 個 mock JSON、numeric career ID 與新模組責任；API 範例、同語言欄位及相對連結一併核對。前一輪 site-only 的 23 案例結果由本輪 26 案例取代，沒有把局部驗證當成完整回歸。

## 統一執行入口

```shell
node scripts/build.mjs
node scripts/test.mjs
```

Playwright 與瀏覽器環境設定見 [README](../README.md)。每次執行結果寫入忽略版本控制的 `artifacts/test-results.json`；提交的文件記錄驗證範圍，避免將舊報告誤認為每次建置結果。

目前完整瀏覽器測試包含 15 專案 × 3 語言、10 尺寸 × 3 語言、桌面／手機首次浮框、地圖、導覽及實際操作。每項功能至少有一個回歸入口；一個測試可覆蓋數個關聯功能。

| 功能 ID    | 功能                 | 測試入口                                                                                      | 驗證情境                                                                                   |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| NAV-01     | 設定驅動的主選單     | `tests/navigation-browser.cjs`、`tests/interactions-browser.cjs`                              | 全部選單、圖示；只改設定 slug 即同步網址                                                   |
| NAV-02     | 區塊跳轉             | `tests/navigation-browser.cjs`                                                                | 選單點擊、Logo 共用目標與區塊跳轉                                                          |
| NAV-03     | 捲動位置同步         | `tests/navigation-browser.cjs`                                                                | 手動 scroll、頁底 Skills 與 1080×1920 長畫面                                               |
| NAV-04     | 深層連結與歷史還原   | `tests/navigation-browser.cjs`                                                                | 舊別名、query、重整、上一頁／下一頁                                                        |
| NAV-05     | 手機導覽抽屜         | `tests/navigation-browser.cjs`、`tests/interactions-browser.cjs`                              | 手機選單、選項、Escape、遮罩關閉                                                           |
| NAV-06     | 旅程首尾摘要         | `tests/interactions-browser.cjs`、`tests/browser.cjs`                                         | 首尾城市一致；重排、單筆／空資料刷新                                                       |
| NAV-07     | 桌面圖示列           | `tests/sidebar-rail-browser.cjs`                                                              | 雙向動畫、正文及背景對齊、三語 hover／focus、路由、聊天框、四尺寸及手機隔離                |
| HOME-01    | 個人介紹             | `tests/interactions-browser.cjs`、`tests/browser.cjs`                                         | 介紹、教育摘要與三語內容載入                                                               |
| HOME-02    | 工作總年資計算       | `tests/data.test.cjs`、`tests/interactions-browser.cjs`                                       | 工作月聯集政策與目前 6 年 2 個月顯示                                                       |
| HOME-03    | 社群及聯絡入口       | `tests/interactions-browser.cjs`                                                              | 聯絡 href 對應 site.social；不向外發訊息                                                   |
| HOME-04    | 頁尾識別資訊         | `tests/interactions-browser.cjs`                                                              | 頁尾引用最後城市與識別資訊                                                                 |
| CHAT-01    | 進站自動顯示         | `tests/chat-entry-browser.cjs`                                                                | 320／390／550／760／761／1080／1440 初次自動顯示                                           |
| CHAT-02    | 手動開啟與關閉       | `tests/chat-idle-browser.cjs`、`tests/interactions-browser.cjs`                               | 觸發圖示、x-lg、Escape、手機點外部                                                         |
| CHAT-03    | 閒置淡出             | `tests/chat-idle-browser.cjs`、`tests/chat-entry-browser.cjs`                                 | 初次／重開均 3 秒閒置與 400ms 淡出                                                         |
| CHAT-04    | 互動暫停倒數         | `tests/chat-idle-browser.cjs`、`tests/chat-entry-browser.cjs`                                 | hover／焦點暫停、移出完整倒數、淡出中滑入恢復                                              |
| CHAT-05    | 自適應定位           | `tests/chat-entry-browser.cjs`、`tests/interactions-browser.cjs`                              | 不同尺寸不越界；透明表面與圖示 hover                                                       |
| CHAT-06    | 實習資訊內容         | `tests/interactions-browser.cjs`、`tests/browser.cjs`                                         | 本地圖片載入、文字與工時、三語刷新                                                         |
| JOURNEY-01 | 本地世界地圖         | `tests/journey-browser.cjs`、`tests/interactions-browser.cjs`                                 | 本地地圖、城市與國家輪廓                                                                   |
| JOURNEY-02 | 自動飛行播放         | `tests/journey-browser.cjs`                                                                   | 抵達前後進度、終點停留後重播                                                               |
| JOURNEY-03 | 播放控制             | `tests/journey-browser.cjs`                                                                   | 手動暫停、重播及空資料停用                                                                 |
| JOURNEY-04 | 手動選擇地點         | `tests/journey-browser.cjs`                                                                   | 點擊城市、選項、鍵盤 Enter                                                                 |
| JOURNEY-05 | 旅程狀態面板         | `tests/journey-browser.cjs`、`tests/interactions-browser.cjs`                                 | 啟用選項、狀態與資料總數一致                                                               |
| JOURNEY-06 | 城市資訊浮框         | `tests/journey-browser.cjs`                                                                   | 城市 click／鍵盤浮框、Escape、語言刷新                                                     |
| JOURNEY-07 | 城市高亮與呼吸效果   | `tests/journey-browser.cjs`、`tests/interactions-browser.cjs`                                 | 抵達高亮、選取與 CSS 呼吸狀態                                                              |
| JOURNEY-08 | 最後所在地國家高亮   | `tests/interactions-browser.cjs`                                                              | 最終國家唯一高亮，由最後位置推導；journey-browser 驗證換國家、四主題呼吸、空資料及減少動態 |
| JOURNEY-09 | 可滑動地點清單       | `tests/journey-browser.cjs`、`tests/browser.cjs`                                              | 1／24 筆資料、箭頭、End 鍵與選取自動帶入                                                   |
| JOURNEY-10 | 地圖尺寸調整         | `tests/browser.cjs`、`tests/journey-browser.cjs`                                              | 30 組 RWD、動態選取可見與浮框                                                              |
| EXP-01     | 共用職涯資料的時間軸 | `tests/browser.cjs`、`tests/data.test.cjs`                                                    | 6 筆卡片、重排／空資料及正規化關聯                                                         |
| EXP-02     | 工作／教育分類       | `tests/interactions-browser.cjs`                                                              | 2 個學校與 4 個工作圖示                                                                    |
| EXP-03     | 日期與附加經歷展示   | `tests/data.test.cjs`、`tests/browser.cjs`                                                    | 日期政策、三語資料與經歷呈現                                                               |
| EXP-04     | 時間軸互動高亮       | `tests/browser.cjs`、`tests/interactions-browser.cjs`                                         | 全部節點與線居中，hover 轉移及預設恢復                                                     |
| EXP-05     | 超過六筆展開         | `tests/api-browser.cjs`、`tests/interactions-browser.cjs`                                     | 六筆不顯示、七筆邊界、81 筆分頁、收合回六筆、快取重開、鍵盤、三語及 RWD                    |
| PROJECT-01 | 專案時間軸分組       | `tests/browser.cjs`                                                                           | 依後端順序將相鄰同月份專案分組，跨頁不重複卡片                                             |
| PROJECT-02 | 專案摘要卡片         | `tests/browser.cjs`、`tests/interactions-browser.cjs`                                         | 15 卡片內容及多尺寸自然高度                                                                |
| PROJECT-03 | 期間月數計算         | `tests/data.test.cjs`、`tests/browser.cjs`                                                    | 含起訖月的期間，三語詳細頁一致                                                             |
| PROJECT-04 | 專案展開／收合       | `tests/api-browser.cjs`、`tests/projects.test.cjs`                                            | 六筆分頁、剩餘計數、重試、快取及三語                                                       |
| PROJECT-05 | 詳細資料視窗         | `tests/browser.cjs`、`tests/interactions-browser.cjs`                                         | 15×3 詳細頁、關閉鈕、Escape／背景及焦點                                                    |
| PROJECT-06 | 專案高亮與節點呼吸   | `tests/interactions-browser.cjs`                                                              | 預設首張、hover 轉移與離開後恢復 pulse                                                     |
| SKILL-01   | 分類技能展示         | `tests/data.test.cjs`、`tests/interactions-browser.cjs`                                       | 技能關聯與 7 個分類                                                                        |
| SKILL-02   | 共用標籤產生         | `tests/data.test.cjs`、`tests/browser.cjs`                                                    | 共用技能與翻譯契約                                                                         |
| SKILL-03   | 寬度驅動的預覽       | `tests/browser.cjs`                                                                           | 30 組尺寸／語言的實際 75% 寬度預算                                                         |
| SKILL-04   | 展開／收合與重排     | `tests/browser.cjs`、`tests/interactions-browser.cjs`                                         | 實際 +N、展開／收合、resize／語言保留                                                      |
| LANG-01    | 三語切換選單         | `tests/browser.cjs`、`tests/interactions-browser.cjs`                                         | 三語選單、鍵盤 End／Enter／Escape                                                          |
| LANG-02    | 語言偏好記憶         | `tests/interactions-browser.cjs`                                                              | reload 記憶、localStorage 禁用仍可切換                                                     |
| LANG-03    | 文案與格式本地化     | `tests/data.test.cjs`、`tests/browser.cjs`、`tests/interactions-browser.cjs`                  | 全部翻譯鍵／插值、title／meta 與內容                                                       |
| LANG-04    | 切換時保留互動狀態   | `tests/browser.cjs`、`tests/journey-browser.cjs`                                              | 地圖／詳細頁／技能／城市浮框的選取狀態保存                                                 |
| SHARED-01  | RWD 與自適應內容     | `tests/browser.cjs`、`tests/chat-entry-browser.cjs`、`tests/navigation-browser.cjs`           | 手機、長畫面、超寬與不水平溢出                                                             |
| SHARED-02  | 本地與離線開啟       | `tests/browser.cjs`、`tests/build.test.cjs`、`tests/interactions-browser.cjs`                 | file://、offline=true、無 HTTP 資源請求、fonts／mascot 載入                                |
| SHARED-03  | 鍵盤與語意支援       | `tests/navigation-browser.cjs`、`tests/journey-browser.cjs`、`tests/interactions-browser.cjs` | 焦點、Escape、原生 dialog 與各鍵盤選單                                                     |
| SHARED-04  | 減少動態效果偏好     | `tests/browser.cjs`、`tests/chat-idle-browser.cjs`、`tests/interactions-browser.cjs`          | reduced-motion 的停止／無動畫／直接關閉                                                    |
| SHARED-05  | 統一圖示與視覺資產   | `tests/build.test.cjs`、`tests/interactions-browser.cjs`                                      | 本地圖示、主題 token、資產與 manifest 校驗                                                 |
| SHARED-06  | 滑鼠柔光             | `tests/interactions-browser.cjs`                                                              | 座標更新、失焦隱藏、點擊穿透、觸控與 reduced motion 停用、離線                             |
| SHARED-07  | 背景訊號場           | `tests/appearance-browser.cjs`                                                                | 本地 SVG、可視區域重算、暫停、動態偏好與零外部請求                                         |
| SHARED-08  | 首次進場             | `tests/appearance-browser.cjs`                                                                | 進場完成後內容可见；reduced motion 停用                                                    |
| SHARED-09  | 配色與設定           | `tests/appearance-browser.cjs`                                                                | 三語、四主題、六尺寸、Cookie 還原、file:// 備份、數值驗證、重置與鍵盤操作                  |

## 樣式與封裝驗證

- 重構前後比對 320、390、760、761、1080、1440、2560px × 三語的 DOM 計算樣式與尺寸，修正拆分 cascade 所造成的手機首頁底部間距差異。
- 所有 Experience 節點與時間軸中心誤差低於 0.03px；技能預覽含按鈕不超出設定寬度預算。
- default／hover／leave 的時間軸高亮及動畫以計算樣式驗證，縮減動畫偏好另有測試。
- 建置為 54 個可重現檔案；manifest 白名單只包含目前使用的輸出，字型、圖示授權與來源保留在封裝。
- 線上發布與 ZIP 使用同一份已驗證 dist，不另外維護一份離線程式。

## 範圍限制

自動化使用 Windows 的 Edge 153.0.4234.48（Chromium），手機情境為 viewport／touch 模擬；不是實體 iOS／Android、Safari 或 Firefox 的全面認證。外部社群連結只核對目標，沒有登入社群或寄送郵件。瀏覽器原生操作與相容性仍需在新增目標平台時補測。

## Mock API 與大量資料驗證

新增 tests/api.test.cjs 的 16 個契約案例與 tests/api-browser.cjs，使統一入口為 9 組、26 個純資料／建置／API 契約案例。原有 51 項展示與互動仍跑完整回歸。

| 驗證           | 情境                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 初始 API 邊界  | 5 個初始資源；site／journey 是獨立完整內容，列表分頁；Projects 首頁含完整 detail／skills；不讀第二頁                                   |
| 游標契約       | 錯誤資源／owner、過期 revision、非法 cursor、limit 上限；空／終止頁                                                                    |
| 快取與併發     | 等價 query 合併，快取複本隔離，terminal 不再請求，跨 revision 拒絕                                                                     |
| 原子合併與重試 | 503 及錯誤外鍵保留既有資料與 cursor，下一次重試可成功，不重用已拒絕快取                                                                |
| 專案分頁       | 126 筆測試 fixture，初始 6 張、第二頁 12 張；失敗保留頁碼，快取重開不重取                                                              |
| 經歷與技能     | 81 筆經歷每頁六筆；120 筆專案技能一次完整提供，展開不發請求                                                                            |
| 詳細視窗       | 完整 detail 隨頁取得，開啟和重開不發請求，切換語言保留已載入資料                                                                       |
| 離線與 RWD     | file://、offline context、零 HTTP 請求、無水平溢出或 console/page error                                                                |
| Site／前端分工 | social 直接綁定入口；site 精確四個群組，三份完整語言 JSON，不含語言清單、導覽、動畫參數或地圖                                          |
| 語言請求／快取 | 自動 locale、單語 include、非法語言 400、只重取已讀頁、切回快取、首次還原語言、失敗重試及快速連續切換；chatme 桌面／手機三語與內容換行 |

完整內容三語回歸 tests/browser.cjs 會匯入完整 fixture 以檢查全部 15 筆 detail；真正分頁／延遲／失敗生命週期則由 api-browser.cjs 驗證，兩者不互相替代。

## 技能加號圖示調整驗證

共用 skills 元件改用本地 Bootstrap plus SVG 後，執行 interactions-browser 與 api-browser，包含所有技能列展開／收合、隱藏數量與大量資料分頁；另以 390／1440px 離線檢查 plus 圖示、展開狀態及頁面無水平溢出，均通過。此為圖示調整的針對性驗證，前述完整回歸紀錄保留原範圍。

## 滑鼠柔光驗收

新增 SHARED-06 後完整執行 scripts/test.mjs：9/9 組通過，26 個資料／建置／API 契約案例通過。interactions-browser 新增座標更新、失焦隱藏、不攔截互動、觸控停用及 reduced motion 檢查；離線 HTTP／HTTPS 請求為 0。另已檢視桌面實際柔光亮度與文字可讀性。

技能圖示後續調整：展開統一改為 Bootstrap plus-lg，收合維持 dash-lg；重新執行 interactions-browser，技能展開／收合、數量與其他共用互動均通過。

歷史專案圖示呼吸效果：確認 icon-breathe 在週期起點及中點產生不同柔光強度；reduced motion 時停用動畫、保留靜態柔光。interactions-browser 回歸通過，涵蓋歷史展開收合與聊天圖示等共用互動。

呼吸效果加強：驗證 2.4 秒週期的低點 opacity=0.55、高點 opacity=1／scale=1.18，並確認 reduced motion 與實際展開載入正常。視覺檢查確認加號／圓圈亮度及光暈差異更明顯。

## Experience 共用集合展開驗收

新增 EXP-05 並抽出 collectionDisclosure 後，完整 scripts/test.mjs 為 9/9 組通過、26 個契約案例通過。驗證六筆時無展開入口、七筆時剩餘數為一、81 筆每頁六筆、收合只保留前六筆 DOM、快取重開不重複請求、鍵盤焦點、語言切換保留展開及既有 Projects 錯誤重試。另以 390／1440px 七筆資料檢查入口與卡片對齊及無水平溢出，均通過。正式 mock 維持原六筆真實經歷，不為示範新增虛構履歷。

## 背景、進場與主題驗收

2026-09-21：新增 SHARED-07～09 後，完整 `node scripts/test.mjs` **10/10 組通過，26 個資料／建置／API 契約案例通過**。新增套件驗證英文、簡體、繁體的薄荷／冰藍／琥珀標籤與選取狀態，320／390／760／1024／1440／2560px 面板邊界、速度／強度／暫停／重置、Escape 聚焦還原、外部關閉、Cookie 優先還原、file:// 本機備份、損毀設定與數值限制、減少動態效果及零外部資源請求。桌面三主題與手機設定面板已實際檢視。

完整回歸中的第一次 appearance 測試遇到 media-query 事件尚未送達就斷言的時序問題，已改為等待瀏覽器送達狀態，再重新執行完整十組測試通過。此修正只涉及測試等待方式；既有功能與 API 契約測試亦全部通過。瀏覽器驗證使用本機 Edge／Playwright，不宣稱所有瀏覽器均已人工驗收。

## 進場順序與 chatbox 倒數修正

2026-09-21：整塊側欄與手機導覽在背景四邊定位後淡入；chatme 等待 backgroundField.whenReady 再淡入，首次淡入完成才開始 3 秒閒置倒數。chat-entry 新增七種尺寸的進場期間隱藏、導覽透明度、進場後淡入、淡入期间 hover 保留以及完整倒數驗證。chat-idle 保留重新開啟、焦點、淡出救回、手機與減少動態效果情境。完整 scripts/test.mjs **10/10 組通過，26 個契約案例通過**，並檢視桌面進場及完成後畫面。

## 霧白亮色主題驗收

新增霧白／雾白／Mist 後完整 scripts/test.mjs **10/10 組通過，26 個契約案例通過**。Appearance 擴充為三語、四主題，驗證新主題的 file:// 儲存還原、兩欄選項與六尺寸邊界；另外檢查 light color-scheme，以及正文、次要文字、重點文字、技能標籤、地圖標籤和重點底色文字共六組代表性配色對比皆達 4.5:1。這是代表性配色驗證，不宣稱全站無障礙認證。桌面與手機霧白畫面已實際檢視。

## 小螢幕抽屜滑動驗收

選單使用共用 0.32 秒 transition 從左侧滑入／收回，遮罩同步淡入／淡出。navigation-browser 檢查開關兩個方向的實際 transition 中間位置、遮罩透明度、關閉時 inert、切換桌面後恢復互動及 reduced motion 即時切換；既有選項跳轉、Escape、外部點擊與進場順序皆保留。完整 scripts/test.mjs **10/10 組通過，26 個契約案例通過**。

## 桌面圖示列驗收

新增 NAV-07 後完整 scripts/test.mjs **11/11 組通過，26 個契約案例通過**。新增 sidebar-rail-browser 驗證收合／展開動畫中間位置、側欄與正文／背景對齊、三語 hover／focus 標題及 accessible name、Escape 隱藏、路由跳轉、聊天框隨寬度定位、761／1080／1440／2560px 四種桌面尺寸、手機完整抽屜及切回桌面狀態。已檢視薄荷與霧白圖示列及 tooltip，離線外部請求為零。

## Chatme 求職文案驗收

2026-09-21：三語 chatme.content 補上 UCL 碩士生身分、有薪實習與生活費目的，API 範例同步更新。本次執行 unit 2/2 組、26 個契約案例，以及 chat-entry 七尺寸進場／3 秒淡出測試均通過；另確認英／繁／簡三語在 320／390／1440px 的內容與 mock 相符、聊天框無邊界溢出。本次為文字修改，未重新執行完整十一組測試。

## Medium 社群入口驗收

新增 social.medium、本地 Bootstrap medium SVG 及三語標籤；空字串隱藏入口，普通 URL 直接綁定 href，不新增 mapping table。unit 2/2 組、29 個案例通過；composition-rwd、interactions、api-lazy-loading 三組瀏覽器回歸通過，含空值隱藏。另核對三語、320／390／1440px 的 URL、新分頁屬性、bi-medium 圖示、標籤與離線零外部資源請求，並檢視 320px 手機畫面。本次未重跑完整十一組。

## Experience 第 3 支 API 契約驗收（2026-09-21）

完整回歸 **11/11 組通過、32 個契約案例通過**。Experience 改為 page／size=6，直接回傳 total／pages／page／size／items；三語內容、後端順序、同名欄位、完整 skills 及可空 detail 均有驗證。

新增 tests/experiences.test.cjs：14 筆資料依 6／6／2 載入、空集合／超出末頁、非法 page／size、拒絕舊 cursor／limit、失敗同頁重試、併發去重、語言切換只重取已載入頁、無技能 API 請求與資料驗證原子性。maintenance 額外核對 API 範例與英文 mock、三語 ID／順序／非語言欄位。

瀏覽器測試包含 81 筆經歷、超過六筆入口、收合快取重開、語言與展開狀態保留、直接 content 的 HTML 轉義、21 組三語尺寸排版；其餘 Journey、導覽、側欄、聊天框、外觀、專案及技能分類回歸全部通過。測試在本地離線版本完成，並非正式後端／資料庫測試。

2026-09-23 專案詳情箭頭：與顯示更多加號共用 icon-breathe 及主題參數。`tests/interactions-browser.cjs` 在薄荷、冰藍、琥珀、Mist 四種主題取樣動畫低點與高點，確認 2.4 秒週期、透明度 0.55→1、縮放 1→1.18 與柔光變化一致；減少動態效果時兩者停用動畫並保留靜態柔光，同時回歸詳情開關及焦點還原。

2026-09-23 最後所在地心跳高亮：`tests/journey-browser.cjs` 通過美國→中國→原始末站國家的資料替換、手動選取其他城市後仍保留末站高亮、四主題填色與柔光取樣、無幾何縮放、空陣列清除及減少動態保留靜態高亮；既有三語、多尺寸、1／24 站與旅程播放測試通過。維護檢查四項通過。

2026-09-23 Chatme 邊框一致性：移除透明外殼覆寫與未使用的 chat-outline token，改由共用 pixel-shell 繪製完整階梯邊框。chat-entry 七尺寸進場／三秒閒置／hover 測試及四項維護檢查通過；另以離線瀏覽器檢查四主題、桌面／手機外殼填色與裁切均和地圖資訊框一致，並檢視 Mist 桌面及手機截圖確認四角完整。

2026-09-23 國家高亮調整為持續呼吸：取代先前雙拍，固定四秒由暗漸亮再回暗，與聊天圖示節奏一致，無隨機間隔。journey-browser 驗證更新後的動畫及四主題峰值，並保留末筆國家替換、空資料與減少動態回歸。
