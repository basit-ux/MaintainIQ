import asyncHandler from 'express-async-handler'
import prisma from '../config/prisma.js'
import { validateAssetInput, validateAssetDates } from '../validation/assetValidation.js'
import { generateAndStoreQr } from '../services/qrService.js'
import { uploadBufferToCloudinary } from '../services/cloudinaryService.js'
import { serializeAsset } from '../utils/serializers.js'

async function addHistory({ assetId, action, actorName, actorRole, relatedIssueId = null }) {
  return prisma.history.create({
    data: { assetId, action, actorName, actorRole, relatedIssueId, timestamp: new Date() },
  })
}

const technicianSelect = { id: true, name: true, email: true }

// @desc    List assets (supports search & filters)
// @route   GET /api/assets?search=&status=&category=
// @access  Private
export const getAssets = asyncHandler(async (req, res) => {
  const { search, status, category, location } = req.query
  const where = {}

  if (status) where.status = status
  if (category) where.category = category
  if (location) where.location = { contains: location }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { location: { contains: search } },
      { category: { contains: search } },
    ]
  }

  const assets = await prisma.asset.findMany({
    where,
    include: { assignedTechnician: { select: technicianSelect } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ ok: true, assets: assets.map(serializeAsset) })
})

// @desc    Get single asset by id
// @route   GET /api/assets/:id
// @access  Private
export const getAssetById = asyncHandler(async (req, res) => {
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: { assignedTechnician: { select: technicianSelect } },
  })
  if (!asset) {
    res.status(404)
    throw new Error('Asset not found.')
  }
  res.json({ ok: true, asset: serializeAsset(asset) })
})

// @desc    Get single asset by its human-readable code (for public QR page)
// @route   GET /api/assets/code/:code
// @access  Public
export const getAssetByCode = asyncHandler(async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase()
  const asset = await prisma.asset.findUnique({
    where: { code },
    include: { assignedTechnician: { select: technicianSelect } },
  })
  if (!asset) {
    res.status(404)
    throw new Error('Asset not found for this code.')
  }
  res.json({ ok: true, asset: serializeAsset(asset) })
})

// @desc    Create asset (also generates + stores QR code)
// @route   POST /api/assets
// @access  Private/Admin
export const createAsset = asyncHandler(async (req, res) => {
  const errors = validateAssetInput(req.body)
  if (errors.length) {
    res.status(400)
    throw new Error(errors.join(' '))
  }

  const code = req.body.code.trim().toUpperCase()
  const exists = await prisma.asset.findUnique({ where: { code } })
  if (exists) {
    res.status(400)
    throw new Error('An asset with this code already exists.')
  }

  let imageUrl = ''
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'maintainiq/assets')
    imageUrl = result.secure_url
  }

  let asset = await prisma.asset.create({
    data: {
      code,
      name: req.body.name.trim(),
      category: req.body.category || 'General',
      location: req.body.location || 'Unspecified',
      condition: req.body.condition || 'Good',
      status: 'Operational',
      lastServiceDate: req.body.lastServiceDate || null,
      nextServiceDate: req.body.nextServiceDate || null,
      assignedTechnicianId: req.body.assignedTechnician || null,
      imageUrl,
      createdById: req.user.id,
    },
  })

  const { qrCodeUrl } = await generateAndStoreQr(asset.code)
  asset = await prisma.asset.update({
    where: { id: asset.id },
    data: { qrCodeUrl },
    include: { assignedTechnician: { select: technicianSelect } },
  })

  await addHistory({
    assetId: asset.id,
    action: 'Asset registered',
    actorName: req.user.name,
    actorRole: req.user.role,
  })

  res.status(201).json({ ok: true, asset: serializeAsset(asset) })
})

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private/Admin
export const updateAsset = asyncHandler(async (req, res) => {
  const existing = await prisma.asset.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404)
    throw new Error('Asset not found.')
  }

  const dateErrors = validateAssetDates(req.body)
  if (dateErrors.length) {
    res.status(400)
    throw new Error(dateErrors.join(' '))
  }

  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'maintainiq/assets')
    req.body.imageUrl = result.secure_url
  }

  const allowedFields = [
    'name', 'category', 'location', 'condition', 'status',
    'lastServiceDate', 'nextServiceDate', 'imageUrl',
  ]
  const data = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) data[field] = req.body[field]
  }
  if (req.body.assignedTechnician !== undefined) {
    data.assignedTechnicianId = req.body.assignedTechnician || null
  }

  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data,
    include: { assignedTechnician: { select: technicianSelect } },
  })

  await addHistory({
    assetId: asset.id,
    action: 'Asset details updated',
    actorName: req.user.name,
    actorRole: req.user.role,
  })

  res.json({ ok: true, asset: serializeAsset(asset) })
})

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private/Admin
export const deleteAsset = asyncHandler(async (req, res) => {
  const existing = await prisma.asset.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404)
    throw new Error('Asset not found.')
  }
  await prisma.asset.delete({ where: { id: req.params.id } })
  res.json({ ok: true, message: 'Asset deleted.' })
})

// @desc    Dashboard stats
// @route   GET /api/assets/dashboard/stats
// @access  Private
export const getDashboardStats = asyncHandler(async (req, res) => {
  const openStatuses = ['Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts', 'Reopened']
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [totalAssets, operational, outOfService, openIssues, criticalOpen, resolvedIssues] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: 'Operational' } }),
    prisma.asset.count({ where: { status: 'Out of Service' } }),
    prisma.issue.count({ where: { status: { in: openStatuses } } }),
    prisma.issue.count({ where: { status: { in: openStatuses }, priority: 'Critical' } }),
    // `maintenance` is a JSON string column, so resolvedAt can't be
    // filtered in SQL - filter in JS instead.
    prisma.issue.findMany({ where: { status: { in: ['Resolved', 'Closed'] } }, select: { maintenance: true } }),
  ])

  const resolvedThisMonth = resolvedIssues.filter((i) => {
    if (!i.maintenance) return false
    try {
      const m = JSON.parse(i.maintenance)
      return m?.resolvedAt && new Date(m.resolvedAt) >= startOfMonth
    } catch {
      return false
    }
  }).length

  res.json({
    ok: true,
    stats: { totalAssets, operational, outOfService, openIssues, criticalOpen, resolvedThisMonth },
  })
})
