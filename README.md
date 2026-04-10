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

環境變數
- 建議在 server 下建立 .env 檔來放置敏感資訊（例如 JWT_SECRET、資料庫路徑等）。.env 已在 .gitignore 中被忽略，請勿將敏感資訊推上遠端。

注意事項
- 請確認已有可用的 GitHub 權限（SSH key 或 Personal Access Token）以便推送。
- 若要在遠端部署，請建立真實的 SQLite DB 或改用其他 DB，並設定正確的環境變數。

如需我把 README 再加上範例 .env 範本或更詳細的部署指引，請告訴我要包含哪些項目。
