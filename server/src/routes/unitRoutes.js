import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { listUnits, createUnit, updateUnit, deleteUnit } from '../controllers/unitController.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', listUnits);
router.post('/', createUnit);
router.patch('/:id', updateUnit);
router.delete('/:id', deleteUnit);

export default router;