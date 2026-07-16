import express from 'express'
import { getContacts, getMessages, sendMessage } from '../controllers/chatController.js'
import { protect } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = express.Router()

router.get('/contacts', protect, getContacts)
router.get('/messages/:userId', protect, getMessages)
router.post('/messages/:userId', protect, upload.single('image'), sendMessage)

export default router
