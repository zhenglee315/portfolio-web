# Skill categories mock

`en.json`、`zh-Hans.json`、`zh-Hant.json` 保存完整有序分類來源，不是 API 回應。每項是 `{id,label,skillIds}`；skillIds 維持分類技能順序並引用同語言 [skills](../skills/README.md)。三語分類 ID、排序、技能 ID 順序必須相同，同一分類不得重複技能，同一技能可屬於多個分類。

`GET /portfolio/skill-categories?locale=en&page=1&size=6` 將此正規化來源投影為 `{items,total,pages,page,size}`。每項是 `{id,label,skills}`，skills 亦為同一五欄位分頁，固定第 1 頁、最多六筆 `{id,label}`，total 為該分類完整技能數，pages 為 ceil(total/6)。空分類的內層 items=[]、total=0、pages=0、page=1、size=6。回應不使用 included、skillIds 或 skillsPage。

目前七個分類按六筆加一筆載入。分類下一頁使用外層 page+1；分類技能預覽後續使用 `/portfolio/skills?ownerType=category&ownerId=<分類 ID>&locale=en&page=2&size=6`。store 內部會再正規化為 skillIds 與去重技能查找表，避免重複維護實體。完整契約見 [API 規格](../../docs/api-interface-format.md)。
