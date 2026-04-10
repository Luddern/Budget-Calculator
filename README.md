# Budget-Calculator

簡介
這是個簡單的記帳與預算管理應用（前後端分離）。前端使用 Vue 3 與 Vite，後端使用 Node.js + Express 並以 SQLite 儲存資料。

快速開始
1. 取得程式碼
   - 已將本專案推到遠端分支，請從 GitHub clone 或在本地已存在的倉庫中工作。
2. 後端（server）
   - 進入 server 目錄：cd server
   - 安裝套件：npm install
   - 開發：npm run dev  （會以 node --watch 監看檔案）
   - 上線/啟動：npm start
3. 前端（client）
   - 進入 client 目錄：cd client
   - 安裝套件：npm install
   - 開發：npm run dev  （啟動 Vite 開發伺服器，預設 localhost:5173）
   - 建置：npm run build
   - 本地預覽：npm run preview

技術棧
- 前端：Vue 3、Vite、Pinia（狀態管理）、Vue Router、Tailwind CSS、Chart.js
- 後端：Node.js、Express、better-sqlite3（SQLite）、bcryptjs（密碼雜湊）、jsonwebtoken（JWT）

環境變數（範例）
建議在 server 目錄建立 .env 檔，範例如下（不要推到遠端）：

--- server/.env 範例 ---
PORT=3000
JWT_SECRET=change_this_to_a_strong_secret
DB_PATH=./db/expense-tracker.db
# 若需要其他設定可加入，例如: NODE_ENV=production
-----------------------

操作流程補充
- 建立 .env：在 server 資料夾下新增 .env，並填入 JWT_SECRET 等敏感資訊。
- 初始化資料庫：如果 server 有提供初始化腳本（例如 server/db/init.js），請依 README 或 scripts 指示執行以建立資料表。

注意事項
- .env 已在 .gitignore 中被忽略，請勿將敏感資訊推上遠端。
- 推到遠端前請確認不含個人憑證（SSH private key、Personal Access Token 等）。

需要我同時在 repo 新增一個 server/.env.example 檔（不含敏感值）嗎？
