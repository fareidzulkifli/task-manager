import { createServer } from '@/lib/supabase/server'
import DashboardView from '@/components/DashboardView'

export default async function Home() {
  const supabase = await createServer()

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select(`*, organizations (name, slug)`)
    .limit(20)

  if (projectsError || !projects) return <DashboardView projects={[]} />

  const projectIds = projects.map(p => p.id)
  if (projectIds.length === 0) return <DashboardView projects={[]} />

  const { data: tasks } = await supabase
    .from('tasks')
    .select('project_id, status, updated_at, created_at')
    .in('project_id', projectIds)

  const projectStats = projects.map(project => {
    const projectTasks = (tasks || []).filter(t => t.project_id === project.id)

    const dates = [new Date(project.created_at)]
    projectTasks.forEach(t => {
      if (t.updated_at) dates.push(new Date(t.updated_at))
      if (t.created_at) dates.push(new Date(t.created_at))
    })
    const lastWorkedOn = new Date(Math.max(...dates.map(d => d.getTime())))

    return {
      ...project,
      org_name: project.organizations?.name || 'Unknown Organization',
      org_slug: project.organizations?.slug,
      total_tasks: projectTasks.length,
      incomplete_tasks: projectTasks.filter(t => t.status !== 'Done').length,
      last_worked_on: lastWorkedOn.toISOString(),
    }
  })

  const recentProjects = projectStats
    .sort((a, b) => new Date(b.last_worked_on) - new Date(a.last_worked_on))
    .slice(0, 6)

  return <DashboardView projects={recentProjects} />
}
