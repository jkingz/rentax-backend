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
      : 50 * 1024 * 1024,
  },
}).array('photos', 5);

const router = express.Router();

// Property routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.post('/', authMiddleware(['manager']), (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'File size cannot exceed 25MB',
        });
      }
      return res.status(400).json({
        error: err.message,
      });
    } else if (err) {
      return res.status(500).json({
        error: 'File upload failed',
        message: err.message,
      });
    }
    createProperty(req, res);
  });
});

export default router;
