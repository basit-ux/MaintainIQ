import prisma from '../config/prisma.js'

// Generates the next sequential issue number, e.g. ISS-0001, ISS-0002...
export async function nextIssueNumber() {
  const count = await prisma.issue.count()
  return `ISS-${String(count + 1).padStart(4, '0')}`
}
