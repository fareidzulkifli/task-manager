import { queryGrok } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { org_name, project_summaries } = await req.json()

    if (!org_name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    if (!project_summaries || !Array.isArray(project_summaries)) {
      return NextResponse.json({ error: 'Project summaries are required' }, { status: 400 })
    }

    const summaries = project_summaries.map(ps => `- Project "${ps.name}": ${ps.summary}`).join('\n')

    const prompt = `Generate a high-level overview for the organization "${org_name}" by rolling up its project summaries. Synthesize cross-project themes, overall organizational health, and primary focus areas for the next phase. Keep it to 2-3 concise paragraphs.

Project Summaries:
${summaries}`

    const orgSummary = await queryGrok(prompt)

    return NextResponse.json({ orgSummary })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
