import express from 'express'
import {
  getIssues,
  getIssueById,
  getIssuesForAsset,
  createIssue,
  aiTriage,
  assignIssue,
  updateIssueStatus,
} from '../controllers/issueController.js'
import { protect, authorize } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = express.Router()

// Public - reporting an issue and running AI triage happen from the
// public QR-scan asset page, before any login.
router.post('/ai-triage', aiTriage)
router.post('/', upload.single('photo'), createIssue)

router.get('/asset/:assetId', protect, getIssuesForAsset)
router.get('/', protect, getIssues)
router.get('/:id', protect, getIssueById)

router.put('/:id/assign', protect, authorize('admin'), assignIssue)
router.put('/:id/status', protect, upload.single('evidencePhoto'), updateIssueStatus)

export default router
