import prisma from './prisma.js'

// Verifies the SQLite database (via Prisma) is reachable. SQLite is a
// local file, so this basically always succeeds as long as the file
// exists / migrations have been run - but we still fail fast with a
// clear message if something is wrong (e.g. migrations not applied yet).
export async function connectDB() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('SQLite (via Prisma) connected.')
  } catch (err) {
    console.error('\n[MaintainIQ] Database connection failed:', err.message)
    console.error('----------------------------------------------------------------')
    console.error('Checklist:')
    console.error('  1. Run "npx prisma migrate dev" in the backend folder to create')
    console.error('     the SQLite database file and apply migrations.')
    console.error('  2. Make sure DATABASE_URL is set in backend/.env, e.g.')
    console.error('     DATABASE_URL="file:./dev.db"')
    console.error('----------------------------------------------------------------\n')
    process.exit(1)
  }
}

export default connectDB
