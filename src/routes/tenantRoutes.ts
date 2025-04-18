import express from 'express';
import {
  createTenant,
  // deleteTenant,
  getTenant,
  // updateTenant,
} from '../controllers/tenantControllers';

const router = express.Router();
router.get('/:cognitoId', getTenant);
router.post('/', createTenant);
// router.put('/:cognitoId', updateTenant);
// router.delete('/:cognitoId', deleteTenant);

export default router;
