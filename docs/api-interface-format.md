# Portfolio API interface format — v1

更新日期：2026-09-21。本文件記錄已實作的 in-memory mock transport；尚未接 AJAX、HTTP server、資料庫或寫入 API。HTTP base path 預定 /api/v1，client 使用不含 base 的路徑。

機器可讀規格：[OpenAPI 3.1](../spec/openapi.json)；匯入方式與確認範圍：[spec 說明](../spec/README.md)；後端路由驗證、分頁排序、語系與 transport 切換：[後端交接](backend-handoff.md)。OpenAPI 的成功範例與 mock 回應由自動測試核對，跨欄位日期和分頁算術仍須由後端驗證。

## 1. API 邊界與數量

目前共 **6 支 GET API**。第 1～4 支已逐支確認；第 5、6 支仍記錄現有實作，留待後續討論。專案詳情隨列表完整返回，不再提供獨立詳情 API。

| #   | HTTP path                    | 責任                                  | 分頁         |
| --- | ---------------------------- | ------------------------------------- | ------------ |
| 1   | GET /api/v1/site             | 品牌、個人介紹、社群、chatme          | 無           |
| 2   | GET /api/v1/journey          | 完整輕量旅程、地圖、年資與首尾城市    | 無           |
| 3   | GET /api/v1/experiences      | 經歷與完整技能                        | page／size=6 |
| 4   | GET /api/v1/projects         | 單一專案列表，含完整 detail 與 skills | page／size=6 |
| 5   | GET /api/v1/skill-categories | 技能分類與各類六筆技能預覽            | cursor       |
| 6   | GET /api/v1/skills           | 分類的後續技能頁；ownerType=category  | cursor       |

Journey 保持完整輕量索引，讓地圖和總年資不依賴 Experience 已讀頁數。大量旅程的範圍查詢或虛擬化仍需另行設計。

## 2. 共通契約

- 所有請求明確帶 locale=en|zh-Hans|zh-Hant；省略預設 en，不支援值回 400 INVALID_LOCALE。三語 ID、排序與總數一致。
- 成功 HTTP 回應預定 200、application/json; charset=utf-8。以下 TypeScript 的 ? 代表可省略，其餘欄位必填。
- JSON key 使用 camelCase，直接文字不做欄位別名或資料 mapping table。Journey／Experience／Projects ID 為正整數 JSON number，最大 9007199254740991；資料庫 int8 可保留，但傳給 JS 的數值不得超過此範圍。技能分類現有 ID 為字串，留待下一輪討論。
- 月份 YYYY-MM，結束月不可早於開始月。普通輸入與換行由 JSON serializer 編碼；前端 escaping，不執行 HTML／Markdown。
- Experience 與 Projects 直接使用 NumberedPage，不含 data／included／meta。其餘四支保留 Response envelope 與 revision。

```ts
type ID = string;
type Month = string;
type TextKey = string;
type Locale = "en" | "zh-Hans" | "zh-Hant";
interface NumberedPage<T> {
  total: number; // Total matching records.
  pages: number; // ceil(total / size); zero for an empty collection.
  page: number; // Requested positive page number, starting at one.
  size: 6; // Capacity remains six on the final partial page.
  items: T[];
}
interface Page {
  limit: number; // Integer from 1 to 50.
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}
interface Skill {
  id: ID;
  labelKey: TextKey;
}
interface SkillPreview {
  skillIds: ID[];
  skillsPage: Page;
}
interface Response<T> {
  data: T;
  included: {
    organizations: []; // Reserved empty compatibility fields; no lookup tables.
    countries: [];
    locations: [];
    skills: Skill[];
    translations: Partial<Record<Locale, Record<TextKey, string>>>;
  };
  page: Page | null;
  meta: { apiVersion: 1; revision: string; locale: Locale };
}
```

Site／Journey 的 included 都為空，translations 為 {請求語言:{}}。技能分類與技能只附當次需要的 labels，固定 UI 翻譯在 src/locales。舊 envelope 的 organizations／countries／locations 保留空陣列相容欄位，沒有對應 entity JSON 或資料庫 mapping 需求。

