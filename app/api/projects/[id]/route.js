import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const { data, error } = await supabase
      .from('projects')
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
    const { 
      name, 
      order_index, 
      description_markdown, 
      goal, 
      context_markdown, 
      project_type, 
      ai_instructions, 
      current_focus, 
      target_date 
    } = body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (order_index !== undefined) updateData.order_index = order_index
    if (description_markdown !== undefined) updateData.description_markdown = description_markdown
    if (goal !== undefined) updateData.goal = goal
    if (context_markdown !== undefined) updateData.context_markdown = context_markdown
    if (project_type !== undefined) updateData.project_type = project_type
    if (ai_instructions !== undefined) updateData.ai_instructions = ai_instructions
    if (current_focus !== undefined) updateData.current_focus = current_focus
    if (target_date !== undefined) updateData.target_date = target_date

    const { data, error } = await supabase
      .from('projects')
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
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
