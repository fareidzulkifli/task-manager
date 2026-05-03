import { createServer } from '@/lib/supabase/server'
import DashboardView from '@/components/DashboardView'
import { fetchMalaysiaHolidays } from '@/lib/malaysiaHolidays'

export const dynamic = 'force-dynamic'

const pad = (value) => String(value).padStart(2, '0')

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const toDateKey = (value) => {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const uniqueById = (items) => Array.from(new Map(items.map(item => [item.id, item])).values())

const toMonthParam = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

const parseCalendarMonth = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  }

  const [year, month] = value.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  }

  return new Date(year, month - 1, 1)
}

const diffDays = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000)

const formatMonth = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)

const formatAgo = (value, today) => {
  if (!value) return 'No movement'
  const days = diffDays(today, new Date(value))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const createEmptyDashboard = ({ error = null, calendarMonth = new Date(), holidays = [] } = {}) => {
  const today = startOfDay(new Date())
  return {
    error,
    generatedAt: new Date().toISOString(),
    empty: true,
    kpis: [],
    priorityTasks: [],
    calendar: buildCalendar([], today, calendarMonth, holidays),
    holidays,
    events: [],
    todayKey: toDateKey(today),
    heatmap: buildHeatmap([], today),
    portfolio: [],
    executionMix: {
      status: [],
      priority: [],
    },
  }
}

const buildCalendar = (tasks, today, calendarMonth = today, holidays = []) => {
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const selectedMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  const gridStart = addDays(monthStart, -monthStart.getDay())
  const gridEnd = addDays(selectedMonthEnd, 6 - selectedMonthEnd.getDay())
  const todayKey = toDateKey(today)
  const month = monthStart.getMonth()
  const holidaysByDate = holidays.reduce((map, holiday) => {
    const next = map.get(holiday.date) || []
    next.push(holiday)
    map.set(holiday.date, next)
    return map
  }, new Map())
  const cells = []

  for (let date = new Date(gridStart); date <= gridEnd; date = addDays(date, 1)) {
    const key = toDateKey(date)
    const dayHolidays = holidaysByDate.get(key) || []
    const completedTasks = tasks.filter(task => toDateKey(task.completed_at) === key)
    const movementCount = tasks.reduce((count, task) => {
      const movementDays = new Set([
        toDateKey(task.created_at),
        toDateKey(task.updated_at),
        toDateKey(task.completed_at),
      ].filter(Boolean))
      return movementDays.has(key) ? count + 1 : count
    }, 0)

    cells.push({
      key,
      day: date.getDate(),
      weekday: date.getDay(),
      inMonth: date.getMonth() === month,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: key === todayKey,
      movementCount,
      completedCount: completedTasks.length,
      holidayCount: dayHolidays.length,
      holidays: dayHolidays,
      completedTasks: completedTasks.map(task => ({
        id: task.id,
        summary: task.summary,
        projectName: task.projectName,
        orgName: task.orgName,
        orgSlug: task.orgSlug,
        completedAt: task.completed_at,
      })),
      activityLevel: movementCount === 0 ? 0 : movementCount < 2 ? 1 : movementCount < 4 ? 2 : 3,
    })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return {
    label: formatMonth(monthStart),
    monthKey: toMonthParam(monthStart),
    previousMonthKey: toMonthParam(addMonths(monthStart, -1)),
    nextMonthKey: toMonthParam(addMonths(monthStart, 1)),
    todayMonthKey: toMonthParam(today),
    holidayState: holidays[0]?.state || 'kuala-lumpur',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weeks,
  }
}

const buildHeatmap = (tasks, today) => {
  const todayKey = toDateKey(today)
  const firstVisibleDay = addDays(addDays(today, -364), -addDays(today, -364).getDay())
  const counts = {}

  tasks.forEach(task => {
    const movementDays = new Set([
      toDateKey(task.created_at),
      toDateKey(task.updated_at),
      toDateKey(task.completed_at),
    ].filter(Boolean))

    movementDays.forEach(key => {
      if (key <= todayKey) counts[key] = (counts[key] || 0) + 1
    })
  })

  const cells = []
  for (let date = new Date(firstVisibleDay); date <= today; date = addDays(date, 1)) {
    const key = toDateKey(date)
    const count = counts[key] || 0
    cells.push({
      key,
      count,
      level: count === 0 ? 0 : count < 2 ? 1 : count < 4 ? 2 : count < 7 ? 3 : 4,
    })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return {
    weeks,
    totalMovements: Object.values(counts).reduce((sum, count) => sum + count, 0),
  }
}

const buildDashboardData = (projects, tasks, events = [], { calendarMonth = new Date(), holidays = [] } = {}) => {
  const today = startOfDay(new Date())
  const weekStart = addDays(today, -((today.getDay() + 6) % 7))
  const weekStartKey = toDateKey(weekStart)
  const todayKey = toDateKey(today)
  const dashboardEvents = (events || []).map(event => ({
    id: event.id,
    title: event.title,
    event_date: event.event_date,
    notes: event.notes || '',
    color: event.color || 'blue',
    created_at: event.created_at,
    updated_at: event.updated_at,
  }))

  const projectMap = new Map(projects.map(project => [project.id, {
    ...project,
    orgName: project.organizations?.name || 'Unknown Organization',
    orgSlug: project.organizations?.slug,
  }]))

  const enrichedTasks = tasks.map(task => {
    const project = projectMap.get(task.project_id)
    const completedKey = toDateKey(task.completed_at)
    const createdKey = toDateKey(task.created_at)

    return {
      ...task,
      projectName: project?.name || 'Unknown Project',
      orgName: project?.orgName || 'Unknown Organization',
      orgSlug: project?.orgSlug,
      completedKey,
      createdKey,
      isActive: task.status !== 'Done',
      isHighPriority: !!task.urgent && !!task.important,
      movementAt: task.updated_at || task.completed_at || task.created_at,
    }
  })

  const activeTasks = enrichedTasks.filter(task => task.isActive)
  const highPriorityTasks = activeTasks.filter(task => task.isHighPriority)
  const inProgressTasks = enrichedTasks.filter(task => task.status === 'In Progress')
  const kivTasks = enrichedTasks.filter(task => task.status === 'KIV')
  const completedThisWeek = enrichedTasks.filter(task => task.completedKey && task.completedKey >= weekStartKey && task.completedKey <= todayKey)
  const activeProjectIds = new Set(activeTasks.map(task => task.project_id))

  const priorityTasks = highPriorityTasks
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'In Progress' ? -1 : 1
      return new Date(a.created_at) - new Date(b.created_at)
    })
    .slice(0, 8)
    .map(task => ({
      id: task.id,
      summary: task.summary,
      projectName: task.projectName,
      orgName: task.orgName,
      orgSlug: task.orgSlug,
      status: task.status,
      age: `${Math.max(0, diffDays(today, new Date(task.created_at)))}d open`,
    }))

  const portfolio = projects.map(project => {
    const projectTasks = enrichedTasks.filter(task => task.project_id === project.id)
    const pending = projectTasks.filter(task => task.isActive)
    const high = pending.filter(task => task.isHighPriority)
    const kiv = pending.filter(task => task.status === 'KIV')
    const movementDates = [
      project.created_at,
      ...projectTasks.flatMap(task => [task.created_at, task.updated_at, task.completed_at].filter(Boolean)),
    ].map(value => new Date(value).getTime()).filter(value => !Number.isNaN(value))
    const lastMovement = movementDates.length ? new Date(Math.max(...movementDates)).toISOString() : project.created_at
    const stagnant = pending.length > 0 && diffDays(today, new Date(lastMovement)) >= 14

    let health = 'Clear'
    if (high.length > 0) {
      health = 'Critical'
    } else if (stagnant) {
      health = 'At Risk'
    } else if (pending.length > 0) {
      health = 'Active'
    }

    return {
      id: project.id,
      name: project.name,
      orgName: project.organizations?.name || 'Unknown Organization',
      orgSlug: project.organizations?.slug,
      activeTasks: pending.length,
      highPriorityTasks: high.length,
      kivTasks: kiv.length,
      lastMovement: formatAgo(lastMovement, today),
      health,
    }
  }).sort((a, b) => {
    const rank = { Critical: 0, 'At Risk': 1, Active: 2, Clear: 3 }
    if (rank[a.health] !== rank[b.health]) return rank[a.health] - rank[b.health]
    if (a.highPriorityTasks !== b.highPriorityTasks) return b.highPriorityTasks - a.highPriorityTasks
    return b.activeTasks - a.activeTasks
  })

  const statusCounts = ['In Progress', 'KIV', 'Done'].map(status => ({
    label: status,
    value: enrichedTasks.filter(task => task.status === status).length,
  }))

  const priorityMix = [
    { label: 'Critical', value: activeTasks.filter(task => task.urgent && task.important).length },
    { label: 'Fast Track', value: activeTasks.filter(task => task.urgent && !task.important).length },
    { label: 'Strategic', value: activeTasks.filter(task => !task.urgent && task.important).length },
    { label: 'Standard', value: activeTasks.filter(task => !task.urgent && !task.important).length },
  ]

  return {
    error: null,
    generatedAt: new Date().toISOString(),
    empty: projects.length === 0 && dashboardEvents.length === 0 && holidays.length === 0,
    todayKey,
    kpis: [
      { label: 'Active Tasks', value: activeTasks.length, detail: `${activeProjectIds.size} projects in motion`, tone: 'neutral' },
      { label: 'High Priority', value: highPriorityTasks.length, detail: 'Urgent and important', tone: highPriorityTasks.length ? 'critical' : 'neutral' },
      { label: 'In Progress', value: inProgressTasks.length, detail: 'Currently moving', tone: 'neutral' },
      { label: 'KIV', value: kivTasks.length, detail: 'Parked for later', tone: 'neutral' },
      { label: 'Completed Week', value: completedThisWeek.length, detail: 'Closed since Monday', tone: 'good' },
      { label: 'Active Projects', value: projects.length, detail: `${activeProjectIds.size} with open work`, tone: 'neutral' },
    ],
    priorityTasks,
    holidays,
    events: dashboardEvents,
    calendar: buildCalendar(enrichedTasks, today, calendarMonth, holidays),
    heatmap: buildHeatmap(enrichedTasks, today),
    portfolio,
    executionMix: {
      status: statusCounts,
      priority: priorityMix,
    },
  }
}

export default async function DashboardPage({ searchParams } = {}) {
  const resolvedSearchParams = await searchParams
  const calendarMonth = parseCalendarMonth(resolvedSearchParams?.month)
  const holidayState = process.env.MALAYSIA_HOLIDAY_STATE || 'kuala-lumpur'
  const today = startOfDay(new Date())
  const upcomingEnd = addDays(today, 30)
  const holidayYears = Array.from(new Set([
    calendarMonth.getFullYear(),
    today.getFullYear(),
    upcomingEnd.getFullYear(),
  ]))
  const holidayResults = await Promise.all(
    holidayYears.map(year => fetchMalaysiaHolidays({ state: holidayState, year }))
  )
  const holidays = uniqueById(holidayResults.flatMap(result => result.holidays))

  try {
    const supabase = await createServer()

    const [
      { data: projects, error: projectsError },
      { data: events, error: eventsError },
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('*, organizations (name, slug)')
        .is('archived_at', null)
        .order('order_index', { ascending: true }),
      supabase
        .from('dashboard_events')
        .select('*')
        .order('event_date', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (projectsError) throw projectsError
    if (eventsError) throw eventsError

    const projectIds = (projects || []).map(project => project.id)
    let tasks = []

    if (projectIds.length > 0) {
      const { data: taskRows, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)

      if (tasksError) throw tasksError
      tasks = taskRows || []
    }

    const dashboardData = buildDashboardData(projects || [], tasks, events || [], {
      calendarMonth,
      holidays,
    })

    return <DashboardView key={dashboardData.calendar.monthKey} data={dashboardData} />
  } catch (err) {
    const emptyDashboard = createEmptyDashboard({
      error: err.message,
      calendarMonth,
      holidays,
    })

    return <DashboardView key={emptyDashboard.calendar.monthKey} data={emptyDashboard} />
  }
}