## 3. 各 API 的輸入與資料

### GET /site

逐欄用途與英文註解見 [Site mock 說明](../mock/site/README.md)；前端綁定與刷新順序見 [Site 開發對照](site-development.md)。目前 store 驗證必要欄位、型別與連結／資產路徑格式，不拒絕額外 key，也不會自動替額外 key 建立 UI。

共用 query：`locale?`，預設 en。回傳 `Response<SiteData>`，page=null；data 精確使用 brand、profile、social、chatme 四個群組。文字已是請求語言的實際內容，不回傳字典鍵。

下列型別完整列出 SiteData 的 4 組、19 個必要欄位；名稱與 JSON／前端一致。

```ts
interface SiteData {
  brand: {
    title: string; // Brand mark, without the decorative dot.
    titleSub: string; // Brand subtitle, independent of nickName.
    copyrightYear: number; // Integer; not derived from the device clock.
  };
  profile: {
    firstName: string; // Given name.
    familyName: string; // Family name.
    nickName: string; // Nickname for the accessible home label.
    content: string; // Profile copy and meta description.
    eduCode: string; // Education display abbreviation, not an ID.
    program: string; // Localized education program.
    introContent: string; // Introductory line above the name.
    footerContent: string; // Footer tagline.
  };
  social: {
    linkedin: string; // HTTP(S) URL; empty hides the link.
    github: string; // HTTP(S) URL; empty hides the link.
    medium: string; // HTTP(S) URL; empty hides the link.
    email: string; // Plain address; the renderer adds mailto.
  };
  chatme: {
    title: string; // Plain chat title.
    titleSub: string; // Plain chat subtitle.
    content: string; // Plain copy with newline-separated paragraphs.
    icon: string; // Bundled assets/... path; no parent traversal.
  };
}
```

以下是英文 data，與 mock/site/en.json 完全相同：

```json
{
  "brand": {
    "title": "ZL",
    "titleSub": "WILSON",
    "copyrightYear": 2026
  },
  "profile": {
    "firstName": "Zheng",
    "familyName": "Lee",
    "nickName": "Wilson",
    "content": "Senior software engineer with over five years of experience designing and building Python backends and manufacturing data platforms at Delta Electronics and Foxconn. Worked on systems used in daily production across 48+ plants and 100+ production lines, including analytics supporting Apple product manufacturing. Main areas of work include shared backend services, database performance optimisation, data pipeline development, asynchronous processing and machine-learning deployment.",
    "eduCode": "UCL",
    "program": "MSc Software Systems Engineering",
    "introContent": "SOFTWARE · PLATFORMS · APPLIED AI",
    "footerContent": "Changing the world through code, making everyday life better and easier."
  },
  "social": {
    "linkedin": "https://www.linkedin.com/in/zhenglee315",
    "github": "https://github.com/zhenglee315",
    "medium": "https://medium.com/@WilsonLeee",
    "email": "zhenglee315@gmail.com"
  },
  "chatme": {
    "title": "London · 20 hours/week",
    "titleSub": "OPEN TO INTERNSHIPS",
    "content": "I’m an MSc Software Systems Engineering student at UCL, seeking a paid software engineering internship to contribute my skills and help cover my living costs.\nI specialise in backend systems and AI agent application development.",
    "icon": "assets/icons/cow-engineer.svg"
  }
}
```

