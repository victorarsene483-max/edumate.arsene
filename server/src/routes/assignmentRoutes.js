import express from 'express';
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignmentController.js";
import authMiddleware from "../Middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);
router.get('/',listAssignments);
router.post('/',createAssignment);
router.patch('/:id',updateAssignment);
router.delete('/:id',deleteAssignment);
export default router;