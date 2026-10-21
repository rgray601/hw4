import { Link } from 'react-router-dom'
import { formatPrice } from '../format.ts'
import { useBasket } from '../basket.tsx'

export function CandyBasket() {
  const { lines, open, confirmed, setOpen, checkout } = useBasket()
  if (!open) return null

  return (
    <aside className="basket" aria-label="Your Candy Basket">
      <header>
        <h2>Your Candy Basket</h2>
        <button type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </header>
      {confirmed ? (
        <p className="basket-confirm" role="status">
          Splendid! Your order is rolling down the conveyor belt.
        </p>
      ) : null}
      {lines.length === 0 ? (
        <p>Your basket is emptier than a chocolate bar at midnight.</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li key={line.product_id}>
              <img src={line.image_url} alt="" />
              <span>
                <strong>{line.name}</strong>
                <span>
                  {line.picked} in the basket · {formatPrice(line.price)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 ? (
        <button type="button" className="primary" onClick={checkout}>
          Through the Gates →
        </button>
      ) : (
        <Link to="/products" onClick={() => setOpen(false)}>
          Enter the Inventing Room
        </Link>
      )}
    </aside>
  )
}
