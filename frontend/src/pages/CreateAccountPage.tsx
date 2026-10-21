import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'

export function CreateAccountPage() {
  const { shopper, register } = useAuth()
  const navigate = useNavigate()
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm') ?? '')
    const email = String(data.get('email') ?? '').trim()
    if (password !== confirm) {
      setNotice('Those passwords do not match.')
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      await register({
        firstName: String(data.get('firstName') ?? ''),
        lastName: String(data.get('lastName') ?? ''),
        email,
        password,
      })
      navigate('/')
    } catch (caught: unknown) {
      setNotice(caught instanceof Error ? caught.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  if (shopper) {
    return (
      <section className="page narrow">
        <h1>Claim your Golden Ticket</h1>
        <p className="lede">Ticket Holder: {shopper.name}. Your Past Treats live in the chat.</p>
        <Link to="/">Back to the shop</Link>
      </section>
    )
  }

  return (
    <section className="page narrow">
      <h1>Claim your Golden Ticket</h1>
      <p className="lede">Only ticket holders may enter the inner rooms.</p>
      <form className="form-card ticket-form" onSubmit={onSubmit}>
        <label htmlFor="first-name">First name</label>
        <input id="first-name" name="firstName" autoComplete="given-name" required />
        <label htmlFor="last-name">Last name</label>
        <input id="last-name" name="lastName" autoComplete="family-name" required />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <label htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Printing the ticket…' : 'Claim your Golden Ticket'}
        </button>
        {notice ? (
          <p className="form-notice" role="alert">
            {notice}
          </p>
        ) : null}
      </form>
      <p>
        Already holding a ticket? <Link to="/login">Present your ticket</Link>
      </p>
    </section>
  )
}
