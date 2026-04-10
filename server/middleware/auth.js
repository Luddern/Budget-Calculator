import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "expense-tracker-secret-key-change-in-production";

if (
  process.env.NODE_ENV === "production" &&
  JWT_SECRET === "expense-tracker-secret-key-change-in-production"
) {
  console.error(
    "⚠️  JWT_SECRET 未設定！請在 .env 中設定 JWT_SECRET 以確保安全。",
  );
  process.exit(1);
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "請先登入" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "登入已過期，請重新登入" });
  }
}