| 欄位                                 | 型別與用途                                                |
| ------------------------------------ | --------------------------------------------------------- |
| brand.title / titleSub               | string；品牌主標／副標，不從個人暱稱強制衍生              |
| brand.copyrightYear                  | integer；明確維護的版權年份                               |
| profile.firstName / familyName       | string；名字／姓氏，所有個人姓名的唯一來源                |
| profile.nickName                     | string；個人暱稱，用於首頁連結的 accessible label         |
| profile.content                      | string；介紹段落，亦作為 meta description                 |
| profile.eduCode / program            | string；展示用學校簡稱／學位課程，不是 Journey 查詢 ID    |
| profile.introContent / footerContent | string；姓名上方短句／頁尾短句                            |
| social.linkedin / github / medium    | string；普通 http(s) URL，不含 Markdown；空字串隱藏入口   |
| social.email                         | string；普通 Email，不含 mailto:；空字串隱藏入口          |
| chatme.title / titleSub              | string；對話框主標／副標，粗體由樣式處理                  |
| chatme.content                       | string；純文字，JSON 的 \n 顯示為段落                     |
| chatme.icon                          | string；網站資產相對路徑 assets/...，不能包含上層目錄跳轉 |

以上欄位皆必要。前端驗證字串型別、年份、連結格式及本地圖片路徑後才採用資料；切換語言若驗證失敗，保留原內容並允許重試。回應的 included 四個關聯陣列為空、translations 為 {請求語言:{}}，維持共同 envelope，不額外附上已在 data 的文字。

### Site mock 與前端命名規則

- mock/site/en.json、mock/site/zh-Hans.json、mock/site/zh-Hant.json 各保存完整同結構物件，沒有覆寫表或隱藏欄位轉接。
- Mock transport 按 locale 選一份物件。已支援語言的整份 mock 缺失時回退英文；未知語言仍回 400。正式後端可從正規化資料表組裝相同形狀。
- Store 以 locale 快取且凍結 site；前端直接讀 data.site.brand、data.site.profile、data.site.social、data.site.chatme，沒有 identity、contacts 或教育 ID 的相容轉換。
- data-site="profile.content"、data-site="chatme.titleSub" 等 DOM 綁定保留相同 key 路徑；data-site-src="chatme.icon" 綁圖片，data-site-paragraphs="chatme.content" 安全呈現換行。data-social="email" 對應 site.social.email。
- chatme.js、chatme.css、chatme DOM class 與 runtime.chatme 統一命名。PORTFOLIO_RUNTIME 只存前端時間／布局設定，不存 API 內容。
- 完整姓名集中於 siteContent.fullName：兩段均為漢字時姓在前、無空格；其他情況保留 firstName + 空格 + familyName。目前三份 fixture 保留本人提供的 Zheng／Lee，沒有自行猜測中文姓名。
- 網頁標題由完整姓名與 brand.titleSub 組成；meta description 使用 profile.content。教育摘要使用 profile.eduCode／program，即使 Journey 是空集合也可以顯示。
- 固定側欄短句、按鈕、標籤在 src/locales；語言清單、導覽、runtime 在 src/config；世界 SVG 是靜態資產。它們均不由 /site 回傳。
- localStorage 保存語言偏好；語言 cookie 和 HTTP adapter 尚未實作；外觀 cookie 由前端獨立管理。切換時重取已讀資源的目標語言，保留分頁和互動狀態。

### GET /journey

Query：locale?，預設 en。回傳 Response<JourneyItem[]>，page=null；included 四個關聯陣列為空，translations 為 {請求語言:{}}。不查 entities 或業務翻譯表；欄位直接是請求語言的文字。

陣列順序就是呈現與播放順序，通常最舊在前、最新在後。前端不按 startMonth 或 id 重排；同月份優先順序由後端決定。不需要 order。

```ts
interface JourneyItem {
  id: number; // Positive safe integer shared with Experience.
  countryCode: string; // Uppercase ISO alpha-3; directly matches SVG data-country.
  countryName: string;
  city: string;
  latitude: number; // -90..90.
  longitude: number; // -180..180.
  type: "work" | "education";
  startMonth: Month;
  endMonth: Month | null; // null means ongoing.
  endDay?: number; // Valid calendar day; requires endMonth.
  expected: boolean;
  organizationName: string;
  organizationCode: string; // Display abbreviation, not a foreign key.
  organizationTitle: string; // Job title or academic program.
  detail?: {
    startMonth: Month;
    endMonth: Month | null;
    endDay?: number; // Optional real day within the detail endMonth.
    content: string;
  } | null;
}
```

