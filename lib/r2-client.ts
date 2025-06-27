import { S3Client } from "@aws-sdk/client-s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export { r2Client }

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
  bucketName: string = process.env.CLOUDFLARE_R2_BUCKET_NAME! // default to main bucket
) {
  try {
    console.log(`🟦 Uploading to R2: ${bucketName}/${key}`)

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })

    const result = await r2Client.send(command)
    console.log(`✅ Uploaded: ${key} to ${bucketName}`)
    return result
  } catch (error) {
    console.error(`❌ R2 upload error for ${bucketName}/${key}:`, error)
    throw error
  }
}

export function getR2Url(key: string, customBaseUrl?: string) {
  const publicUrl = customBaseUrl || process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
  return `${publicUrl}/${key}`
}
