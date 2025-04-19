import express from 'express';
import {
  getProperty,
  getProperties,
  createProperty,
} from '../controllers/propertyControllers';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// Property routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.post('/', authMiddleware(['manager']), upload.array("photos"), createProperty);


export default router;
