import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getActive,
  startSession,
  stopSession,
  deleteSession,
  getStats,
} from "../controllers/studySessionController.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/active", getActive);
router.get("/stats", getStats);
router.post("/start", startSession);
router.post("/stop", stopSession);
router.delete("/:id", deleteSession);

export default router;