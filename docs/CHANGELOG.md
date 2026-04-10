# 更新紀錄 (CHANGELOG)

## v1.2.0 - 防呆強化與安全性提升

### 🔒 Server 端安全性

#### 1. JWT Secret 生產環境檢查

- **檔案**: `server/middleware/auth.js`
- **說明**: 當 `NODE_ENV=production` 且未設定 `JWT_SECRET` 環境變數時，Server 直接 `process.exit(1)` 並提示錯誤，防止使用預設金鑰上生產

#### 2. 全面套用 asyncHandler

- **檔案**: 所有 `server/routes/*.js`
- **說明**: 先前建立的 `asyncHandler` 工具函式未被任何 route 使用。現已包裝所有 route handler（auth、expenses、categories、budgets、reports），任何未預期的 throw 都會被 global error handler 接住，不會導致 Server 掛起

#### 3. 查詢參數格式驗證

- **檔案**: `server/routes/reports.js`、`server/routes/budgets.js`
- **說明**: `month` 參數加入 `/^\d{4}-\d{2}$/` 正則驗證，`year` 參數加入 `/^\d{4}$/` 驗證。防止惡意字串注入 `strftime()` 查詢

#### 4. 分頁 limit 上限限制

- **檔案**: `server/routes/expenses.js`
- **問題**: 原本 `limit` 直接從 query string 取值不設上限，攻擊者可傳 `limit=999999` 一次撈出所有資料
- **修復**: 加入 `Math.min(Math.max(1, limit), 100)` 限制在 1-100 之間

#### 5. 自訂分類數量上限

- **檔案**: `server/routes/categories.js`
- **說明**: 新增每個使用者自訂分類上限為 20 個，防止惡意建立大量分類
- **驗證**: POST 改用 `express-validator` 驗證 `name`（1-20字元）、`color`（#hex格式），取代原本手動 if 檢查

#### 6. CORS 來源可配置

- **檔案**: `server/index.js`
- **說明**: CORS origins 改為從 `process.env.CORS_ORIGINS` 讀取（逗號分隔），預設仍為 localhost:5173/4173。部署時可動態配置

---

### 🛡️ Client 端防呆

#### 1. BudgetView 操作錯誤處理

- **檔案**: `client/src/views/BudgetView.vue`
- **說明**: `setTotalBudget()`、`addCategoryBudget()`、`removeBudget()` 全部加入 try/catch，失敗時 alert 顯示後端錯誤訊息

#### 2. 除以零防護（BudgetView）

- **檔案**: `client/src/views/BudgetView.vue`
- **問題**: 當預算金額為 0 時，`spent / amount` 導致 `Infinity`，進度條渲染異常
- **修復**: 加入三元判斷 `amount ? (spent / amount) * 100 : 0`，共修復 3 處（總預算百分比、總預算進度條、分類預算進度條）

#### 3. 除以零防護（ReportsView）

- **檔案**: `client/src/views/ReportsView.vue`
- **問題**: 分類明細的橫條圖寬度計算 `cat.total / report.totalSpent`，當 totalSpent 為 0 時產生 NaN
- **修復**: 加入 `report.totalSpent ? ... : 0` 防護

---

### 效能影響摘要

| 優化項目              | 改善效果                         |
| --------------------- | -------------------------------- |
| asyncHandler 全面套用 | 防止未捕捉異常導致 Server 無回應 |
| limit 上限 100        | 防止單次大量資料撈取             |
| 查詢參數正則驗證      | 防止注入攻擊                     |
| 自訂分類上限 20       | 防止資源耗盡                     |
| JWT 生產環境檢查      | 防止預設金鑰上生產               |
| 除以零防護 x4 處      | 防止 UI 渲染異常                 |
| 操作 try/catch x3 處  | 防止靜默失敗                     |

---

## v1.1.0 - 程式碼優化

### 🔧 Server 端優化

#### 1. 提取共用 Validate Middleware

- **檔案**: 新增 `server/middleware/validate.js`
- **說明**: 原本 `auth.js`、`expenses.js`、`budgets.js` 各自定義了重複的 `validate` middleware，現統一抽出至 `middleware/validate.js`
- **新增**: `asyncHandler` 工具函式，包裝 async route handler 自動 catch 錯誤

#### 2. 全域錯誤處理

- **檔案**: `server/index.js`
- **說明**: 新增 Express global error handler，避免未捕捉的錯誤導致回應掛起
- **安全**: 生產環境隱藏錯誤細節，只回傳「伺服器錯誤」

