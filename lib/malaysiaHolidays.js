const DEFAULT_STATE = 'kuala-lumpur'
const HOLIDAY_API_BASE = 'https://sabah-holiday.dydxsoft.my/api'

const MONTHS = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
}

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizeState = (state) => {
  const candidate = (state || DEFAULT_STATE).toLowerCase().trim()
  return /^[a-z-]+$/.test(candidate) ? candidate : DEFAULT_STATE
}

const normalizeYear = (year) => {
  const candidate = Number(year)
  const currentYear = new Date().getFullYear()
  if (!Number.isInteger(candidate) || candidate < 2020 || candidate > 2050) return currentYear
  return candidate
}

const normalizeHoliday = (holiday, state, year) => {
  const match = holiday?.date?.match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/)
  if (!match) return null

  const month = MONTHS[match[1]]
  const day = String(Number(match[2])).padStart(2, '0')
  if (!month || day === 'NaN') return null

  const date = `${year}-${month}-${day}`
  const title = holiday.holiday_name || 'Public Holiday'

  return {
    id: `my-${state}-${date}-${slugify(title)}`,
    date,
    title,
    state,
    dayOfWeek: holiday.day_of_week || '',
    isMandatory: !!holiday.is_mandatory,
    source: 'Malaysia Public Holidays API',
  }
}

export async function fetchMalaysiaHolidays({ state = DEFAULT_STATE, year = new Date().getFullYear() } = {}) {
  const normalizedState = normalizeState(state)
  const normalizedYear = normalizeYear(year)

  try {
    const res = await fetch(`${HOLIDAY_API_BASE}/${normalizedState}/${normalizedYear}.json`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      return {
        state: normalizedState,
        year: normalizedYear,
        holidays: [],
      }
    }

    const holidays = await res.json()

    return {
      state: normalizedState,
      year: normalizedYear,
      holidays: Array.isArray(holidays)
        ? holidays.map(holiday => normalizeHoliday(holiday, normalizedState, normalizedYear)).filter(Boolean)
        : [],
    }
  } catch (err) {
    console.error('Failed to fetch Malaysia holidays', err)
    return {
      state: normalizedState,
      year: normalizedYear,
      holidays: [],
    }
  }
}

export const MALAYSIA_HOLIDAY_DEFAULT_STATE = DEFAULT_STATE
