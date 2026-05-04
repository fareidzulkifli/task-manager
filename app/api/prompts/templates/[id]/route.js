import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return []
  return tags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

const sanitizePromptPatch = (body) => {
  const data = {}

  if (body.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw new Error('Prompt title is required')
    data.title = title
  }

  if (body.body !== undefined) {
    const promptBody = body.body?.trim()
    if (!promptBody) throw new Error('Prompt body is required')
    data.body = promptBody
  }

  if (body.description !== undefined) {
    data.description = body.description?.trim() || null
  }

  if (body.category !== undefined) {
    data.category = body.category?.trim() || 'General'
  }

  if (body.tags !== undefined) {
    data.tags = normalizeTags(body.tags)
  }

  if (body.is_favorite !== undefined) {
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

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()

    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const body = await req.json()
    const promptData = sanitizePromptPatch(body)

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(promptData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