英文 data 範例（完整 fixture 的最後一筆）：

```json
[
  {
    "id": 6,
    "countryCode": "GBR",
    "countryName": "United Kingdom",
    "city": "London",
    "latitude": 51.5246,
    "longitude": -0.134,
    "type": "education",
    "startMonth": "2026-09",
    "endMonth": "2027-08",
    "expected": true,
    "organizationName": "University College London",
    "organizationCode": "UCL",
    "organizationTitle": "MSc Software Systems Engineering",
    "detail": null
  }
]
```

工作年資使用此完整清單的 type 與月份聯集：含起訖月、重疊只算一次、排除 education 與空檔；null 結束月使用當月，明訂結束月則依該月計算。expected 控制預計標示，不自行由未來日期推測。

point、labelOffset、routeBend、interactiveLabel 已移出 API，沒有逐城市設定表；前端依經緯度、距離、字體、尺寸與碰撞量測計算。countryCode 直接對應 SVG；countryName 不另查國家表。詳細分工見 [Journey 開發對照](journey-development.md)，逐欄註解見 [mock 說明](../mock/journey/README.md)。

### GET /experiences

Query：`locale?=en|zh-Hans|zh-Hant`、`page?=1`、`size?=6`。page 是正整數；size 固定 6，不支援 all、limit 或 cursor。後端提供穩定排序，同月份需有唯一 ID 作排序依據；前端照 items 陣列順序追加，不使用 order 重新排序。

直接回傳 `{ total, pages, page, size, items }`，**不加 data／included／meta envelope**。

| 欄位  | 規則                                      |
| ----- | ----------------------------------------- |
| total | 符合查詢的總筆數，非本頁筆數              |
| pages | Math.ceil(total / size)；零筆時為 0       |
| page  | 請求頁碼，由 1 開始；超出最後頁回空 items |
| size  | 每頁容量 6，末頁不足六筆仍為 6            |
| items | 本頁 Experience 物件陣列                  |

`items` 內每筆格式（英文 canonical mock 第一筆）：

```json
{
  "id": 6,
  "order": 5,
  "type": "education",
  "countryCode": "GBR",
  "countryName": "United Kingdom",
  "city": "London",
  "organizationCode": "UCL",
  "organizationName": "University College London",
  "organizationTitle": "MSc Software Systems Engineering",
  "startMonth": "2026-09",
  "endMonth": "2027-08",
  "expected": true,
  "content": "A new chapter focused on software systems engineering, distributed systems and architecture. Bringing production engineering experience into advanced study at UCL.",
  "skills": [
    "Software architecture",
    "Distributed systems",
    "Requirements engineering",
    "Validation & verification",
    "Engineering for data analysis",
    "Applied deep learning"
  ],
  "detail": null
}
```

必填：id（正整數，與 Journey 同筆記錄一致）、order（有限數字）、type（work／education）、countryCode（ISO alpha-3）、countryName、city、organizationCode、organizationName、organizationTitle、startMonth、endMonth、content、skills。名稱、介紹及技能直接是請求語言的純文字。

endMonth 可 null，表示至今。endDay 選填，必須是 endMonth 的實際日期；expected 選填 boolean，省略視為非預計。detail 可省略或 null；有值時為 `{ startMonth, endMonth, content }`，endMonth 可 null，也可附上選填 endDay，套用相同實際日期驗證。skills 是完整 string[]，無技能傳 []，不帶 skillIds／skillsPage，也不呼叫技能 API。前端只依 3/4 寬度展開收合已載入文字。

初始 page=1&size=6，成功才前進頁碼。每次載入更多取下一頁；失敗保留舊內容與頁碼，重試同頁。收合後重開使用快取。page >= pages 時停止。語言切換只重取已載入頁碼，保留 ID、順序及展開狀態；後端各語言的總數、ID 與排序必須相同。

