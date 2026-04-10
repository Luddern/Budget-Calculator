# 💰 記帳小幫手 — 完整技術操作文件

---

## 目錄

1. [專案架構總覽](#1-專案架構總覽)
2. [Server 端詳細解析](#2-server-端詳細解析)
   - 2.1 [啟動流程](#21-啟動流程)
   - 2.2 [資料庫設計](#22-資料庫設計)
   - 2.3 [認證機制（JWT）](#23-認證機制jwt)
   - 2.4 [API 路由與判斷邏輯](#24-api-路由與判斷邏輯)
   - 2.5 [參數驗證機制](#25-參數驗證機制)
   - 2.6 [資料權限控制](#26-資料權限控制)
3. [Client 端詳細解析](#3-client-端詳細解析)
   - 3.1 [啟動流程](#31-啟動流程)
   - 3.2 [如何取得 API 資料](#32-如何取得-api-資料)
   - 3.3 [狀態管理（Pinia）](#33-狀態管理pinia)
   - 3.4 [路由守衛](#34-路由守衛)
   - 3.5 [頁面元件運作流程](#35-頁面元件運作流程)
4. [前後端串接流程](#4-前後端串接流程)
5. [優化手段彙整](#5-優化手段彙整)
6. [操作指南（啟動、測試）](#6-操作指南啟動測試)

---

## 1. 專案架構總覽

```
sideproject/
├── server/                         # 後端 — Node.js + Express
│   ├── index.js                    # 主程式入口，啟動 HTTP Server
│   ├── db/
│   │   └── init.js                 # 資料庫初始化 + 建表 + Seed 預設資料
│   ├── middleware/
│   │   └── auth.js                 # JWT 認證中介層
│   └── routes/
│       ├── auth.js                 # 註冊 / 登入 / 取得使用者
│       ├── expenses.js             # 收支 CRUD + CSV 匯出
│       ├── categories.js           # 分類管理
│       ├── budgets.js              # 預算設定
│       └── reports.js              # 月報 / 年報統計查詢
│
├── client/                         # 前端 — Vue 3 + Vite
│   ├── vite.config.js              # Vite 設定（含 API Proxy）
│   ├── src/
│   │   ├── main.js                 # App 入口，掛載 Pinia / Router
│   │   ├── App.vue                 # 根元件
│   │   ├── services/
│   │   │   └── api.js              # Axios 封裝 + 攔截器
│   │   ├── router/
│   │   │   └── index.js            # Vue Router + 路由守衛
│   │   ├── stores/                 # Pinia Stores
│   │   │   ├── auth.js
│   │   │   ├── expense.js
│   │   │   ├── category.js
│   │   │   ├── budget.js
│   │   │   └── report.js
│   │   ├── views/                  # 頁面
│   │   │   ├── LoginView.vue
│   │   │   ├── RegisterView.vue
│   │   │   ├── DashboardView.vue
│   │   │   ├── ExpensesView.vue
│   │   │   ├── ReportsView.vue
│   │   │   └── BudgetView.vue
│   │   └── components/             # 共用元件
│   │       ├── AppLayout.vue
│   │       ├── ChartPie.vue
│   │       ├── ChartLine.vue
│   │       └── ChartBar.vue
```

---

## 2. Server 端詳細解析

### 2.1 啟動流程

**檔案：`server/index.js`**

```
node index.js 執行後：
1. import express         → 載入 Express 框架
2. import cors            → 載入跨域處理
3. import 各 routes 檔案   → 載入同時觸發 db/init.js（因 routes 裡有 import db）
4. app.use(cors(...))     → 允許前端 localhost:5173 的請求
5. app.use(express.json())→ 啟用 JSON body 解析（讓 req.body 可以讀 JSON）
6. app.use('/api/...', routeHandler) → 掛載各 API 路由
7. app.listen(3001)       → 啟動 HTTP Server，開始監聽請求
```

**重點：** 當 import routes 時，routes 內部會 `import db from '../db/init.js'`，這會觸發 `init.js` 執行——建立資料表、種入預設分類。所以只要 server 啟動，資料庫就自動初始化了。

---

### 2.2 資料庫設計

**檔案：`server/db/init.js`**

使用 **SQLite**（透過 better-sqlite3），資料存成一個 `.db` 檔案，零設定。

#### 四張資料表關聯

```
users (使用者)
  │
  ├──< expenses (收支記錄)  ── 多對一 ──> categories (分類)
  │
  ├──< budgets (預算)       ── 多對一 ──> categories (分類)
  │
  └──< categories (自建分類，user_id 非 null)
```

#### 各表結構

| 表名           | 欄位                                                     | 說明                                                                |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| **users**      | id, username, email, password, created_at                | password 存的是 bcrypt 雜湊值，永遠不會存明文                       |
| **categories** | id, name, icon, color, user_id, is_default               | `is_default=1` 是系統預設（8 種），`user_id` 不為 null 是使用者自建 |
| **expenses**   | id, user_id, category_id, amount, note, date, created_at | 每筆消費紀錄，透過 user_id 限定只有本人能存取                       |
| **budgets**    | id, user_id, category_id, amount, month                  | `category_id` 為 null 代表「總預算」，有值代表「分類預算」          |

#### 初始化邏輯

```javascript
// 1. 設定 WAL 模式（寫入效能優化，讀寫可並行）
db.pragma("journal_mode = WAL");

// 2. 啟用外鍵約束（確保 category_id 一定存在於 categories 表）
db.pragma("foreign_keys = ON");

// 3. CREATE TABLE IF NOT EXISTS — 表不存在才建，存在就跳過（冪等操作）

// 4. Seed 預設分類（只在第一次執行時種入，之後不會重複）
const count = db.prepare("SELECT COUNT(*) as cnt FROM categories WHERE is_default = 1").get();
if (count.cnt === 0) {
  // 用 transaction 批次寫入 8 筆預設分類
  const insertMany = db.transaction((items) => { ... });
  insertMany(defaults);
}
```

---

### 2.3 認證機制（JWT）

**檔案：`server/middleware/auth.js`**

#### 什麼是 JWT？

JWT (JSON Web Token) 是一種無狀態的認證方式。Server 不需要存 session，只要：

1. 登入時：用 secret key 簽發一個 token 給前端
2. 之後每次請求：前端帶 token 來，Server 驗證簽名是否合法

#### Token 產生

```javascript
export function generateToken(userId) {
  return jwt.sign(
    // jwt.sign() 會產生一串加密字串
    { userId }, // Payload：放使用者 ID
    JWT_SECRET, // Secret：用來簽名的金鑰
    { expiresIn: "7d" }, // 7 天後過期
  );
}
```

產生的 token 長這樣：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6...`

#### Token 驗證（中介層）

```javascript
export function authMiddleware(req, res, next) {
  // 1. 從 header 取出 "Authorization: Bearer <token>"
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "請先登入" }); // 沒帶 token → 401
  }

  try {
    // 2. 切出 token 部分
    const token = header.split(" ")[1];

    // 3. 驗證 token 簽名 + 是否過期
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. 把 userId 塞到 req 上，後續 route handler 就能用 req.userId
    req.userId = decoded.userId;

    // 5. 放行，繼續執行下一個 middleware 或 route handler
    next();
  } catch {
    return res.status(401).json({ message: "登入已過期，請重新登入" });
  }
}
```

#### 使用方式

```javascript
// 整個 router 都需要登入（所有 expenses API 都需要認證）
router.use(authMiddleware);

// 或者只有特定路由需要
router.get("/me", authMiddleware, (req, res) => { ... });
```

---

### 2.4 API 路由與判斷邏輯

以下用最核心的幾個 API 逐行解析 Server 怎麼寫「判斷邏輯」。

#### ① 註冊 `POST /api/auth/register`

```javascript
router.post(
  "/register",
  // ── 第一層：參數驗證 middleware（見 2.5）──
  [
    body("username").trim().isLength({ min: 2, max: 20 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  validate,

  // ── 第二層：商業邏輯 ──
  (req, res) => {
    const { username, email, password } = req.body;

    // 判斷 1：帳號是否已存在？
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
      .get(email, username);
    if (existing) {
      return res.status(409).json({ message: "使用者名稱或 Email 已被使用" });
      //        ↑ 409 Conflict：資源衝突
    }

    // 判斷通過 → 密碼加密
    const hashed = bcrypt.hashSync(password, 10);
    //                                       ↑ salt rounds：加鹽 10 輪

    // 寫入資料庫
    const result = db
      .prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
      .run(username, email, hashed);
    //    ↑ .run() 用於 INSERT/UPDATE/DELETE，回傳 { lastInsertRowid }

    // 直接簽發 token（註冊完自動登入）
    const token = generateToken(result.lastInsertRowid);
    res
      .status(201)
      .json({ token, user: { id: result.lastInsertRowid, username, email } });
    //        ↑ 201 Created
  },
);
```

#### ② 登入 `POST /api/auth/login`

```javascript
(req, res) => {
  const { email, password } = req.body;

  // 判斷 1：用 email 查使用者
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  //                                                              ↑ .get() 取單筆

  // 判斷 2：使用者不存在 或 密碼不符
  if (!user || !bcrypt.compareSync(password, user.password)) {
    //            ↑ compareSync：把明文密碼和資料庫的雜湊值比對
    return res.status(401).json({ message: "Email 或密碼錯誤" });
    // 注意：不會告訴前端「是 email 錯還是密碼錯」→ 防止帳號列舉攻擊
  }

  // 驗證通過 → 簽發 token
  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
  //                        ↑ 只回傳安全的欄位，不回傳 password
};
```

#### ③ 取得消費列表 `GET /api/expenses?month=2026-03&category_id=1&page=1`

```javascript
router.get("/", (req, res) => {
  const { month, category_id, page = 1, limit = 20 } = req.query;
  //                           ↑ 分頁預設值

  const offset = (Math.max(1, +page) - 1) * +limit;
  //              ↑ 防止 page=0 或負數

  // 動態組裝 WHERE 條件（根據有沒有傳篩選參數）
  let where = "WHERE e.user_id = ?"; // 一定要限定本人
  const params = [req.userId]; // req.userId 來自 authMiddleware

  if (month) {
    where += " AND strftime('%Y-%m', e.date) = ?"; // SQLite 日期函式
    params.push(month);
  }
  if (category_id) {
    where += " AND e.category_id = ?";
    params.push(+category_id); // ← +category_id 轉數字，避免字串比對
  }

  // 先查總數（給前端做分頁 UI 用）
  const total = db
    .prepare(`SELECT COUNT(*) as cnt FROM expenses e ${where}`)
    .get(...params).cnt;

  // 再查分頁資料（JOIN categories 把分類資訊帶出來）
  params.push(+limit, offset);
  const expenses = db
    .prepare(
      `
    SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    ${where}
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params);
  //  ↑ .all() 取多筆

  res.json({ expenses, total, page: +page, limit: +limit });
});
```

#### ④ 新增消費 `POST /api/expenses`

```javascript
(req, res) => {
  const { amount, category_id, date, note = "" } = req.body;

  // 寫入
  const result = db
    .prepare(
      "INSERT INTO expenses (user_id, category_id, amount, note, date) VALUES (?, ?, ?, ?, ?)",
    )
    .run(req.userId, category_id, amount, note, date);

  // 回傳完整資料（含分類名稱/圖示）→ 前端不用再發一次請求
  const expense = db
    .prepare(
      `
    SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.id = ?
  `,
    )
    .get(result.lastInsertRowid);

  res.status(201).json({ expense });
};
```

#### ⑤ 刪除分類 `DELETE /api/categories/:id`

```javascript
router.delete("/:id", (req, res) => {
  // 判斷 1：只能刪除自己建的、非預設分類
  const category = db
    .prepare(
      "SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_default = 0",
    )
    .get(+req.params.id, req.userId);

  if (!category) {
    return res.status(404).json({ message: "無法刪除此分類" });
  }

  // 判斷 2：這個分類底下可能有消費紀錄，轉移到「其他」
  const otherCat = db
    .prepare("SELECT id FROM categories WHERE name = '其他' AND is_default = 1")
    .get();
  if (otherCat) {
    db.prepare(
      "UPDATE expenses SET category_id = ? WHERE category_id = ? AND user_id = ?",
    ).run(otherCat.id, +req.params.id, req.userId);
  }

  // 安全刪除
  db.prepare("DELETE FROM categories WHERE id = ?").run(+req.params.id);
  res.json({ message: "已刪除" });
});
```

#### ⑥ 預算設定 `POST /api/budgets`（Upsert 模式）

```javascript
(req, res) => {
  const { amount, month, category_id = null } = req.body;

  // 判斷：這個月+這個分類的預算是否已存在？
  const existing = db
    .prepare(
      "SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category_id IS ?",
      //                                                         ↑ IS ? 而非 = ?，因為 category_id 可能是 null
    )
    .get(req.userId, month, category_id);

  if (existing) {
    // 已存在 → UPDATE（更新金額）
    db.prepare("UPDATE budgets SET amount = ? WHERE id = ?").run(
      amount,
      existing.id,
    );
  } else {
    // 不存在 → INSERT（新增）
    db.prepare(
      "INSERT INTO budgets (user_id, category_id, amount, month) VALUES (?, ?, ?, ?)",
    ).run(req.userId, category_id, amount, month);
  }

  res.json({ message: "預算已更新" });
};
```

---

### 2.5 參數驗證機制

**使用 `express-validator`，在進入商業邏輯之前就擋掉不合法的請求。**

```javascript
// 定義驗證規則（以陣列形式作為 middleware）
[
  body("amount").isFloat({ min: 0.01 }).withMessage("金額必須大於 0"),
  body("category_id").isInt().withMessage("請選擇分類"),
  body("date").isDate().withMessage("請選擇日期"),
  body("note").optional().trim().isLength({ max: 200 }),
  //           ↑ optional() → 這個欄位可以不傳
  //                    ↑ trim() → 自動去除前後空白
];

// 統一處理驗證結果
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
    //        ↑ 400 Bad Request      ↑ 只回傳第一個錯誤訊息
  }
  next(); // 驗證通過，繼續
};
```

**Express middleware 的執行順序：**

```
POST /api/expenses
  → express.json()          解析 JSON body
  → authMiddleware           驗證 JWT，取得 userId
  → [body validators]        驗證欄位格式
  → validate                 檢查驗證結果
  → route handler            執行商業邏輯
```

---

### 2.6 資料權限控制

**每個 API 都會限定只能存取「自己的資料」：**

```javascript
// 查詢：WHERE 固定帶 user_id
"SELECT ... FROM expenses WHERE user_id = ?"  → params: [req.userId]

// 修改/刪除：雙重確認 id + user_id
"SELECT id FROM expenses WHERE id = ? AND user_id = ?"
→ 即使知道別人的 expense id，也無法操作

// 分類：只能刪自己建的（is_default = 0 且 user_id 吻合）
"WHERE id = ? AND user_id = ? AND is_default = 0"
```

---

## 3. Client 端詳細解析

### 3.1 啟動流程

**檔案：`client/src/main.js`**

```javascript
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import router from "./router";
import App from "./App.vue";
import "./assets/main.css"; // TailwindCSS

const app = createApp(App);

// 1. 建立 Pinia 實例 + 掛載持久化插件
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
//          ↑ 讓指定的 store 資料存到 localStorage，重新整理不會消失

// 2. 掛載到 Vue App
app.use(pinia); // 狀態管理
app.use(router); // 路由
app.mount("#app"); // 渲染到 DOM
```

---

### 3.2 如何取得 API 資料

#### Axios 封裝

**檔案：`client/src/services/api.js`**

```javascript
import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

// 建立 Axios 實例
const api = axios.create({
  baseURL: "/api", // 所有請求前綴加 /api
  timeout: 10000, // 超時 10 秒
});

// ★ 請求攔截器 — 每次發請求自動帶 JWT Token
api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
    //                              ↑ 固定格式：Bearer + 空格 + token
  }
  return config;
});

// ★ 回應攔截器 — 自動處理 401（Token 過期）
api.interceptors.response.use(
  (res) => res, // 成功直接放行
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout(); // 清除本地 token
      router.push("/login"); // 跳轉登入頁
    }
    return Promise.reject(error); // 丟給 catch 處理
  },
);

export default api;
```

#### Vite Proxy 設定

**檔案：`client/vite.config.js`**

```javascript
server: {
  port: 5173,
  proxy: {
    "/api": {
      target: "http://localhost:3001",  // 轉發到後端
      changeOrigin: true,
    },
  },
}
```

**為什麼需要 Proxy？**

開發時前端在 `localhost:5173`，後端在 `localhost:3001`，直接打會有 CORS 問題。
Vite Proxy 的作用是：

```
瀏覽器發 GET localhost:5173/api/expenses
  → Vite Dev Server 攔截 /api 開頭的請求
  → 轉發到 localhost:3001/api/expenses
  → 把後端回應交還給瀏覽器
```

瀏覽器以為是同源請求，不會有 CORS 問題。

---

### 3.3 狀態管理（Pinia）

**Vue 元件不直接呼叫 API，而是透過 Pinia Store 中轉。** 好處：

- 多個元件共用同一份資料（不用各自發請求）
- 資料集中管理，方便追蹤狀態變化
- 元件只負責「呈現」，Store 負責「資料邏輯」

#### Auth Store 範例解析

```javascript
export const useAuthStore = defineStore(
  "auth",
  () => {
    const token = ref(""); // JWT Token
    const user = ref(null); // User 資訊

    const isLoggedIn = computed(() => !!token.value); // 計算屬性：是否已登入

    async function login(email, password) {
      const { data } = await api.post("/auth/login", { email, password });
      //                       ↑ 呼叫後端 API
      token.value = data.token; // 存 token
      user.value = data.user; // 存 user 資訊
    }

    function logout() {
      token.value = ""; // 清空
      user.value = null;
    }

    return { token, user, isLoggedIn, login, register, fetchUser, logout };
  },

  // ★ 持久化設定 — 只持久化 token 到 localStorage
  { persist: { pick: ["token"] } },
  // 下次開網頁時 token 還在，但 user 需要重新從 API 取
);
```

#### Expense Store 範例解析

```javascript
export const useExpenseStore = defineStore("expense", () => {
  const expenses = ref([]); // 消費列表
  const total = ref(0); // 總筆數
  const loading = ref(false); // 載入狀態

  // 取得消費列表（支援月份、分類篩選）
  async function fetchExpenses({ month, category_id, page = 1 } = {}) {
    loading.value = true;
    try {
      const params = { page, limit: 50 };
      if (month) params.month = month;
      if (category_id) params.category_id = category_id;
      const { data } = await api.get("/expenses", { params });
      //                                           ↑ axios 會自動轉成 ?month=xx&page=1
      expenses.value = data.expenses;
      total.value = data.total;
    } finally {
      loading.value = false; // 不管成功失敗都關閉 loading
    }
  }

  // 新增消費 — 樂觀更新
  async function createExpense(payload) {
    const { data } = await api.post("/expenses", payload);
    expenses.value.unshift(data.expense); // 插到陣列最前面（最新的在上面）
    total.value++;
    return data.expense;
  }

  // 更新消費 — 就地替換
  async function updateExpense(id, payload) {
    const { data } = await api.put(`/expenses/${id}`, payload);
    const idx = expenses.value.findIndex((e) => e.id === id);
    if (idx !== -1) expenses.value[idx] = data.expense; // 直接替換該筆
    return data.expense;
  }

  // 刪除消費
  async function deleteExpense(id) {
    await api.delete(`/expenses/${id}`);
    expenses.value = expenses.value.filter((e) => e.id !== id); // 從陣列移除
    total.value--;
  }

  // CSV 匯出（直接開新分頁下載）
  function exportCSV(month) {
    const params = month ? `?month=${month}` : "";
    window.open(`/api/expenses/export${params}`, "_blank");
  }

  return {
    expenses,
    total,
    loading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    exportCSV,
  };
});
```

---

### 3.4 路由守衛

**檔案：`client/src/router/index.js`**

```javascript
const routes = [
  {
    path: "/login",
    component: () => import("@/views/LoginView.vue"), // 懶載入
    meta: { guest: true }, // ← 標記：訪客頁面
  },
  {
    path: "/",
    component: () => import("@/components/AppLayout.vue"),
    meta: { auth: true }, // ← 標記：需要登入
    children: [
      { path: "", component: () => import("@/views/DashboardView.vue") },
      { path: "expenses", component: () => import("@/views/ExpensesView.vue") },
      // ...
    ],
  },
];

// ★ 全域路由守衛 — 每次跳頁都會執行
router.beforeEach((to) => {
  const auth = useAuthStore();

  // 需要登入的頁面，但沒有 token → 跳轉登入
  if (to.meta.auth && !auth.token) return "/login";

  // 訪客頁面（登入/註冊），但已經登入 → 跳轉首頁
  if (to.meta.guest && auth.token) return "/";
});
```

**`() => import(...)` 是什麼？**

這是 **動態 import（懶載入）**。Vite 打包時會把每個頁面切成獨立的 JS 檔案（code splitting），使用者進入該頁面時才下載，減少首次載入量。

---

### 3.5 頁面元件運作流程

以 **ExpensesView（記帳頁）** 為例：

```
元件掛載 (onMounted)
  │
  ├── expenseStore.fetchExpenses({ month: '2026-03' })
  │     └── axios GET /api/expenses?month=2026-03&page=1&limit=50
  │           └── Server 回傳 { expenses: [...], total: 42 }
  │                 └── store.expenses = data.expenses  ← Vue 響應式自動更新畫面
  │
  │ [使用者操作]
  │
  ├── 按「＋ 新增」→ showForm = true → 顯示 Modal 表單
  │     └── 填寫金額/分類/日期 → handleSubmit()
  │           └── expenseStore.createExpense(form)
  │                 └── POST /api/expenses → 回傳新記錄 → unshift 到列表最前面
  │
  ├── 按「✏️ 編輯」→ openForm(expense) → 表單帶入現有值
  │     └── handleSubmit()
  │           └── expenseStore.updateExpense(id, form)
  │                 └── PUT /api/expenses/5 → 回傳更新後記錄 → 替換陣列中對應項
  │
  ├── 按「🗑 刪除」→ confirm('確定？') → handleDelete(id)
  │     └── expenseStore.deleteExpense(id)
  │           └── DELETE /api/expenses/5 → 從陣列 filter 移除
  │
  ├── 切換月份 → watch(filterMonth) 觸發 → 重新 fetchExpenses
  │
  └── 按「📥 匯出 CSV」→ expenseStore.exportCSV(month)
        └── window.open('/api/expenses/export?month=2026-03')
              → 瀏覽器直接下載 CSV 檔案
```

---

## 4. 前後端串接流程

### 完整登入流程

```
[LoginView.vue]
  ↓ 使用者輸入 email + password，按登入
  ↓
[auth store] login(email, password)
  ↓
[api.js] axios.post('/auth/login', { email, password })
  ↓ Vite Proxy 轉發
[Express] POST /api/auth/login
  ↓ express.json() 解析 body
  ↓ body validators 驗證格式
  ↓ validate middleware 檢查結果
  ↓ 查 DB：SELECT * FROM users WHERE email = ?
  ↓ bcrypt.compareSync() 比對密碼
  ↓ 通過 → generateToken(userId)
  ↓
[Express] 回傳 { token: "eyJ...", user: { id, username, email } }
  ↓
[api.js] response 回到 axios
  ↓
[auth store] token.value = data.token ← 存入 Pinia（+ localStorage 持久化）
             user.value = data.user
  ↓
[LoginView.vue] router.push('/') ← 跳轉首頁
  ↓
[router 守衛] to.meta.auth && auth.token ✓ → 放行
  ↓
[AppLayout.vue] onMounted → auth.fetchUser() + categoryStore.fetchCategories()
  ↓ 以後每次 API 請求，axios 攔截器自動帶 Authorization: Bearer <token>
```

### 完整記帳流程

```
[ExpensesView.vue] 按「＋ 新增」
  ↓ showForm = true，表單 Modal 出現
  ↓ 填入：amount=150, category_id=1(飲食), date=2026-03-30, note=午餐
  ↓ 按儲存
  ↓
[expense store] createExpense({ amount: 150, category_id: 1, ... })
  ↓
[api.js] axios.post('/expenses', payload)
  ↓ 攔截器自動加 Authorization: Bearer eyJ...
  ↓ Vite Proxy 轉發
  ↓
[Express] POST /api/expenses
  ↓ authMiddleware：驗 token → req.userId = 1
  ↓ express-validator：amount > 0 ✓, date 格式 ✓
  ↓ validate：無錯誤 → next()
  ↓ INSERT INTO expenses (...) VALUES (1, 1, 150, '午餐', '2026-03-30')
  ↓ SELECT e.*, c.* ... WHERE e.id = <新 id>（查回完整資料含分類名）
  ↓
[Express] 回傳 201 { expense: { id: 10, amount: 150, category_name: "飲食", ... } }
  ↓
[expense store] expenses.value.unshift(data.expense) ← 插到列表最前面
  ↓
[ExpensesView.vue] Vue 偵測到 expenses 變化 → 畫面自動多一筆新紀錄
                   showForm = false → Modal 關閉
```

---

## 5. 優化手段彙整

### Server 端

| 優化                     | 說明                                                                | 位置                       |
| ------------------------ | ------------------------------------------------------------------- | -------------------------- |
| **WAL 模式**             | SQLite 預設是鎖表式寫入，WAL 讓讀寫可以並行                         | `db/init.js`               |
| **Transaction 批次寫入** | 種子資料用 `db.transaction()` 一次寫入 8 筆，避免 8 次 IO           | `db/init.js`               |
| **Prepared Statement**   | `db.prepare()` 預編譯 SQL，重複使用效能更好，且自動防 SQL Injection | 所有 routes                |
| **參數化查詢**           | 用 `?` 佔位符而非字串拼接，防止 SQL Injection                       | 所有 routes                |
| **COALESCE**             | `COALESCE(SUM(amount), 0)` — 沒有資料時回傳 0 而非 null             | `reports.js`, `budgets.js` |
| **JOIN 查詢**            | 一次查詢就帶出分類名稱/圖示，前端不需再發額外請求                   | `expenses.js`              |
| **中介層分層**           | 認證、驗證、商業邏輯拆開，職責分離                                  | 所有 routes                |
| **密碼安全**             | bcrypt salt 10 輪 + 不回傳 password 欄位                            | `routes/auth.js`           |

### Client 端

| 優化                         | 說明                                                                              | 位置                |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------- |
| **Axios 攔截器**             | 自動帶 token、自動處理 401，每個 API call 不用重複寫                              | `services/api.js`   |
| **Token 持久化**             | `pinia-plugin-persistedstate` 把 token 存 localStorage，重整不用重登              | `stores/auth.js`    |
| **懶載入（Code Splitting）** | `() => import(...)` 每個頁面獨立打包，按需下載                                    | `router/index.js`   |
| **Vite Proxy**               | 開發時避免 CORS，不用後端額外設定                                                 | `vite.config.js`    |
| **響應式更新**               | 新增/刪除後直接操作陣列（unshift/filter），不重新整個 fetch                       | `stores/expense.js` |
| **loading 狀態**             | 每個 store 有 `loading` ref，元件可以顯示載入中                                   | 所有 stores         |
| **try/finally**              | `loading = true` 在 try 裡，`loading = false` 在 finally 裡，確保任何情況都會關閉 | 所有 stores         |
| **RWD 設計**                 | TailwindCSS `sm:` `lg:` 斷點 + 手機版漢堡選單                                     | `AppLayout.vue`     |
| **Computed 快取**            | 圖表資料用 `computed` 產生，source 資料沒變就不重算                               | 所有 Views          |
| **watch 監聽**               | 月份切換時自動重新載入資料，不用手動操作                                          | 所有 Views          |
| **Promise.all 並行**         | Dashboard 同時發 3 個 API（report + expenses + budgets）                          | `DashboardView.vue` |

---

## 6. 操作指南（啟動、測試）

### 啟動專案

```bash
# 終端 1：啟動後端（支援 hot reload）
cd sideproject/server
npm run dev
# ✅ 🚀 Server running on http://localhost:3001

# 終端 2：啟動前端
cd sideproject/client
npm run dev
# ✅ http://localhost:5173
```

### 用 curl 測試 API

```bash
# 1. 註冊
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@test.com","password":"123456"}'

# 回傳：{ "token": "eyJ...", "user": { "id": 1, ... } }

# 2. 登入
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"123456"}'

# 3. 取得分類（帶 token）
curl http://localhost:3001/api/categories \
  -H "Authorization: Bearer <你的token>"

# 4. 新增一筆消費
curl -X POST http://localhost:3001/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的token>" \
  -d '{"amount":150,"category_id":1,"date":"2026-03-30","note":"午餐"}'

# 5. 查看月報
curl "http://localhost:3001/api/reports/monthly?month=2026-03" \
  -H "Authorization: Bearer <你的token>"

# 6. 查看已註冊帳號（直接查 DB）
cd server && node --input-type=module -e "
  import db from './db/init.js';
  console.table(db.prepare('SELECT id, username, email, created_at FROM users').all());
"
```

### 打包部署

```bash
# 前端打包
cd client && npm run build    # 產出在 client/dist/

# 後端直接啟動
cd server && npm start        # 等同 node index.js
```
