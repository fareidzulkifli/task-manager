import { queryGrok } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { project_context, tasks } = await req.json()

    if (!project_context) {
      return NextResponse.json({ error: 'Project context is required' }, { status: 400 })
    }

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Tasks are required' }, { status: 400 })
    }

    const taskSummaries = tasks.map(t => `- [${t.status}] ${t.summary} (Priority: ${t.urgent ? 'Urgent' : ''} ${t.important ? 'Important' : ''})`).join('\n')

    const prompt = `Generate a narrative summary of the following project, informed by its context and its current tasks. Focus on overall progress, next major hurdles, and strategic alignment with project goals. Keep it to one concise paragraph.

Project Context:
- Goal: ${project_context.goal || 'Not set'}
- Type: ${project_context.project_type || 'General'}
- Description: ${project_context.description_markdown || 'None'}
- Current Focus: ${project_context.current_focus || 'None'}

Current Tasks:
${taskSummaries}`

    const projectSummary = await queryGrok(prompt)

    return NextResponse.json({ projectSummary })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
