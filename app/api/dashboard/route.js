import { createServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServer()

    // Get the 6 most recently updated projects
    // We'll join with tasks to see when the last task was created/updated, 
    // but the projects table has created_at which we can use as a proxy or just order by ID if no updated_at exists.
    // Ideally we want projects where tasks were recently modified.
    
    // Let's fetch projects and their most recent task update
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .limit(20)

    if (projectsError) throw projectsError

    console.log('Fetched projects count:', projects?.length)

    // Fetch task stats for these projects
    const projectIds = projects.map(p => p.id)
    if (projectIds.length === 0) return NextResponse.json([])

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('project_id, status, updated_at, created_at')
      .in('project_id', projectIds)

    if (tasksError) throw tasksError

    // Process stats and "last worked on" date
    const projectStats = projects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id)
      
      // Calculate last update (either task created_at, task updated_at or project created_at)
      const dates = [
        new Date(project.created_at)
      ]
      
      projectTasks.forEach(t => {
        if (t.updated_at) dates.push(new Date(t.updated_at))
        if (t.created_at) dates.push(new Date(t.created_at))
      })

      const lastWorkedOn = new Date(Math.max(...dates.map(d => d.getTime())))

      return {
        ...project,
        org_name: project.organizations?.name || 'Unknown Organization',
        total_tasks: projectTasks.length || 0,
        incomplete_tasks: projectTasks.filter(t => t.status !== 'Done').length || 0,
        last_worked_on: lastWorkedOn.toISOString()
      }
    })

    // Sort by last_worked_on and take top 6
    const recentProjects = projectStats
      .sort((a, b) => new Date(b.last_worked_on) - new Date(a.last_worked_on))
      .slice(0, 6)

    return NextResponse.json(recentProjects)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
