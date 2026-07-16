export function notFound(req, res, next) {
  res.status(404)
  next(new Error(`Route not found - ${req.originalUrl}`))
}

// Centralized error handler. Any thrown error / rejected promise inside an
// asyncHandler-wrapped controller lands here.
export function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500
  let message = err.message || 'Internal server error'

  // Prisma: record not found (e.g. .update()/.delete() on a missing row)
  if (err.code === 'P2025') {
    statusCode = 404
    message = 'Resource not found'
  }

  // Prisma: unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 400
    const field = Array.isArray(err.meta?.target) ? err.meta.target[0] : err.meta?.target
    message = `Duplicate value for field "${field || 'unknown'}".`
  }

  // Prisma: foreign key constraint violation (e.g. referencing a deleted asset)
  if (err.code === 'P2003') {
    statusCode = 400
    message = 'Related record not found (invalid reference).'
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired, please log in again'
  }

  res.status(statusCode).json({
    ok: false,
    error: message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}
