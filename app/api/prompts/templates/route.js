import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return []
  return tags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

const sanitizePrompt = (body, { partial = false } = {}) => {
  const data = {}

  if (!partial || body.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw new Error('Prompt title is required')
    data.title = title
  }

  if (!partial || body.body !== undefined) {
    const promptBody = body.body?.trim()
    if (!promptBody) throw new Error('Prompt body is required')
    data.body = promptBody
  }

  if (!partial || body.description !== undefined) {
    data.description = body.description?.trim() || null
  }

  if (!partial || body.category !== undefined) {
    data.category = body.category?.trim() || 'General'
  }

  if (!partial || body.tags !== undefined) {
    data.tags = normalizeTags(body.tags)
  }

  if (!partial || body.is_favorite !== undefined) {
    data.is_favorite = !!body.is_favorite
  }

  if (body.archived === true) {
    data.archived_at = new Date().toISOString()
  } else if (body.archived === false) {
    data.archived_at = null
  }

  data.updated_at = new Date().toISOString()
  return data
}

export async function GET(req) {
  try {
    const supabase = await createServer()
    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get('include_archived') === 'true'

    let query = supabase
      .from('prompt_templates')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false })

    if (!includeArchived) {
      query = query.is('archived_at', null)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const supabase = await createServer()
    const body = await req.json()
    const promptData = sanitizePrompt(body)

    const { data, error } = await supabase
      .from('prompt_templates')
      .insert([promptData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
