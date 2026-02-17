'use client';

import { use } from 'react'
import Board from '@/components/Board'

export default function OrgPage({ params }) {
  const { id } = use(params)

  return (
    <div className="org-page">
      <Board orgId={id} />
    </div>
  )
}
