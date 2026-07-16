import asyncHandler from 'express-async-handler'
import prisma from '../config/prisma.js'
import { validateIssueInput, validateMaintenanceExtra } from '../validation/issueValidation.js'
import { canTransitionIssue, ASSET_STATUS_MAP } from '../utils/issueStateMachine.js'
import { nextIssueNumber } from '../utils/idGenerator.js'
import { runAiTriage } from '../services/aiTriageService.js'
import { uploadBufferToCloudinary } from '../services/cloudinaryService.js'
import { serializeIssue } from '../utils/serializers.js'

const technicianSelect = { id: true, name: true, email: true }

async function addHistory({ assetId, action, actorName, actorRole, relatedIssueId = null }) {
  return prisma.history.create({
    data: { assetId, action, actorName, actorRole, relatedIssueId, timestamp: new Date() },
  })
}

async function setAssetStatus(assetId, status, extra = {}) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!asset) return null
  return prisma.asset.update({ where: { id: assetId }, data: { status, ...extra } })
}

const issueInclude = {
  assignedTechnician: { select: technicianSelect },
}

// @desc    List issues (supports search & filters)
// @route   GET /api/issues?search=&status=&priority=&assetId=
// @access  Private
export const getIssues = asyncHandler(async (req, res) => {
  const { search, status, priority, assetId, assignedTechnicianId } = req.query
  const where = {}

  if (status) where.status = status
  if (priority) where.priority = priority
  if (assetId) where.assetId = assetId
  if (assignedTechnicianId) where.assignedTechnicianId = assignedTechnicianId

  // Technicians only ever see issues assigned to them.
  if (req.user.role === 'technician') {
    where.assignedTechnicianId = req.user.id
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { issueNumber: { contains: search } },
    ]
  }

  const issues = await prisma.issue.findMany({
    where,
    include: {
      ...issueInclude,
      asset: { select: { id: true, code: true, name: true, location: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ ok: true, issues: issues.map(serializeIssue) })
})

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Private
export const getIssueById = asyncHandler(async (req, res) => {
  const issue = await prisma.issue.findUnique({
    where: { id: req.params.id },
    include: {
      ...issueInclude,
      asset: { include: { assignedTechnician: { select: technicianSelect } } },
    },
  })
  if (!issue) {
    res.status(404)
    throw new Error('Issue not found.')
  }
  res.json({ ok: true, issue: serializeIssue(issue) })
})

// @desc    Get issues for a given asset
// @route   GET /api/issues/asset/:assetId
// @access  Private
export const getIssuesForAsset = asyncHandler(async (req, res) => {
  const issues = await prisma.issue.findMany({
    where: { assetId: req.params.assetId },
    include: issueInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ ok: true, issues: issues.map(serializeIssue) })
})

// @desc    Report a new issue (public - via QR page, or authenticated)
// @route   POST /api/issues
// @access  Public
export const createIssue = asyncHandler(async (req, res) => {
  const errors = validateIssueInput(req.body)
  if (errors.length) {
    res.status(400)
    throw new Error(errors.join(' '))
  }

  const asset = await prisma.asset.findUnique({ where: { id: req.body.assetId } })
  if (!asset) {
    res.status(404)
    throw new Error('Asset not found.')
  }
  if (asset.status === 'Retired') {
    res.status(400)
    throw new Error('This asset is retired and cannot receive new issues.')
  }

  let photoUrl = ''
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'maintainiq/issues')
    photoUrl = result.secure_url
  }

  const issueNumber = await nextIssueNumber()
  const aiSuggested = req.body.aiSuggested
    ? JSON.parse(typeof req.body.aiSuggested === 'string' ? req.body.aiSuggested : JSON.stringify(req.body.aiSuggested))
    : null

  const issue = await prisma.issue.create({
    data: {
      issueNumber,
      assetId: asset.id,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      category: req.body.category || 'General',
      priority: req.body.priority || 'Medium',
      reporterName: req.body.reporterName?.trim() || 'Anonymous',
      reporterContact: req.body.reporterContact || '',
      photoUrl,
      status: 'Reported',
      aiSuggested: aiSuggested ? JSON.stringify(aiSuggested) : null,
      aiEdited: !!req.body.aiEdited,
    },
  })

  await setAssetStatus(asset.id, 'Issue Reported')
  await addHistory({
    assetId: asset.id,
    action: `Issue ${issue.issueNumber} reported: "${issue.title}"`,
    actorName: issue.reporterName,
    actorRole: 'reporter',
    relatedIssueId: issue.id,
  })

  res.status(201).json({ ok: true, issue: serializeIssue(issue) })
})

// @desc    Run AI triage over a complaint (does not create the issue yet)
// @route   POST /api/issues/ai-triage
// @access  Public
export const aiTriage = asyncHandler(async (req, res) => {
  const { complaint, assetId } = req.body
  if (!complaint) {
    res.status(400)
    throw new Error('Complaint text is required.')
  }

  let asset = null
  if (assetId) {
    asset = await prisma.asset.findUnique({ where: { id: assetId } })
  }

  try {
    const result = await runAiTriage({ complaint, asset })
    res.json({ ok: true, result })
  } catch (err) {
    res.status(err.statusCode || 500)
    throw err
  }
})

