# Site mock 欄位註解

此目錄的 [en.json](en.json)、[zh-Hans.json](zh-Hans.json)、[zh-Hant.json](zh-Hant.json) 各是一份完整的 `SiteData`，對應 `/api/v1/site?locale=...` 成功回應的 `data`，不是包含 `meta`／`included` 的完整 envelope。

三份 JSON 使用相同 camelCase key。前端直接讀 `data.site`，沒有舊欄位轉換層。這是目前已落地的格式，不是提案；完整傳輸契約見 [API 規格](../../docs/api-interface-format.md)。

## 逐欄用途與英文註解

| 路徑                    | 型別    | 用途／維護規則                                   | English field comment                                               |
| ----------------------- | ------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `brand.title`           | string  | Logo 主文字，例如 ZL；句點是前端裝飾             | Brand mark text; decorative punctuation belongs to the renderer.    |
| `brand.titleSub`        | string  | Logo 副文字，例如 WILSON；不強制由 nickName 推導 | Independent brand subtitle, not an alias for the personal nickname. |
| `brand.copyrightYear`   | integer | 版權年份，前端不自行改為裝置當年                 | Explicit copyright year, independent of the device clock.           |
| `profile.firstName`     | string  | 名字；與 familyName 組成全站姓名                 | Given name used by the shared full-name formatter.                  |
| `profile.familyName`    | string  | 姓氏；不包含姓名末尾標點                         | Family name without presentation punctuation.                       |
| `profile.nickName`      | string  | 個人暱稱，供首頁連結無障礙標籤使用               | Personal nickname used in the accessible home-link label.           |
| `profile.content`       | string  | 個人介紹，同時用作 meta description              | Plain profile description, also used for page description metadata. |
| `profile.eduCode`       | string  | 展示用學校簡稱，不是外鍵或查詢 ID                | Display abbreviation for education, not a relationship ID.          |
| `profile.program`       | string  | 展示用課程／學位名稱                             | Localized degree or program text for the profile summary.           |
| `profile.introContent`  | string  | 姓名上方的專業領域短句                           | Introductory line above the profile heading.                        |
| `profile.footerContent` | string  | 頁尾個人短句                                     | Personal footer tagline displayed as plain text.                    |
| `social.linkedin`       | string  | 普通 http(s) URL；空字串隱藏入口                 | LinkedIn URL; an empty value hides the corresponding link.          |
| `social.github`         | string  | 普通 http(s) URL；不放 Markdown 包裝             | GitHub URL without Markdown link syntax.                            |
| `social.medium`         | string  | Medium 個人頁 http(s) URL；空字串隱藏入口        | Medium profile URL rendered with the bundled Bootstrap medium icon. |
| `social.email`          | string  | Email 本身；前端加 mailto:，空字串隱藏           | Email address without a mailto prefix or escaped at-sign.           |
| `chatme.title`          | string  | 對話框主標；粗體由 CSS 處理                      | Plain chat title; bold styling is owned by CSS.                     |
| `chatme.titleSub`       | string  | 對話框副標，取代舊的 title-sub 拼法              | Chat subtitle using the shared camelCase naming convention.         |
| `chatme.content`        | string  | JSON 使用 `\n` 換行，畫面呈現為段落              | Plain chat copy; newline characters become escaped paragraphs.      |
| `chatme.icon`           | string  | 本地 `assets/...` 路徑，不能含 `..` 路徑段       | Local bundled image path with no parent-directory traversal.        |

所有欄位都要存在。字串型別檢查不代表所有字串都必須非空；目前明確定義 social 空字串會隱藏入口，教育摘要會略過空字串片段。圖片則必須有有效本地路徑，檔案需隨 `src/assets/` 一起建置。

## 多語與 fallback

- 三份都是完整內容，不是英文加中文差異覆寫；欄位缺失不會自動逐欄補英文，store 委派 dataContracts.validateSite 拒絕無效 site。
- transport 對支援語言的整份缺失提供英文 fallback；但正常交付仍應保留三份已登記的檔案，建置時缺檔會失敗。未知 locale 回 400。
- 目前姓名在三語都使用本人提供的 Zheng／Lee。不要自行推測中文姓名；若之後提供漢字名／姓，再更新對應語言的值。
- 英文與其他非純漢字姓名使用名、空格、姓；純漢字名字／姓氏使用姓在前且不加空格。此規則集中於 `siteContent.fullName`。

## 例子與資料邊界

`"content": "First paragraph.\nSecond paragraph."` 會顯示兩段。不要寫 `"**Title**"`、HTML 標籤或 `[URL](URL)`；前端不解析這些內容為格式。

`brand.titleSub` 與 `profile.nickName` 是不同用途的欄位；`profile.eduCode/program` 是後端可從教育資料表組裝的展示內容，前端不再用 Journey 推導教育摘要。API 物件結構不要求資料庫使用相同表結構。

固定按鈕、側欄短句、語言清單、導航、3 秒計時、CSS 主題及地圖不放入 site。詳細 DOM／模組對照見 [Site 開發對照](../../docs/site-development.md)。

Journey 亦採直接語言文字，但有獨立的 [陣列契約](../journey/README.md)；site 的 profile 教育摘要不因此改從 Journey 推導。
