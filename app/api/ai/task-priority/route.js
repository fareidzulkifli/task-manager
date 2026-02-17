import { queryGrok } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { summary, notes, project_context } = await req.json()

    if (!summary) {
      return NextResponse.json({ error: 'Task summary is required' }, { status: 400 })
    }

    const prompt = `Based on the following task details and project context, suggest whether this task should be "Urgent" (requires immediate attention) and "Important" (has high long-term impact) according to the Eisenhower matrix.

Respond with exactly a JSON object in the format:
{ "urgent": boolean, "important": boolean, "reasoning": "string" }

Task Summary: ${summary}
Task Notes: ${notes || 'None'}
Project Context: ${project_context || 'None'}`

    const resultString = await queryGrok(prompt)

    // Parse JSON from Grok response (sometimes it adds markdown blocks)
    let jsonResult
    try {
      const cleaned = resultString.replace(/```json|```/g, '').trim()
      jsonResult = JSON.parse(cleaned)
    } catch (err) {
      console.error('Failed to parse AI response as JSON:', resultString)
      throw new Error('AI returned an invalid format.')
    }

    return NextResponse.json(jsonResult)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
