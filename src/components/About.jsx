import { Fragment } from 'react';
import { SKILLS } from '../content.js';
import { Bullets, Perch, SectionTitle, Window } from './parts.jsx';

export function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title" data-perch-section="" data-line="Character sheet below.">
      <div className="column">
        <SectionTitle id="about-title">About</SectionTitle>
        <div className="win-wrap">
          <Perch pose="lie" x="0.62" y="0" />
          <Window title="Character sheet">
            <div className="win-body about">
              <div>
                <p className="about-text">I’m studying computer science at UC San Diego. I like figuring out how a system works end to end, from the interface down to the infrastructure. Most of my work falls into applied AI, backend engineering, and infrastructure.</p>
                <h3 className="sheet-label">Education</h3>
                <p>UC San Diego, B.S. Computer Science</p>
                <h3 className="sheet-label">Honors &amp; activities</h3>
                <Bullets items={['TRELS and EMPOWER Scholarships ($20k total)', 'Lead Full-Stack Developer, Triton Droids']} />
              </div>
              <dl className="skills">
                {SKILLS.map(([label, list]) => <Fragment key={label}><dt>{label}</dt><dd>{list}</dd></Fragment>)}
              </dl>
            </div>
          </Window>
        </div>
      </div>
    </section>
  );
}
