import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const allowedColors = new Set(['blue', 'green', 'red', 'violet', 'slate'])
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const sanitizeEventPatch = (body) => {
  const data = {}

  if (body.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw new Error('Event title is required')
    data.title = title
  }

  if (body.event_date !== undefined) {
    if (!datePattern.test(body.event_date || '')) {
      throw new Error('Event date is required')
    }
    data.event_date = body.event_date
  }

  if (body.notes !== undefined) {
    data.notes = body.notes?.trim() || null
  }

  if (body.color !== undefined) {
    data.color = allowedColors.has(body.color) ? body.color : 'blue'
  }

  data.updated_at = new Date().toISOString()
  return data
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const body = await req.json()
    const eventData = sanitizeEventPatch(body)

    const { data, error } = await supabase
      .from('dashboard_events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()

    const { error } = await supabase
      .from('dashboard_events')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
