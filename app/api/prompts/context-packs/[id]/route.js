import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return []
  return tags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

const sanitizePackPatch = (body) => {
  const data = {}

  if (body.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw new Error('Context pack title is required')
    data.title = title
  }

  if (body.description !== undefined) {
    data.description = body.description?.trim() || null
  }

  if (body.tags !== undefined) {
    data.tags = normalizeTags(body.tags)
  }

  if (body.archived === true) {
    data.archived_at = new Date().toISOString()
  } else if (body.archived === false) {
    data.archived_at = null
  }

  data.updated_at = new Date().toISOString()
  return data
}

const sanitizeItems = (items = []) =>
  items
    .map((item, index) => ({
      title: item.title?.trim(),
      body: item.body?.trim(),
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      enabled_by_default: item.enabled_by_default !== false,
    }))
    .filter(item => item.title && item.body)

const attachItems = async (supabase, pack) => {
  const { data: items, error } = await supabase
    .from('context_pack_items')
    .select('*')
    .eq('context_pack_id', pack.id)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return {
    ...pack,
    items: items || [],
  }
}

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()

    const { data: pack, error } = await supabase
      .from('context_packs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(await attachItems(supabase, pack))
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const body = await req.json()
    const packData = sanitizePackPatch(body)

    const { data: pack, error } = await supabase
      .from('context_packs')
      .update(packData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (Array.isArray(body.items)) {
      const { error: deleteError } = await supabase
        .from('context_pack_items')
        .delete()
        .eq('context_pack_id', id)

      if (deleteError) throw deleteError

      const items = sanitizeItems(body.items)
      if (items.length) {
        const { error: insertError } = await supabase
          .from('context_pack_items')
          .insert(items.map(item => ({ ...item, context_pack_id: id })))

        if (insertError) throw insertError
      }
    }

    return NextResponse.json(await attachItems(supabase, pack))
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
