import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, BUCKET_NAME } from '@/lib/s3'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req) {
  try {
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and content type are required' }, { status: 400 })
    }

    const fileExtension = filename.split('.').pop()
    const key = `uploads/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({ signedUrl, key })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
