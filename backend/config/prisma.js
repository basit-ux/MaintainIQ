import { PrismaClient } from '@prisma/client'

// Single shared PrismaClient instance (recommended pattern for
// long-running Node processes; avoids exhausting SQLite connections
// during dev-server hot reloads).
const globalForPrisma = globalThis

const prisma =
  globalForPrisma.__maintainiqPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__maintainiqPrisma = prisma
}

export default prisma
