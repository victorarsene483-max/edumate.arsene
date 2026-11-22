import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  listTimetable,
  createEntry,
  updateEntry,
  deleteEntry,
} from "../controllers/timetableController.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", listTimetable);
router.post("/", createEntry);
router.patch("/:id", updateEntry);
router.delete("/:id", deleteEntry);

export default router;