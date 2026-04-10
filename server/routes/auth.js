import { Router } from "express";
import { body } from "express-validator";
import bcrypt from "bcryptjs";
import db from "../db/init.js";
import { generateToken, authMiddleware } from "../middleware/auth.js";
import { validate, asyncHandler } from "../middleware/validate.js";

const router = Router();

router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage("使用者名稱需 2-20 個字元"),
    body("email").isEmail().normalizeEmail().withMessage("請輸入有效的 Email"),
    body("password").isLength({ min: 6 }).withMessage("密碼至少 6 個字元"),
  ],
  validate,
  asyncHandler((req, res) => {
    const { username, email, password } = req.body;

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
      .get(email, username);
    if (existing) {
      return res.status(409).json({ message: "使用者名稱或 Email 已被使用" });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = db
      .prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
      .run(username, email, hashed);

    const token = generateToken(result.lastInsertRowid);
    res.status(201).json({
      token,
      user: { id: result.lastInsertRowid, username, email },
    });
  }),
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("請輸入有效的 Email"),
    body("password").notEmpty().withMessage("請輸入密碼"),
  ],
  validate,
  asyncHandler((req, res) => {
    const { email, password } = req.body;

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Email 或密碼錯誤" });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  }),
);

router.get(
  "/me",
  authMiddleware,
  asyncHandler((req, res) => {
    const user = db
      .prepare("SELECT id, username, email, created_at FROM users WHERE id = ?")
      .get(req.userId);
    if (!user) return res.status(404).json({ message: "使用者不存在" });
    res.json({ user });
  }),
);

export default router;
