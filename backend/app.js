import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/authRoutes.js'
import assetRoutes from './routes/assetRoutes.js'
import issueRoutes from './routes/issueRoutes.js'
import historyRoutes from './routes/historyRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)



app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 MaintainIQ Backend Running',
    version: '1.0.0'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/chat', chatRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
