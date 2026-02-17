import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const supabase = await createServer()
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')

    let query = supabase
      .from('projects')
      .select('*')
      .order('order_index', { ascending: true })

    if (orgId) {
      query = query.eq('org_id', orgId)
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
    const { name, org_id, order_index } = body

    if (!name || !org_id) {
      return NextResponse.json({ error: 'Name and Organization ID are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, org_id, order_index: order_index || 0 }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

