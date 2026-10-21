export function AboutPage() {
  return (
    <section className="page about">
      <p className="eyebrow">Meet the makers</p>
      <h1>Our Story</h1>
      <p className="lede">
        Campus Customs runs the Yale Bulldog Blue factory at 57 Broadway in
        New Haven. The work is still plain: clothes that feel like Yale, from
        a navy hoodie for a Tuesday to a shirt for The Game.
      </p>
      <div className="about-copy">
        <p>
          This site is the factory floor. Open a wrapper and you get the
          description, the catalogue price, and a count for every size on the
          shelf. If a medium is gone, the page says so.
        </p>
        <p>
          Questions about an order or a fit belong with the chocolatier in the
          corner, or with the people at the Broadway shop. Write the order desk
          or call, and a person will pick it up.
        </p>
      </div>
      <div className="about-facts">
        <article className="wrapper">
          <h2>Visit</h2>
          <p>
            57 Broadway
            <br />
            New Haven, CT 06511
          </p>
        </article>
        <article className="wrapper">
          <h2>Order help</h2>
          <p>
            Ask the chocolatier, email{' '}
            <a href="mailto:orderdept@campuscustoms.com">
              orderdept@campuscustoms.com
            </a>
            , or call (475) 301-4205.
          </p>
        </article>
        <article className="wrapper">
          <h2>On the belt</h2>
          <p>
            Sweatshirts, hoodies, tees, quarter-zips, and jackets from the
            catalogue — college crests, sport marks, and the big Yale lettering.
          </p>
        </article>
      </div>
    </section>
  )
}
