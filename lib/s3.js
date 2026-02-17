import { S3Client } from '@aws-sdk/client-s3'

const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const r2Endpoint = process.env.R2_ENDPOINT
const r2BucketName = process.env.R2_BUCKET_NAME

if (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint) {
  console.warn('R2 credentials or endpoint missing. Check your environment variables.')
}

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
})

export const BUCKET_NAME = r2BucketName
