import express from "express";
import cors from "cors";
import pool from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import semesterRoutes from "./routes/semesterRoutes.js";
import unitRoutes from "./routes/unitRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import studySessionRoutes from "./routes/studySessionRoutes.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(503).json({ status: "error" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/study-sessions", studySessionRoutes);

export default app;