import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServer()

    // Fetch organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('order_index', { ascending: true })

    if (orgsError) throw orgsError

    // Fetch projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('order_index', { ascending: true })

    if (projectsError) throw projectsError

    // Fetch incomplete tasks count per project
    const { data: taskCounts, error: tasksError } = await supabase
      .from('tasks')
      .select('project_id')
      .neq('status', 'Done')

    if (tasksError) throw tasksError

    // Process counts
    const countsMap = taskCounts.reduce((acc, task) => {
      acc[task.project_id] = (acc[task.project_id] || 0) + 1
      return acc
    }, {})

    // Assemble the tree
    const result = orgs.map(org => ({
      ...org,
      projects: projects
        .filter(p => p.org_id === org.id)
        .map(p => ({
          ...p,
          incomplete_tasks_count: countsMap[p.id] || 0
        }))
    }))

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
