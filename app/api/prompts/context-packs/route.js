import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return []
  return tags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

const sanitizePack = (body, { partial = false } = {}) => {
  const data = {}

  if (!partial || body.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw new Error('Context pack title is required')
    data.title = title
  }

  if (!partial || body.description !== undefined) {
    data.description = body.description?.trim() || null
  }

  if (!partial || body.tags !== undefined) {
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

const attachItems = async (supabase, packs) => {
  if (!packs.length) return []

  const { data: items, error } = await supabase
    .from('context_pack_items')
    .select('*')
    .in('context_pack_id', packs.map(pack => pack.id))
    .order('sort_order', { ascending: true })

  if (error) throw error

  const itemsByPack = (items || []).reduce((map, item) => {
    const list = map.get(item.context_pack_id) || []
    list.push(item)
    map.set(item.context_pack_id, list)
    return map
  }, new Map())

  return packs.map(pack => ({
    ...pack,
    items: itemsByPack.get(pack.id) || [],
  }))
}

export async function GET(req) {
  try {
    const supabase = await createServer()
    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get('include_archived') === 'true'

    let query = supabase
      .from('context_packs')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!includeArchived) {
      query = query.is('archived_at', null)
    }

    const { data, error } = await query

    if (error) throw error

    const packs = await attachItems(supabase, data || [])
    return NextResponse.json(packs)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const supabase = await createServer()
    const body = await req.json()
    const packData = sanitizePack(body)
    const items = sanitizeItems(body.items)

    const { data: pack, error } = await supabase
      .from('context_packs')
      .insert([packData])
      .select()
      .single()

    if (error) throw error

    if (items.length) {
      const { error: itemsError } = await supabase
        .from('context_pack_items')
        .insert(items.map(item => ({ ...item, context_pack_id: pack.id })))

      if (itemsError) throw itemsError
    }

    const [result] = await attachItems(supabase, [pack])
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
