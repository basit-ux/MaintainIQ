import express from 'express'
import { signup, login, getMe, logout, getTechnicians } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', protect, getMe)
router.post('/logout', protect, logout)
router.get('/technicians', protect, getTechnicians)

export default router