// @desc    Assign issue to a technician
// @route   PUT /api/issues/:id/assign
// @access  Private/Admin
export const assignIssue = asyncHandler(async (req, res) => {
  const { technicianId } = req.body
  if (!technicianId) {
    res.status(400)
    throw new Error('technicianId is required.')
  }

  const issue = await prisma.issue.findUnique({ where: { id: req.params.id } })
  if (!issue) {
    res.status(404)
    throw new Error('Issue not found.')
  }

  if (!canTransitionIssue(issue.status, 'Assigned') && issue.status !== 'Reopened') {
    res.status(400)
    throw new Error(`Cannot assign an issue in "${issue.status}" status.`)
  }

  const technician = await prisma.user.findFirst({ where: { id: technicianId, role: 'technician' } })
  if (!technician) {
    res.status(404)
    throw new Error('Technician not found.')
  }

  const updated = await prisma.issue.update({
    where: { id: issue.id },
    data: { assignedTechnicianId: technician.id, status: 'Assigned' },
    include: issueInclude,
  })

  await addHistory({
    assetId: issue.assetId,
    action: `Issue ${issue.issueNumber} assigned to ${technician.name}`,
    actorName: req.user.name,
    actorRole: req.user.role,
    relatedIssueId: issue.id,
  })

  res.json({ ok: true, issue: serializeIssue(updated) })
})

// @desc    Update issue status (drives the maintenance workflow)
// @route   PUT /api/issues/:id/status
// @access  Private
export const updateIssueStatus = asyncHandler(async (req, res) => {
  const { status: newStatus, maintenanceNote, partsUsed, cost, timeSpentHours, finalCondition, evidenceNote, nextServiceDate, markOutOfService } = req.body

  const issue = await prisma.issue.findUnique({ where: { id: req.params.id } })
  if (!issue) {
    res.status(404)
    throw new Error('Issue not found.')
  }

  const currentMaintenance = issue.maintenance ? JSON.parse(issue.maintenance) : null

  if (issue.status === 'Closed' && newStatus !== 'Reopened') {
    res.status(400)
    throw new Error('A closed issue cannot be edited until it is reopened.')
  }
  if (!canTransitionIssue(issue.status, newStatus)) {
    res.status(400)
    throw new Error(`Cannot move issue from "${issue.status}" to "${newStatus}".`)
  }
  if (newStatus === 'Resolved' && !maintenanceNote && !currentMaintenance?.notes) {
    res.status(400)
    throw new Error('An issue cannot be resolved without a maintenance note.')
  }

  const extraErrors = validateMaintenanceExtra({ cost })
  if (extraErrors.length) {
    res.status(400)
    throw new Error(extraErrors.join(' '))
  }

  let evidencePhotoUrl = currentMaintenance?.evidencePhotoUrl || ''
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'maintainiq/maintenance')
    evidencePhotoUrl = result.secure_url
  }

  const prevStatus = issue.status
  const data = { status: newStatus }

  if (maintenanceNote || newStatus === 'Resolved') {
    data.maintenance = JSON.stringify({
      notes: maintenanceNote ?? currentMaintenance?.notes ?? '',
      partsUsed: partsUsed ?? currentMaintenance?.partsUsed ?? '',
      cost: cost !== undefined ? Number(cost) : currentMaintenance?.cost ?? 0,
      timeSpentHours: timeSpentHours ?? currentMaintenance?.timeSpentHours ?? '',
      finalCondition: finalCondition ?? currentMaintenance?.finalCondition ?? '',
      evidenceNote: evidenceNote ?? currentMaintenance?.evidenceNote ?? '',
      evidencePhotoUrl,
      resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : currentMaintenance?.resolvedAt || null,
    })
  }

  const updated = await prisma.issue.update({
    where: { id: issue.id },
    data,
    include: issueInclude,
  })

  // Sync the parent asset's status.
  if (ASSET_STATUS_MAP[newStatus]) {
    const patch = { status: ASSET_STATUS_MAP[newStatus] }
    if (newStatus === 'Resolved') {
      patch.lastServiceDate = new Date().toISOString().slice(0, 10)
      if (nextServiceDate) patch.nextServiceDate = nextServiceDate
    }
    const { status: patchStatus, ...rest } = patch
    await setAssetStatus(issue.assetId, patchStatus, rest)
  }
  if (markOutOfService) {
    await setAssetStatus(issue.assetId, 'Out of Service')
  }

  await addHistory({
    assetId: issue.assetId,
    action: `Issue ${issue.issueNumber} moved from "${prevStatus}" to "${newStatus}"`,
    actorName: req.user.name,
    actorRole: req.user.role,
    relatedIssueId: issue.id,
  })

  res.json({ ok: true, issue: serializeIssue(updated) })
})
