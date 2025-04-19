import express from 'express';
import {
  createManager,
  getManager,
  getManagerProperties,
  updateManager,
} from '../controllers/managerControllers';

const router = express.Router();
router.get('/:cognitoId', getManager);
router.post('/', createManager);
router.put('/:cognitoId', updateManager);
router.get('/:cognitoId/properties', getManagerProperties);


export default router;
