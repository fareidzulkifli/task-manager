import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const supabase = await createServer()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const orgId = searchParams.get('org_id')

    let query = supabase
      .from('tasks')
      .select('*, projects!inner(org_id)')
      .order('order_index', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    } else if (orgId) {
      query = query.eq('projects.org_id', orgId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const supabase = await createServer()
    const body = await req.json()
    const { 
      summary, 
      project_id, 
      order_index, 
      notes_markdown, 
      status, 
      urgent, 
      important, 
      due_date 
    } = body

    if (!summary || !project_id) {
      return NextResponse.json({ error: 'Summary and Project ID are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        summary, 
        project_id, 
        order_index: order_index || 0,
        notes_markdown: notes_markdown || '',
        status: status || 'In Progress',
        urgent: !!urgent,
        important: !!important,
        due_date: due_date || null
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

