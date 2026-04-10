import { Router } from "express";
import db from "../db/init.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);

const MONTH_RE = /^\d{4}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;

// Monthly summary
router.get(
  "/monthly",
  asyncHandler((req, res) => {
    const { month } = req.query;
    if (!month || !MONTH_RE.test(month))
      return res.status(400).json({ message: "月份格式錯誤 (YYYY-MM)" });

    // By category (includes total spent & count info)
    const byCategory = db
      .prepare(
        `SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as count
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
       GROUP BY c.id
       ORDER BY total DESC`,
      )
      .all(req.userId, month);

    // Derive totals from byCategory to avoid redundant queries
    const totalSpent = byCategory.reduce((sum, c) => sum + c.total, 0);
    const transactionCount = byCategory.reduce((sum, c) => sum + c.count, 0);

    // Daily totals for the month
    const daily = db
      .prepare(
        `SELECT date, SUM(amount) as total
       FROM expenses
       WHERE user_id = ? AND strftime('%Y-%m', date) = ?
       GROUP BY date
       ORDER BY date ASC`,
      )
      .all(req.userId, month);

    res.json({ totalSpent, byCategory, daily, transactionCount });
  }),
);

// Yearly trend (monthly totals for a year)
router.get(
  "/yearly",
  asyncHandler((req, res) => {
    const { year } = req.query;
    if (!year || !YEAR_RE.test(year))
      return res.status(400).json({ message: "年份格式錯誤 (YYYY)" });

    const monthly = db
      .prepare(
        `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
       FROM expenses
       WHERE user_id = ? AND strftime('%Y', date) = ?
       GROUP BY month
       ORDER BY month ASC`,
      )
      .all(req.userId, year);

    res.json({ monthly });
  }),
);

export default router;
