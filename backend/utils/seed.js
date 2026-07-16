// Seeds the database with demo users and assets, matching the original
// frontend mock data so the app behaves identically out of the box.
// Run with: npm run seed  (or automatically via `npx prisma migrate dev` -> prisma/seed.js)
import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import { generateAndStoreQr } from '../services/qrService.js'

async function seed() {
  console.log('Clearing existing data...')
  await prisma.message.deleteMany()
  await prisma.history.deleteMany()
  await prisma.issue.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.user.deleteMany()

  console.log('Creating users...')
  const admin = await prisma.user.create({
    data: {
      name: 'Basit khan Admin',
      email: 'admin@maintainiq.app',
      password: await bcrypt.hash('Admin@123', 10),
      role: 'admin',
    },
  })
  const tech = await prisma.user.create({
    data: {
      name: 'Bilal Technician',
      email: 'tech@maintainiq.app',
      password: await bcrypt.hash('Tech@123', 10),
      role: 'technician',
      assignedAdminId: admin.id,
    },
  })

  console.log('Creating demo assets...')
  const now = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return iso(d) }
  const daysAhead = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return iso(d) }

  const seedAssets = [
    { code: 'PROJ-CR01', name: 'Classroom Projector 01', category: 'Electronics', location: 'Building A - Room 101', condition: 'Good', lastServiceDate: daysAgo(40), nextServiceDate: daysAhead(50) },
    { code: 'AC-LAB02', name: 'Lab Split AC Unit', category: 'HVAC', location: 'Building B - Lab 2', condition: 'Fair', lastServiceDate: daysAgo(20), nextServiceDate: daysAhead(70) },
    { code: 'PMP-WT03', name: 'Water Supply Pump', category: 'Plumbing', location: 'Utility Block', condition: 'Good', lastServiceDate: daysAgo(15), nextServiceDate: daysAhead(75) },
    { code: 'GEN-PWR1', name: 'Backup Generator', category: 'Electrical', location: 'Power House', condition: 'Fair', lastServiceDate: daysAgo(60), nextServiceDate: daysAhead(30) },
    { code: 'LIFT-M01', name: 'Passenger Elevator', category: 'Mechanical', location: 'Main Block', condition: 'Good', lastServiceDate: daysAgo(10), nextServiceDate: daysAhead(80) },
  ]

  for (const a of seedAssets) {
    let asset = await prisma.asset.create({ data: { ...a, status: 'Operational', createdById: admin.id } })
    try {
      const { qrCodeUrl } = await generateAndStoreQr(asset.code)
      asset = await prisma.asset.update({ where: { id: asset.id }, data: { qrCodeUrl } })
    } catch (err) {
      console.warn(`QR generation skipped for ${asset.code}:`, err.message)
    }
    await prisma.history.create({
      data: {
        assetId: asset.id,
        action: 'Asset registered',
        actorName: admin.name,
        actorRole: admin.role,
        timestamp: asset.createdAt,
      },
    })
  }

  console.log('Seed complete.')
  console.log('---------------------------------------------')
  console.log('Admin login:      admin@maintainiq.app / Admin@123')
  console.log('Technician login: tech@maintainiq.app  / Tech@123')
  console.log('---------------------------------------------')
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
