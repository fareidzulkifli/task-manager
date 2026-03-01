import ShareNoteLayout from '@/components/ShareNoteLayout'

export const metadata = { title: 'BA Notes — Shared' }

export default async function SharePage({ params }) {
  const { path } = await params
  return <ShareNoteLayout filePath={path?.join('/') ?? null} />
}
