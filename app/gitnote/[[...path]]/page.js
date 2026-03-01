import GitNoteLayout from '@/components/GitNoteLayout'

export const metadata = {
  title: 'GitNotes — BA-Notes',
}

export default async function GitNotePage({ params }) {
  const { path } = await params
  return <GitNoteLayout initialPath={path ?? []} />
}
