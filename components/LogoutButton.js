'use client';

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton({ style }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button 
      onClick={handleLogout} 
      style={{ 
        background: 'transparent', 
        border: '1px solid var(--border)',
        fontSize: '12px',
        padding: '6px 12px',
        ...style
      }}
    >
      Logout
    </button>
  )
}
