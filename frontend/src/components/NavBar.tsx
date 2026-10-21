import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth.tsx'
import { useBasket } from '../basket.tsx'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'The Inventing Room', end: false },
  { to: '/about', label: 'Our Story', end: false },
]

export function NavBar() {
  const { shopper, ready, logout } = useAuth()
  const { lines, setOpen } = useBasket()
  const picked = lines.reduce((sum, line) => sum + line.picked, 0)

  return (
    <header className="site-header">
      <div className="nav-inner">
        <NavLink to="/" className="brand" end>
          <span className="brand-mark" aria-hidden="true">
            <span>CC</span>
          </span>
          <span className="brand-text">
            <strong>Campus Customs</strong>
            <small>Yale Bulldog Blue</small>
          </span>
        </NavLink>
        <nav className="nav-links" aria-label="Main">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
          <button type="button" className="nav-basket" onClick={() => setOpen(true)}>
            Your Candy Basket{picked > 0 ? ` (${picked})` : ''}
          </button>
          {ready && shopper ? (
            <>
              <span className="nav-hello">Ticket Holder: {shopper.first_name}</span>
              <button type="button" className="nav-logout" onClick={logout}>
                Log out
              </button>
            </>
          ) : null}
          {ready && !shopper ? (
            <>
              <NavLink to="/login">Present Your Ticket</NavLink>
              <NavLink
                to="/create-account"
                className={({ isActive }) => (isActive ? 'ticket-pill active' : 'ticket-pill')}
              >
                Get a Golden Ticket
              </NavLink>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
