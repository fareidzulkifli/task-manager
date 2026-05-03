import { fetchMalaysiaHolidays } from '@/lib/malaysiaHolidays'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state') || undefined
  const year = searchParams.get('year') || undefined
  const data = await fetchMalaysiaHolidays({ state, year })

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
