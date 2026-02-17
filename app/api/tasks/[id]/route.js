import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const body = await req.json()
    const {
      summary,
      order_index,
      notes_markdown,
      status,
      urgent,
      important,
      due_date,
      project_id
    } = body

    const updateData = {}
    if (summary !== undefined) updateData.summary = summary
    if (order_index !== undefined) updateData.order_index = order_index
    if (notes_markdown !== undefined) updateData.notes_markdown = notes_markdown
    if (status !== undefined) {
      updateData.status = status
      if (status === 'Done') {
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_at = null
      }
    }
    if (urgent !== undefined) updateData.urgent = !!urgent
    if (important !== undefined) updateData.important = !!important
    if (due_date !== undefined) updateData.due_date = due_date
    if (project_id !== undefined) updateData.project_id = project_id

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
