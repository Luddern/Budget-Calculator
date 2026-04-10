import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "expense-tracker.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📁',
    color TEXT NOT NULL DEFAULT '#6b7280',
    user_id INTEGER,
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    UNIQUE(user_id, category_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
`);

// Seed default categories if empty
const count = db
  .prepare("SELECT COUNT(*) as cnt FROM categories WHERE is_default = 1")
  .get();
if (count.cnt === 0) {
  const insert = db.prepare(
    "INSERT INTO categories (name, icon, color, is_default) VALUES (?, ?, ?, 1)",
  );
  const defaults = [
    ["飲食", "🍔", "#ef4444"],
    ["交通", "🚗", "#f97316"],
    ["娛樂", "🎮", "#8b5cf6"],
    ["購物", "🛍️", "#ec4899"],
    ["居住", "🏠", "#3b82f6"],
    ["醫療", "🏥", "#14b8a6"],
    ["教育", "📚", "#eab308"],
    ["其他", "📦", "#6b7280"],
  ];
  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(...item);
  });
  insertMany(defaults);
}

export default db;
