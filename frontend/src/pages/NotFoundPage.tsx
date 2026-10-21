import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page narrow lost">
      <p className="eyebrow">Wrong corridor</p>
      <h1>You've wandered into a room that hasn't been invented yet.</h1>
      <Link className="primary" to="/">
        Back to the factory gate
      </Link>
    </section>
  )
}
