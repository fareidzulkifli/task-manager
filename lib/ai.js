export async function queryGrok(prompt, context = []) {
  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    throw new Error('GROK_API_KEY is missing.')
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an expert personal productivity assistant. You provide concise, structured, and helpful task and project summaries. You follow strict hierarchical organization (Organization -> Project -> Task). When suggesting priorities, you use the Eisenhower matrix (Urgent/Important).' },
        ...context,
        { role: 'user', content: prompt }
      ],
      model: 'grok-2-latest',
      temperature: 0,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Grok API Error: ${response.status} ${errorBody}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
