import express from 'express';
import multer from 'multer';
import {
  createProperty,
  getProperties,
  getProperty,
} from '../controllers/propertyControllers';
import { authMiddleware } from '../middleware/auth';

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE
      ? parseInt(process.env.MAX_FILE_SIZE)
      : 10 * 1024 * 1024,
  },
});

const router = express.Router();

// Property routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.post(
  '/',
  authMiddleware(['manager']),
  upload.array('photos'),
  createProperty,
);

export default router;
