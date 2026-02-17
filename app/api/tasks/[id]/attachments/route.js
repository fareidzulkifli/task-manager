import { createServer } from '@/lib/supabase/server'
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, BUCKET_NAME } from '@/lib/s3'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', id)

    if (error) throw error

    // Generate presigned URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      data.map(async (attachment) => {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: attachment.r2_key,
        })
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
        return { ...attachment, url }
      })
    )

    return NextResponse.json(attachmentsWithUrls)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const body = await req.json()
    const { filename, r2_key, mime_type, size_bytes } = body

    if (!filename || !r2_key || !mime_type || !size_bytes) {
      return NextResponse.json({ error: 'Missing attachment data' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('task_attachments')
      .insert([{
        task_id: id,
        filename,
        r2_key,
        mime_type,
        size_bytes,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id: taskId } = await params
    const supabase = await createServer()
    
    const { searchParams } = new URL(req.url)
    const attachment_id = searchParams.get('attachment_id')

    if (!attachment_id) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
    }

    // 1. Get attachment info to know the R2 key
    const { data: attachment, error: fetchError } = await supabase
      .from('task_attachments')
      .select('r2_key')
      .eq('id', attachment_id)
      .single()

    if (fetchError) throw fetchError

    // 2. Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: attachment.r2_key,
    })
    await s3Client.send(deleteCommand)

    // 3. Delete from DB
    const { error: deleteError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachment_id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
