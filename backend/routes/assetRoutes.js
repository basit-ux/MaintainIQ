import express from 'express'
import {
  getAssets,
  getAssetById,
  getAssetByCode,
  createAsset,
  updateAsset,
  deleteAsset,
  getDashboardStats,
} from '../controllers/assetController.js'
import { protect, authorize } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = express.Router()

// Public - used by the QR-scan public asset page
router.get('/code/:code', getAssetByCode)

router.get('/dashboard/stats', protect, getDashboardStats)

router.get('/', protect, getAssets)
router.post('/', protect, authorize('admin'), upload.single('image'), createAsset)

router.get('/:id', protect, getAssetById)
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateAsset)
router.delete('/:id', protect, authorize('admin'), deleteAsset)

export default router
