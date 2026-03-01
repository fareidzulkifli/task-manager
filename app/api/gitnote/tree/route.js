import { NextResponse } from 'next/server'

const OWNER = 'fareidzulkifli'
const REPO = 'BA-notes'

export async function GET() {
  const pat = process.env.GITHUB_PAT
  if (!pat) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('GitHub tree API error:', res.status, text)
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const tree = (data.tree || [])
      .filter(item => item.type === 'blob')
      .map(item => ({ path: item.path, size: item.size }))

    return NextResponse.json(
      { tree },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
    )
  } catch (err) {
    console.error('gitnote/tree error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
