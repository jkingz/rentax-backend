import express from 'express';
import {
  createApplication,
  listApplications,
  updateApplicationStatus,
} from '../controllers/applicationControllers';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/', authMiddleware(['tenant']), createApplication);
router.put('/:id/status', authMiddleware(['manager']), updateApplicationStatus);
router.get('/', authMiddleware(['manager', 'tenant']), listApplications);

export default router;
