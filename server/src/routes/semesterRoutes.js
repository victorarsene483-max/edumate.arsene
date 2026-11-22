import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { listSemesters, createSemester } from '../controllers/semesterController.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', listSemesters);
router.post('/', createSemester);

export default router;