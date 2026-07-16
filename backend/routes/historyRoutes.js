import express from 'express'
import { getHistory, getHistoryForAsset } from '../controllers/historyController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getHistory)
router.get('/asset/:assetId', protect, getHistoryForAsset)

export default router
