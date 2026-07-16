import asyncHandler from 'express-async-handler'
import prisma from '../config/prisma.js'

const relatedIssueSelect = { select: { id: true, issueNumber: true, title: true } }

// @desc    Get all history (sorted newest first)
// @route   GET /api/history
// @access  Private
export const getHistory = asyncHandler(async (req, res) => {
  const history = await prisma.history.findMany({
    include: { relatedIssue: relatedIssueSelect },
    orderBy: { timestamp: 'desc' },
  })
  res.json({ ok: true, history })
})

// @desc    Get history for a specific asset
// @route   GET /api/history/asset/:assetId
// @access  Private
export const getHistoryForAsset = asyncHandler(async (req, res) => {
  const history = await prisma.history.findMany({
    where: { assetId: req.params.assetId },
    include: { relatedIssue: relatedIssueSelect },
    orderBy: { timestamp: 'desc' },
  })
  res.json({ ok: true, history })
})
