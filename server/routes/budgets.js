import { Router } from "express";
import { body } from "express-validator";
import db from "../db/init.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate, asyncHandler } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);

const MONTH_RE = /^\d{4}-\d{2}$/;

// Get budgets for a month
router.get(
  "/",
  asyncHandler((req, res) => {
    const { month } = req.query;
    if (!month || !MONTH_RE.test(month))
      return res.status(400).json({ message: "月份格式錯誤 (YYYY-MM)" });

    // Get all budgets with category info
    const budgets = db
      .prepare(
        `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ?`,
      )
      .all(req.userId, month);

    // Batch query: get all category spent amounts in one query
    const spentByCategory = db
      .prepare(
        `SELECT category_id, COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = ? AND strftime('%Y-%m', date) = ?
       GROUP BY category_id`,
      )
      .all(req.userId, month);

    const spentMap = Object.fromEntries(
      spentByCategory.map((s) => [s.category_id, s.total]),
    );
    const totalSpent = spentByCategory.reduce((sum, s) => sum + s.total, 0);

    const result = budgets.map((b) => ({
      ...b,
      spent: b.category_id ? spentMap[b.category_id] || 0 : totalSpent,
    }));

    res.json({ budgets: result });
  }),
);

// Set/update budget
router.post(
  "/",
  [
    body("amount").isFloat({ min: 0 }).withMessage("預算金額必須 >= 0"),
    body("month")
      .matches(/^\d{4}-\d{2}$/)
      .withMessage("月份格式錯誤"),
    body("category_id").optional({ nullable: true }).isInt(),
  ],
  validate,
  asyncHandler((req, res) => {
    const { amount, month, category_id = null } = req.body;

    const existing = db
      .prepare(
        "SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category_id IS ?",
      )
      .get(req.userId, month, category_id);

    if (existing) {
      db.prepare("UPDATE budgets SET amount = ? WHERE id = ?").run(
        amount,
        existing.id,
      );
    } else {
      db.prepare(
        "INSERT INTO budgets (user_id, category_id, amount, month) VALUES (?, ?, ?, ?)",
      ).run(req.userId, category_id, amount, month);
    }

    res.json({ message: "預算已更新" });
  }),
);

// Delete budget
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    db.prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").run(
      +req.params.id,
      req.userId,
    );
    res.json({ message: "已刪除" });
  }),
);

export default router;
