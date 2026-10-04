# Skill category mock 欄位註解

`en.json`、`zh-Hans.json`、`zh-Hant.json` 各保存完整且有序的分類陣列，供 `GET /portfolio/skill-categories` 建立游標頁。檔案本身不是 API 頁面；mock transport 依 `limit` 取分類，再把每類的 `skillIds` 裁成最多六筆，補上 `skillsPage` 與本頁引用的 `included.skills`。

| 欄位       | 型別       | English field comment                                                     |
| ---------- | ---------- | ------------------------------------------------------------------------- |
| `id`       | string     | Stable category slug shared by all three languages.                       |
| `label`    | string     | Category title already localized for this fixture.                        |
| `skillIds` | `string[]` | Complete ordered membership; the API response previews at most six IDs.  |

三份資料須保留相同分類 ID、分類順序及每類的技能 ID 順序。`skillIds` 中每個 ID 都要出現在同語言的 [技能資料](../skills/README.md)；同一技能可出現在不同分類，但不可在同一分類重複。分類回應直接提供 `label`，只有本頁預覽引用到的技能標籤才進入 `included.skills`，且每個技能只出現一次。

分類的 `page.nextCursor` 繼續下一批分類；單一分類的 `skillsPage.nextCursor` 改由 `/portfolio/skills?ownerId=<分類 ID>` 繼續其技能。游標只屬於發出它的資源、分類與語言，不可跨語言共用。完整契約見 [API 規格](../../docs/api-interface-format.md)。
