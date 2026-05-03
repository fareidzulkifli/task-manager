import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const allowedColors = new Set(['blue', 'green', 'red', 'violet', 'slate'])
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const sanitizeEvent = (body, { partial = false } = {}) => {
  const data = {}

  if (!partial || body.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw new Error('Event title is required')
    data.title = title
  }

  if (!partial || body.event_date !== undefined) {
    if (!datePattern.test(body.event_date || '')) {
      throw new Error('Event date is required')
    }
    data.event_date = body.event_date
  }

  if (!partial || body.notes !== undefined) {
    data.notes = body.notes?.trim() || null
  }

  if (!partial || body.color !== undefined) {
    data.color = allowedColors.has(body.color) ? body.color : 'blue'
  }

  return data
}

export async function GET() {
  try {
    const supabase = await createServer()

    const { data, error } = await supabase
      .from('dashboard_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

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
    const eventData = sanitizeEvent(body)

    const { data, error } = await supabase
      .from('dashboard_events')
      .insert([eventData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
