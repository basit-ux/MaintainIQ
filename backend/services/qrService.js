import QRCode from 'qrcode'
import { uploadDataUriToCloudinary } from './cloudinaryService.js'

// Builds the public asset URL that the QR code will point to.
export function buildPublicAssetUrl(code) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173'
  return `${base}/#/asset/${encodeURIComponent(code)}`
}

// Generates a QR code PNG (as a data URI), uploads it to Cloudinary, and
// returns the hosted image URL. Falls back to returning the raw data URI if
// Cloudinary isn't configured, so the feature still works without it.
export async function generateAndStoreQr(assetCode) {
  const targetUrl = buildPublicAssetUrl(assetCode)
  const dataUri = await QRCode.toDataURL(targetUrl, { width: 400, margin: 2 })

  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'

  if (!hasCloudinary) {
    return { qrCodeUrl: dataUri, targetUrl }
  }

  try {
    const result = await uploadDataUriToCloudinary(dataUri, 'maintainiq/qrcodes')
    return { qrCodeUrl: result.secure_url, targetUrl }
  } catch (err) {
    console.error('QR Cloudinary upload failed, falling back to data URI:', err.message)
    return { qrCodeUrl: dataUri, targetUrl }
  }
}
