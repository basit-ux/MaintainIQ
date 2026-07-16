import asyncHandler from 'express-async-handler'
import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import { generateToken } from '../utils/generateToken.js'
import { validateSignup, validateLogin } from '../validation/authValidation.js'
import { toSafeUser } from '../utils/serializers.js'

// @desc    Register a new user (admin or technician)
// @route   POST /api/auth/signup
// @access  Public
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body
  const errors = validateSignup({ name, email, password, role })
  if (errors.length) {
    res.status(400)
    throw new Error(errors.join(' '))
  }

  const cleanEmail = email.trim().toLowerCase()
  const exists = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (exists) {
    res.status(400)
    throw new Error('An account with this email already exists.')
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role === 'technician' ? 'technician' : 'admin',
    },
  })

  const token = generateToken(user.id)
  res.status(201).json({ ok: true, user: toSafeUser(user), token })
})

// @desc    Log in
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const errors = validateLogin({ email, password })
  if (errors.length) {
    res.status(400)
    throw new Error(errors.join(' '))
  }

  const cleanEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401)
    throw new Error('Invalid email or password.')
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isOnline: true, lastSeen: new Date() },
  })

  const token = generateToken(updated.id)
  res.json({ ok: true, user: toSafeUser(updated), token })
})

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: req.user })
})

// @desc    Log out (mark offline)
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { isOnline: false, lastSeen: new Date() },
  })
  res.json({ ok: true })
})

// @desc    List all technicians (for assignment dropdowns)
// @route   GET /api/auth/technicians
// @access  Private
export const getTechnicians = asyncHandler(async (req, res) => {
  const technicians = await prisma.user.findMany({ where: { role: 'technician' } })
  res.json({ ok: true, technicians: technicians.map(toSafeUser) })
})
