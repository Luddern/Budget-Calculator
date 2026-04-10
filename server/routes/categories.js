import { Router } from "express";
import { body } from "express-validator";
import db from "../db/init.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate, asyncHandler } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);

// Get categories (default + user-created)
router.get(
  "/",
  asyncHandler((req, res) => {
    const categories = db
      .prepare(
        "SELECT * FROM categories WHERE is_default = 1 OR user_id = ? ORDER BY is_default DESC, id ASC",
      )
      .all(req.userId);
    res.json({ categories });
  }),
);

// Create custom category
router.post(
  "/",
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage("分類名稱需 1-20 個字元"),
    body("icon").optional().trim().isLength({ max: 10 }),
    body("color")
      .optional()
      .matches(/^#[0-9a-fA-F]{6}$/)
      .withMessage("顏色格式錯誤"),
  ],
  validate,
  asyncHandler((req, res) => {
    const { name, icon = "📁", color = "#6b7280" } = req.body;

    // Limit custom categories per user
    const count = db
      .prepare("SELECT COUNT(*) as cnt FROM categories WHERE user_id = ?")
      .get(req.userId).cnt;
    if (count >= 20) {
      return res.status(400).json({ message: "自訂分類上限為 20 個" });
    }

    const result = db
      .prepare(
        "INSERT INTO categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)",
      )
      .run(name.trim(), icon, color, req.userId);

    const category = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json({ category });
  }),
);

// Delete custom category (only user-created)
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const category = db
      .prepare(
        "SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_default = 0",
      )
      .get(+req.params.id, req.userId);
    if (!category) {
      return res.status(404).json({ message: "無法刪除此分類" });
    }

    // Move expenses to "其他" category
    const otherCat = db
      .prepare(
        "SELECT id FROM categories WHERE name = '其他' AND is_default = 1",
      )
      .get();
    if (otherCat) {
      db.prepare(
        "UPDATE expenses SET category_id = ? WHERE category_id = ? AND user_id = ?",
      ).run(otherCat.id, +req.params.id, req.userId);
    }

    db.prepare("DELETE FROM categories WHERE id = ?").run(+req.params.id);
    res.json({ message: "已刪除" });
  }),
);

export default router;
