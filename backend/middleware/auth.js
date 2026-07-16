import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import prisma from '../config/prisma.js'
import { toSafeUser } from '../utils/serializers.js'

// Verifies the JWT from the Authorization header and attaches req.user
export const protect = asyncHandler(async (req, res, next) => {
  let token

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token provided')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user) {
      res.status(401)
      throw new Error('Not authorized, user no longer exists')
    }
    // req.user carries the full row (minus password) for controllers,
    // plus toSafeObject() for compatibility with old Mongoose-style calls.
    req.user = { ...toSafeUser(user), toSafeObject() { return this } }
    next()
  } catch (err) {
    res.status(401)
    throw new Error('Not authorized, token invalid or expired')
  }
})

// Restricts a route to specific roles, e.g. authorize('admin')
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401)
    throw new Error('Not authorized')
  }
  if (!roles.includes(req.user.role)) {
    res.status(403)
    throw new Error(`Role "${req.user.role}" is not permitted to perform this action`)
  }
  next()
}
