'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Layers, Loader2, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="login-page animate-fade-in">
      <div className="login-card" style={{ maxWidth: '440px', padding: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <div className="sidebar-logo-icon" style={{ width: '48px', height: '48px', marginBottom: '24px', borderRadius: '12px' }}>
            <Layers size={24} color="#fff" />
          </div>
          <h1 className="login-logo text-gradient" style={{ fontSize: '28px' }}>Task Manager</h1>
          <p className="login-title" style={{ marginTop: '8px' }}>Sign in to your premium workspace</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div>
            <label htmlFor="email" className="form-label" style={{ marginBottom: '8px' }}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              style={{ padding: '12px 16px' }}
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Password</span>
              <span style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: '10px' }}>Forgot?</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ padding: '12px 16px' }}
            />
          </div>
          {error && (
            <div style={{ display: 'flex', gap: '8px', color: 'var(--error)', fontSize: '13px', background: 'var(--error-muted)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ marginTop: '2px' }}><Layers size={14} /></div>
              <span>{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', width: '100%', padding: '12px', fontSize: '14px' }}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            {loading ? 'Authenticating...' : 'Sign in to Workspace'}
          </button>
        </form>

        <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '13px', color: 'var(--text-disabled)' }}>
          Don't have an account? <span style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '500' }}>Contact Admin</span>
        </p>
      </div>
    </div>
  )
}
