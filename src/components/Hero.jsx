import { NEW_TAB, Perch } from './parts.jsx';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title" data-perch-section="" data-line="Scroll. I’ll keep up.">
      <div className="hero-scrim" aria-hidden="true"></div>
      <Perch pose="sit" x="0.74" y="1" />
      <div className="hero-copy">
        <h1 id="hero-title" className="hero-title"><img src="/assets/art/logo.png" alt="Hi, I’m Long." width="178" height="40" /></h1>
        <p className="lede">Software engineer working on <em>applied AI</em> and <em>infrastructure</em>. I’ve interned at <em>IBM</em> and <em>Workday</em>, and I study computer science at <em>UC San Diego</em>.</p>
        <ul className="hero-actions" aria-label="Profiles">
          <li><a className="btn btn-solid" href="https://github.com/Longhodac" target="_blank" rel="noopener noreferrer">GitHub{NEW_TAB}</a></li>
          <li><a className="btn" href="https://www.linkedin.com/in/long-hodac/" target="_blank" rel="noopener noreferrer">LinkedIn{NEW_TAB}</a></li>
          <li><a className="btn" href="mailto:lhodac@ucsd.edu">Email</a></li>
        </ul>
      </div>
      <div className="floor" aria-hidden="true"></div>
    </section>
  );
}