本契約沒有 revision token；前端可拒絕重複 ID、total 變更與語言排序不一致，但無法保證跨請求的資料庫快照隔離。後端需保持穩定排序；若資料在瀏覽期間變動，重新載入列表。詳見 [Experience 開發文件](experiences-development.md) 及 [mock 欄位註解](../mock/experiences/README.md)。

### GET /projects

Query：locale?、page?=1、size?=6。page 正整數，size 固定 6，不接受 all、cursor、limit 或 scope。後端排序後返回，前端依 items 順序追加；同月排序也由後端決定。單一集合不再區分近期／歷史。

回傳 NumberedPage<Project>。total=15 時三頁 items 長度為 6、6、3；零筆為 {total:0,pages:0,page:1,size:6,items:[]}。超出最後頁返回空 items，page 保留請求頁碼。

```ts
interface Project {
  id: number;
  organizationName: string;
  organizationCode: string;
  organizationTitle: string;
  startMonth: Month;
  endMonth: Month | null;
  expected?: boolean;
  projectName: string;
  projectTitle: string;
  intro: string;
  detail:
    | {
        workflowDescription: string | null;
        flow: string[] | null;
        technicalDescription: string | null;
        contribution: string | null;
        outcome: string | null;
      }
    | null
    | "";
  skills: string[] | null;
}
```

英文 canonical mock 第一筆；mock 存完整陣列，transport 切片放進 items：

```json
{
  "id": 4,
  "organizationName": "The Gospel as Revealed to Me",
  "organizationCode": "AI Publishing",
  "organizationTitle": "Senior Agent Platform Engineer",
  "startMonth": "2026-04",
  "endMonth": "2026-09",
  "projectName": "AI-assisted publishing",
  "projectTitle": "APPLIED AI WORKFLOWS",
  "intro": "An LLM-assisted translation and publishing workflow that keeps reviewer-approved translations in context and people in the review process.",
  "detail": {
    "workflowDescription": "Source chapters pass through extraction, translation, revision and publication export. Domain-specific prompts and reviewer-approved translations provide context for subsequent translation and revision. Human review remains part of the workflow through Slack, while storage retains the generated artefacts for later steps.",
    "flow": ["Source chapters", "Translation & review", "Publication export"],
    "technicalDescription": "Domain-specific prompts and approved translations provide context for subsequent work. Slack supports review, while object storage holds workflow artefacts.",
    "contribution": "Designed the RAG workflow and asynchronous architecture for extraction, translation, revision and export.",
    "outcome": "Reduced turnaround per volume from 18 to 3 months and required translation staffing from 7 to 2 people."
  },
  "expected": false,
  "skills": [
    "Python",
    "RAG",
    "FastAPI",
    "Celery",
    "Redis",
    "Ollama",
    "RustFS",
    "Prompt engineering",
    "Human-in-the-loop review",
    "Slack"
  ]
}
```

projectName 是專案名稱，projectTitle 是分類短標題，organizationTitle 是個人職稱／學位。intro 是簡短介紹；workflowDescription 說明完整流程；technicalDescription 說明架構與技術；contribution 是個人貢獻；outcome 是成果。組織名稱、簡稱與技能都是直接顯示文字，無需查表。

日期是專案期間，獨立於任職期間；endMonth=null 表示至今；expected=true 必須有 endMonth。未提供 expected 視為 false。

detail 隨列表完整回傳，null／空字串不顯示詳情入口，五欄全空的物件也不顯示。各段文字 null／空白不顯示段落與標題。flow=[]／null 隱藏流程；一節點沒有箭頭。skills=[]／null 不顯示技能；其餘完整 string[]，只在前端展開，不再呼叫技能 API。非空 flow／skills 元素須為非空字串。

所有文字純文字顯示並保留換行，不需要使用者輸入 HTML、Markdown 或跳脫符號。欄位英文註解見 [Projects mock](../mock/projects/README.md)，模組與命名見 [Projects 開發對照](projects-development.md)。

### GET /skill-categories（待下一輪確認）

