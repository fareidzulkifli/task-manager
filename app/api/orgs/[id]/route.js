import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const supabase = await createServer()
    const { data, error } = await supabase
      .from('organizations')
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
    const { name, order_index } = body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (order_index !== undefined) updateData.order_index = order_index

    const { data, error } = await supabase
      .from('organizations')
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
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
