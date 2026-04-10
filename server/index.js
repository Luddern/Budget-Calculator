import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import expenseRoutes from "./routes/expenses.js";
import categoryRoutes from "./routes/categories.js";
import budgetRoutes from "./routes/budgets.js";
import reportRoutes from "./routes/reports.js";

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:4173"];

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === "production" ? "伺服器錯誤" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
