# Skills mock

`en.json`、`zh-Hans.json`、`zh-Hant.json` 保存完整 `{id,label}` 技能來源，檔案不帶分頁資訊。三語須有相同 ID 集合與順序，每個 ID 在單份檔案只出現一次；label 是指定語言文字，不需翻譯鍵。

`GET /portfolio/skills?ownerType=category&ownerId=<分類 ID>&locale=en&page=1&size=6` 依分類來源的 skillIds 順序取技能，回傳共用 `{items,total,pages,page,size}`。page 從 1 開始，size 固定 6，pages=ceil(total/6)；末頁不足六筆仍保留 size=6，空分類 pages=0，超頁 items=[]。

分類 skills 預覽已是第 1 頁，展開從 page=2 接續。無效 page／size 回 400，未知分類回 404，缺少 ownerId 回 422。沒有 included、cursor 或另一層 page 物件。完整定義見 [API 規格](../../docs/api-interface-format.md)。
