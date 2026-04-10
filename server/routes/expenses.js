import { Router } from "express";
import { body } from "express-validator";
import db from "../db/init.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate, asyncHandler } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);

// Get expenses with filters
router.get(
  "/",
  asyncHandler((req, res) => {
    const { month, category_id, page = 1 } = req.query;
    const limit = Math.min(Math.max(1, +req.query.limit || 20), 100);
    const offset = (Math.max(1, +page) - 1) * limit;

    let where = "WHERE e.user_id = ?";
    const params = [req.userId];

    if (month) {
      where += " AND strftime('%Y-%m', e.date) = ?";
      params.push(month);
    }
    if (category_id) {
      where += " AND e.category_id = ?";
      params.push(+category_id);
    }

    const total = db
      .prepare(`SELECT COUNT(*) as cnt FROM expenses e ${where}`)
      .get(...params).cnt;

    params.push(limit, offset);
    const expenses = db
      .prepare(
        `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       ${where}
       ORDER BY e.date DESC, e.created_at DESC
       LIMIT ? OFFSET ?`,
      )
      .all(...params);

    res.json({ expenses, total, page: +page, limit });
  }),
);

// Create expense
router.post(
  "/",
  [
    body("amount").isFloat({ min: 0.01 }).withMessage("金額必須大於 0"),
    body("category_id").isInt().withMessage("請選擇分類"),
    body("date").isDate().withMessage("請選擇日期"),
    body("note").optional().trim().isLength({ max: 200 }),
  ],
  validate,
  asyncHandler((req, res) => {
    const { amount, category_id, date, note = "" } = req.body;
    const result = db
      .prepare(
        "INSERT INTO expenses (user_id, category_id, amount, note, date) VALUES (?, ?, ?, ?, ?)",
      )
      .run(req.userId, category_id, amount, note, date);

    const expense = db
      .prepare(
        `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
         FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
         WHERE e.id = ?`,
      )
      .get(result.lastInsertRowid);

    res.status(201).json({ expense });
  }),
);

// Update expense
router.put(
  "/:id",
  [
    body("amount").isFloat({ min: 0.01 }).withMessage("金額必須大於 0"),
    body("category_id").isInt().withMessage("請選擇分類"),
    body("date").isDate().withMessage("請選擇日期"),
    body("note").optional().trim().isLength({ max: 200 }),
  ],
  validate,
  asyncHandler((req, res) => {
    const { amount, category_id, date, note = "" } = req.body;

    const existing = db
      .prepare("SELECT id FROM expenses WHERE id = ? AND user_id = ?")
      .get(+req.params.id, req.userId);
    if (!existing) return res.status(404).json({ message: "找不到該筆記錄" });

    db.prepare(
      "UPDATE expenses SET amount = ?, category_id = ?, date = ?, note = ? WHERE id = ? AND user_id = ?",
    ).run(amount, category_id, date, note, +req.params.id, req.userId);

    const expense = db
      .prepare(
        `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
         FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
         WHERE e.id = ?`,
      )
      .get(+req.params.id);

    res.json({ expense });
  }),
);

// Delete expense
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const existing = db
      .prepare("SELECT id FROM expenses WHERE id = ? AND user_id = ?")
      .get(+req.params.id, req.userId);
    if (!existing) return res.status(404).json({ message: "找不到該筆記錄" });

    db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(
      +req.params.id,
      req.userId,
    );
    res.json({ message: "已刪除" });
  }),
);

// Export CSV
router.get(
  "/export",
  asyncHandler((req, res) => {
    const { month } = req.query;
    let where = "WHERE e.user_id = ?";
    const params = [req.userId];

    if (month) {
      where += " AND strftime('%Y-%m', e.date) = ?";
      params.push(month);
    }

    const expenses = db
      .prepare(
        `SELECT e.date, c.name as category, e.amount, e.note
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       ${where}
       ORDER BY e.date DESC`,
      )
      .all(...params);

    const header = "日期,分類,金額,備註\n";
    const sanitize = (val) => {
      const s = String(val ?? "");
      // Prevent CSV injection: prefix formula-triggering chars with a single quote
      if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
      return s;
    };
    const csv =
      header +
      expenses
        .map(
          (e) =>
            `${e.date},${sanitize(e.category)},${e.amount},"${sanitize(e.note).replace(/"/g, '""')}"`,
        )
        .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=expenses-${month || "all"}.csv`,
    );
    res.send("\uFEFF" + csv);
  }),
);

export default router;