Query：locale?、limit?=12（1..50）、cursor?。回傳 Response<SkillCategory[]>。分類順序由後端穩定提供。

```ts
interface SkillCategory extends SkillPreview {
  id: ID;
  labelKey: TextKey;
}
```

每類初始最多六個 skillIds，skillsPage 提供剩餘游標；included.skills 與 translations 提供相應標籤。分類本身有下一頁時顯示共用載入按鈕。

### GET /skills（待下一輪確認）

Query：locale?、ownerType=category、ownerId=分類ID（必要）、limit?=12（1..50）、cursor?。不接受 project owner。回傳 Response<Skill[]>；included.skills 為同批技能及其三語中所選語言的 label 翻譯。技能保持分類關聯順序，不重複；同技能可供不同分類使用。

## 4. Lazy loading、快取與錯誤

1. 初始 site → journey → 並行 experiences／projects／skill-categories 第一頁。Projects 初始六筆已包含全部 detail 與各自 skills。
2. Experience／Projects 每次展開最多追加一頁六筆，成功才 page+1；失敗重試同頁。Projects 剩餘未讀筆數為 total-loadedCount；收合入口數量為 total-6，包含已快取但被隱藏卡片。收合重開不重複請求。
3. 語言切換只重取已載入頁，確認 ID、順序及 total 一致後才切換；失敗保留原語言與資料。詳細視窗維持數字 selectedId，不觸發詳情请求。
4. 技能分類游標綁定資源／owner／revision，前端原樣傳回；不可混用，末頁 hasMore=false、nextCursor=null。同版本同順序下可跨語言使用。
5. Client 按 path+query（含 locale）去重／快取成功回應；資料驗證失敗逐出該回應，使修正後可重試。不同 revision 的 envelope 拒絕合併。
6. NumberedPage 無 revision，前端拒收 total 變更、重複 ID 和語言順序改變，但不能提供跨請求快照隔離。後端須固定排序；資料變動時重新載入。

錯誤 transport 以 Error 拋出 status、code、retryable 及 body，未來 HTTP adapter 應將下列 body 轉成相同錯誤物件：

```json
{
  "error": {
    "code": "INVALID_PAGE",
    "message": "page must be a positive integer.",
    "retryable": false
  },
  "meta": { "apiVersion": 1, "revision": "portfolio-2026-09-21-projects" }
}
```

| Status | Codes                                                                                                   | 行為                             |
| ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 400    | INVALID_LOCALE、INVALID_PAGE、INVALID_SIZE、INVALID_QUERY、INVALID_LIMIT、INVALID_CURSOR、INVALID_OWNER | 修正 query；前端固定控制合法參數 |
| 404    | NOT_FOUND                                                                                               | 路由或技能 owner 不存在          |
| 405    | METHOD_NOT_ALLOWED                                                                                      | 目前只有 GET                     |
| 409    | STALE_CURSOR、STALE_REVISION（client）                                                                  | 重新載入一致的資料               |
| 500    | INVALID_FIXTURE                                                                                         | 修正 mock 缺失翻譯               |
| 503    | TEMPORARILY_UNAVAILABLE                                                                                 | 保留資料，顯示重試               |

## 5. Mock 與正式後端交接

16 個 JSON 由 config/build.json 明確登記，mock/site、journey、experiences、projects 各三語；mock/skills.json 與 mock/locales 三份字典只供技能分類。前端設定與固定翻譯保留 src/config、src/locales。

建置把完整 fixtures 嵌入 app.js 以支援 file://，目前 lazy loading 延後的是資源讀取／資料合併／DOM，不是網路 bytes。後續替换 transport 並停止嵌入 mock，才會成為真正 HTTP 分頁下載。沒有新增資料庫表、CMS、認證、寫入 API、HTTP 快取或列表虛擬化。

維護時同步三語、mock.revision、文件、測試，執行 node scripts/build.mjs 與 node scripts/test.mjs。規格與資料範例由 maintenance tests 核對，完整結構說明見 [README](../README.md)。
