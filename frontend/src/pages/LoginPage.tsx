import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'

export function LoginPage() {
  const { shopper, login } = useAuth()
  const navigate = useNavigate()
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    setBusy(true)
    setNotice(null)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setNotice("Hmm, that ticket doesn't shimmer. Try again?")
    } finally {
      setBusy(false)
    }
  }

  if (shopper) {
    return (
      <section className="page narrow">
        <h1>Present your ticket</h1>
        <p className="lede">Ticket Holder: {shopper.name}</p>
        <Link to="/">Back to the shop</Link>
      </section>
    )
  }

  return (
    <section className="page narrow">
      <h1>Present your ticket</h1>
      <p className="lede">The email on your Campus Customs account opens the factory gate.</p>
      <form className="form-card ticket-form" onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Checking the ticket…' : 'Present your ticket'}
        </button>
        {notice ? (
          <p className="form-notice" role="alert">
            {notice}
          </p>
        ) : null}
      </form>
      <p>
        New here? <Link to="/create-account">Get a Golden Ticket</Link>
      </p>
    </section>
  )
}
