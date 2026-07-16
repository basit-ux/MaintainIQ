import cloudinary from '../config/cloudinary.js'

// Uploads a buffer (from multer memoryStorage) to Cloudinary via upload_stream.
export function uploadBufferToCloudinary(buffer, folder = 'maintainiq') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )
    stream.end(buffer)
  })
}

// Uploads a base64 data URI (used for QR code images generated server-side).
export function uploadDataUriToCloudinary(dataUri, folder = 'maintainiq/qrcodes') {
  return cloudinary.uploader.upload(dataUri, { folder, resource_type: 'image' })
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message)
  }
}
