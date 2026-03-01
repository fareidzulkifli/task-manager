'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Layers, Loader2, LogIn, BookOpen, AlertCircle } from 'lucide-react'

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
      <div className="login-card">

        {/* Branding */}
        <div className="login-brand">
          <div className="sidebar-logo-icon" style={{ width: '52px', height: '52px', borderRadius: '14px', marginBottom: '20px' }}>
            <Layers size={26} color="#fff" />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>Fareid Workspace</h1>
          <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Sign in to start working
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Password</span>
              <span style={{ color: 'var(--accent)', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>Forgot?</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary login-submit">
            {loading ? <Loader2 className="animate-spin" size={17} /> : <LogIn size={17} />}
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>


      </div>
    </div>
  )
}
