import { NextResponse } from 'next/server'

const OWNER = 'fareidzulkifli'
const REPO = 'BA-notes'

const CONTENT_TYPES = {
  pdf:  'application/pdf',
  md:   'text/plain; charset=utf-8',
  txt:  'text/plain; charset=utf-8',
  js:   'text/plain; charset=utf-8',
  ts:   'text/plain; charset=utf-8',
  py:   'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  html: 'text/html; charset=utf-8',
  css:  'text/css; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc:  'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlxs: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  svg:  'image/svg+xml',
  ico:  'image/x-icon',
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath || filePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const pat = process.env.GITHUB_PAT
  if (!pat) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 })
  }

  const branch = process.env.GITHUB_BRANCH || 'main'
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/${filePath}`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!res.ok) {
      console.error('GitHub raw fetch error:', res.status, url)
      return NextResponse.json({ error: `File not found (${res.status})` }, { status: res.status })
    }

    const filename = filePath.split('/').pop() || ''
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'md'
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

    return new Response(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    console.error('gitnote/raw error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
