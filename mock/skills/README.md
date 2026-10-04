# Skill mock 欄位註解

`en.json`、`zh-Hans.json`、`zh-Hant.json` 各保存完整技能陣列。`GET /portfolio/skills?ownerType=category&ownerId=<分類 ID>` 依分類中的 `skillIds` 順序查出技能，再以游標分頁直接回傳 `{items,page}`。檔案本身不帶頁面資訊。

| 欄位    | 型別   | English field comment                                   |
| ------- | ------ | ------------------------------------------------------- |
| `id`    | string | Stable skill slug shared by all three languages.        |
| `label` | string | Display-ready label in this fixture's requested locale. |

三語須有相同 ID 集合與順序；每個 ID 在一份檔案只出現一次。前端直接顯示 `label`，無需翻譯鍵。`/portfolio/skills` 回應只包含 `items` 與 `page`，不重複附帶分類預覽使用的 `included.skills`。分類預覽的 `skillsPage.nextCursor` 可以接到同一分類、同一語言的技能頁。

舊 [skills.json](../skills.json) 和 `mock/locales/*.json` 只供後端種子匯入，不是前端 API 回應來源。完整契約見 [API 規格](../../docs/api-interface-format.md)。
