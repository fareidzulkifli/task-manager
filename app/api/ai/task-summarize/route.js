import { queryGrok } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { notes } = await req.json()

    if (!notes) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
    }

    const prompt = `Summarize the following task notes into a concise, one-sentence task summary. Avoid flowery language. Just the facts.

Notes:
${notes}`

    const summary = await queryGrok(prompt)

    return NextResponse.json({ summary })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