#### 3. 請求大小限制

- **檔案**: `server/index.js`
- **說明**: `express.json()` 加入 `{ limit: "1mb" }` 防止過大 payload 攻擊（DoS 防護）

#### 4. 資料庫索引

- **檔案**: `server/db/init.js`
- **新增索引**:
  - `idx_expenses_user_date` → `expenses(user_id, date)` 加速月份查詢
  - `idx_expenses_user_category` → `expenses(user_id, category_id)` 加速分類篩選
  - `idx_budgets_user_month` → `budgets(user_id, month)` 加速預算查詢

#### 5. N+1 查詢問題修復

- **檔案**: `server/routes/budgets.js`
- **問題**: GET `/api/budgets` 原本對每筆預算都各自查一次 `SUM(amount)`，造成 N+1 次 DB 查詢
- **修復**: 改為一次性 `GROUP BY category_id` 查出所有分類花費，再用 map 組合，從 N+1 次降到 2 次查詢

#### 6. 冗餘查詢消除

- **檔案**: `server/routes/reports.js`
- **問題**: GET `/api/reports/monthly` 原本執行 4 次 DB 查詢（totalSpent、byCategory、daily、txCount），其中 totalSpent 和 txCount 可以從 byCategory 結果推導
- **修復**: 減少為 2 次查詢（byCategory + daily），totalSpent 和 transactionCount 從 byCategory 用 `reduce()` 計算

#### 7. Email 正規化

- **檔案**: `server/routes/auth.js`
- **說明**: 註冊與登入驗證加入 `.normalizeEmail()`，統一 email 格式（如去除大小寫差異、移除 Gmail dots）

#### 8. CSV 注入防護

- **檔案**: `server/routes/expenses.js`
- **說明**: CSV 匯出新增 `sanitize()` 函式，防止欄位以 `=`, `+`, `-`, `@` 等字元開頭導致的 CSV 公式注入攻擊

---

### 🎨 Client 端優化

#### 1. CSV 匯出修復（安全性）

- **檔案**: `client/src/stores/expense.js`
- **問題**: 原本使用 `window.open()` 開啟 CSV 下載，此方法**不會攜帶 JWT Token**，在生產環境會被 auth middleware 擋住（401）
- **修復**: 改用 `axios.get()` + `responseType: "blob"` 下載，再用 `URL.createObjectURL()` 觸發瀏覽器下載

#### 2. 404 路由匹配

- **檔案**: `client/src/router/index.js`
- **說明**: 新增 `/:pathMatch(.*)*` catch-all 路由，避免使用者輸入不存在的路徑時看到空白頁面，自動導向首頁

#### 3. Sidebar 導航精確匹配

- **檔案**: `client/src/components/AppLayout.vue`
- **問題**: Dashboard 路由 `"/"` 使用 `active-class` 時，所有子路由（`/expenses`、`/reports`、`/budgets`）都會匹配到 Dashboard 的 active 樣式
- **修復**: 加入 `:exact="item.exact"` 屬性，Dashboard 設為 `exact: true`，其餘保持預設

#### 4. 路由切換動畫

- **檔案**: `client/src/components/AppLayout.vue`、`client/src/assets/main.css`
- **說明**: `<router-view>` 改為 `v-slot` 搭配 `<transition name="fade">` 實現頁面切換淡入淡出效果（0.15s ease）

#### 5. 表單操作錯誤處理

- **檔案**: `client/src/views/ExpensesView.vue`
- **說明**: `handleSubmit()` 和 `handleDelete()` 加入 try/catch，失敗時顯示後端回傳的錯誤訊息，避免操作失敗時沒有任何提示

---

### 📁 專案配置

#### .gitignore

- **檔案**: 新增 `.gitignore`
- **排除項目**: `node_modules/`、`dist/`、`.env`、`*.db`（SQLite）、`.DS_Store`

---

### 效能影響摘要

| 優化項目         | 改善效果                       |
| ---------------- | ------------------------------ |
| Budgets N+1 修復 | DB 查詢從 N+1 → 2 次           |
| Reports 冗餘移除 | DB 查詢從 4 → 2 次             |
| DB 索引          | 查詢效能提升（大量資料時顯著） |
| CSV 匯出改 axios | 修復生產環境無法下載的 bug     |
| CSV 注入防護     | 安全性提升                     |
| 請求大小限制     | DoS 防護                       |
