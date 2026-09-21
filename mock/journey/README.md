# Journey mock 欄位註解

[en.json](en.json)、[zh-Hans.json](zh-Hans.json)、[zh-Hant.json](zh-Hant.json) 各保存完整的 Journey 陣列，對應 GET /api/v1/journey 成功回應的 data。JSON 不加入註解欄位；本文件是伴隨說明。

## 契約與命名

| Key                 | 型別                  | English field comment                                                       |
| ------------------- | --------------------- | --------------------------------------------------------------------------- |
| `id`                | positive safe integer | Stable career ID shared with Experience; never an array position.           |
| `countryCode`       | string                | Uppercase ISO alpha-3 code used directly by the SVG data-country attribute. |
| `countryName`       | string                | Localized country display name; no dictionary lookup.                       |
| `city`              | string                | Localized city display name.                                                |
| `latitude`          | number                | Geographic latitude in degrees, from -90 to 90.                             |
| `longitude`         | number                | Geographic longitude in degrees, from -180 to 180.                          |
| `type`              | work or education     | Select the shared category icon and work-duration policy.                   |
| `startMonth`        | YYYY-MM               | Inclusive start month.                                                      |
| `endMonth`          | YYYY-MM or null       | Inclusive end month; null means ongoing.                                    |
| `endDay`            | integer, optional     | Real day of endMonth; invalid without an endMonth.                          |
| `expected`          | boolean               | Display the localized expected-completion suffix.                           |
| `organizationName`  | string                | Full localized organization name, rendered without an alias.                |
| `organizationCode`  | string                | Display abbreviation, not a foreign key.                                    |
| `organizationTitle` | string                | Localized job title or academic program.                                    |
| `detail`            | object or null        | Optional supplementary period and plain text; null hides the block.         |

除了 endDay 可省略，以上欄位需存在；detail 也接受省略，建議明確使用 null。detail 非空時包含 startMonth、endMonth、content；可另外提供選填 endDay，月份與日期驗證規則和主記錄相同，content 為當前語言純文字。助教 detail 屬於輔仁大學，UCL 的 detail 為 null。

## 順序與地圖

後端依自己決定的順序回傳陣列，通常由舊到新；同月份的優先順序也由後端決定。前端不按日期或 ID 重排，不需要 order。ID 是正整數，跨語言及 Experience 保持一致；DOM attribute 的字串在事件邊界轉回數字，沒有 ID 對照表。

經緯度由前端 MapGeometry 轉為 SVG 座標；沒有 point、labelOffset、routeBend、interactiveLabel、locationId 或 organizationId。城市文字位置依字體、語言、尺寸、節點及邊界重新量測；擁擠時隱藏部分文字，保留節點與下方所有選項。

本輪經緯度沿用原地圖停駐位置反算，倫敦採使用者提供的 51.5246／-0.134；它們是展示位置，不宣稱為精確辦公室地址。底圖投影設定在 src/config/runtime.json，沒有逐城市布局表。

## 多語與其他 API

三份記錄的順序、ID、日期、分類及座標應一致，顯示文字依 locale 不同。支援語言整份缺失時 transport 回退英文；必要欄位缺失或型別錯誤會被 store 委派的 dataContracts.validateJourney 拒絕，不逐欄補譯。

Journey、Experience、Projects 都使用三語直接文字，不使用 entities 或 mock/locales。Journey 與 Experience 的同筆職涯使用相同數字 ID，Projects 使用自己的主鍵；沒有 slug 對照表。正式後端可由自己的職涯表組裝回應，不需要為前端另外建立 mapping table。

規格見 [API 文件](../../docs/api-interface-format.md)，前端接線見 [Journey 開發對照](../../docs/journey-development.md)。
