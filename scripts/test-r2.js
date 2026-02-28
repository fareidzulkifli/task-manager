require('dotenv').config({ path: '.env.local' })

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3')

const endpoint = process.env.R2_ENDPOINT
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET_NAME

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  console.error('Missing R2 env vars. Check .env.local')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
})

async function run() {
  console.log(`Endpoint : ${endpoint}`)
  console.log(`Bucket   : ${bucket}`)
  console.log(`Key ID   : ${accessKeyId}\n`)

  // 1. Check bucket access
  console.log('1. Checking bucket access...')
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log('   Bucket reachable.\n')
  } catch (err) {
    console.error('   Bucket check failed:', err.message)
    process.exit(1)
  }

  // 2. Upload a small test file
  const key = `test/r2-test-${Date.now()}.txt`
  console.log(`2. Uploading test object: ${key}`)
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: 'R2 upload test',
      ContentType: 'text/plain',
    }))
    console.log('   Upload successful.\n')
  } catch (err) {
    console.error('   Upload failed:', err.message)
    process.exit(1)
  }

  // 3. Clean up
  console.log('3. Deleting test object...')
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    console.log('   Deleted.\n')
  } catch (err) {
    console.warn('   Delete failed (non-fatal):', err.message)
  }

  console.log('R2 integration OK.')
}

run()
