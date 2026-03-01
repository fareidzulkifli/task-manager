import Board from '@/components/Board'
import { createServer } from '@/lib/supabase/server'

export default async function OrgPage({ params }) {
  const { slug } = await params
  const supabase = await createServer()
  const { data: org } = await supabase
    .from('organizations').select('id').eq('slug', slug).single()

  if (!org) return <div>Organization not found</div>

  return <div className="org-page"><Board orgId={org.id} /></div>
}
