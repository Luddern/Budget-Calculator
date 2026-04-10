# Budget-Calculator

Expense tracker / budget calculator project.

Setup
- Backend (server):
  - cd server
  - npm install
  - npm run dev   # development (watch)
  - npm start     # production
- Frontend (client):
  - cd client
  - npm install
  - npm run dev   # start Vite dev server
  - npm run build # build for production
  - npm run preview

Tech stack
- Frontend: Vue 3, Vite, Pinia, Vue Router, Tailwind CSS, Chart.js
- Backend: Node.js, Express, better-sqlite3 (SQLite), bcryptjs, jsonwebtoken

Notes
- Create a .env in server for secrets (JWT secret) and DB config if needed.
- Ensure SSH keys or PAT are set up for git push to succeed.
