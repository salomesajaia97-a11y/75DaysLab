import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadPhoto(
  buffer: Buffer,
  folder: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (err, result) => {
          if (err || !result) return reject(err)
          resolve({ url: result.secure_url, publicId: result.public_id })
        }
      )
      .end(buffer)
  })
}

/** Upload a GIF or Lottie JSON file to Cloudinary. */
export async function uploadFitnessMedia(
  buffer: Buffer,
  filename: string,
  folder = '75dayslab/fitness'
): Promise<{ url: string; publicId: string }> {
  const isJson = filename.toLowerCase().endsWith('.json')
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: isJson ? 'raw' : 'image',
          public_id: isJson ? filename.replace(/\.json$/i, '') : undefined,
          ...(isJson ? {} : { transformation: [{ quality: 'auto' }] }),
        },
        (err, result) => {
          if (err || !result) return reject(err)
          resolve({ url: result.secure_url, publicId: result.public_id })
        }
      )
      .end(buffer)
  })
}

export async function deleteFitnessMedia(publicId: string, isRaw = false): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: isRaw ? 'raw' : 'image',
  })
}
