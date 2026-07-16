import dotenv from 'dotenv'
dotenv.config()

import http from 'http'
import app from './app.js'
import connectDB from './config/db.js'
import prisma from './config/prisma.js'
import { initSocket } from './socket/socketServer.js'

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()

  const server = http.createServer(app)
  initSocket(server)

  server.listen(PORT, () => {
    console.log(`MaintainIQ backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
  })

  const shutdown = async () => {
    console.log('\nShutting down gracefully...')
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
})
