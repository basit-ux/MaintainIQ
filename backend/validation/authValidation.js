import validator from 'validator'

export function validateSignup({ name, email, password, role }) {
  const errors = []
  if (!name || !name.trim()) errors.push('Name is required.')
  if (!email || !validator.isEmail(email)) errors.push('Enter a valid email address.')
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters.')
  if (role && !['admin', 'technician'].includes(role)) errors.push('Role must be admin or technician.')
  return errors
}

export function validateLogin({ email, password }) {
  const errors = []
  if (!email || !validator.isEmail(email)) errors.push('Enter a valid email address.')
  if (!password) errors.push('Password is required.')
  return errors
}
