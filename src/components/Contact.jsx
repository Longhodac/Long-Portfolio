import { useEffect, useRef, useState } from 'react';
import { NEW_TAB, Perch, Window } from './parts.jsx';

const EMAIL = 'lhodac@ucsd.edu';

export function Contact({ say }) {
  const { canCopy, status, copy } = useCopyEmail(say);
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title" data-perch-section="" data-line="Go on, send the email.">
      <div className="contact-art retro" aria-hidden="true">
        <video muted loop playsInline preload="none" poster="/assets/art/sky.jpg" tabIndex={-1} data-fx-video="">
          <source src="/assets/art/sky-small.mp4" type="video/mp4" media="(max-width: 760px)" />
          <source src="/assets/art/sky.mp4" type="video/mp4" />
        </video>
      </div>
      <Perch pose="back" x="1" y="1" />
      <Window className="contact-win" title="Save point">
        <div className="win-body">
          <h2 id="contact-title" className="contact-title">Get in touch</h2>
          <p>I’m happy to hear about engineering roles, projects, or anything on this page. Email is the best way to reach me.</p>
          <p className="contact-mail"><a href={`mailto:${EMAIL}`}>{EMAIL}</a><button className="btn copy" type="button" hidden={!canCopy} onClick={copy}>Copy</button><span className="copy-status" role="status">{status}</span></p>
          <ul className="hero-actions" aria-label="Profiles">
            <li><a className="btn" href="https://github.com/Longhodac" target="_blank" rel="noopener noreferrer">GitHub{NEW_TAB}</a></li>
            <li><a className="btn" href="https://www.linkedin.com/in/long-hodac/" target="_blank" rel="noopener noreferrer">LinkedIn{NEW_TAB}</a></li>
          </ul>
        </div>
      </Window>
    </section>
  );
}

function useCopyEmail(say) {
  const [canCopy, setCanCopy] = useState(false);
  const [status, setStatus] = useState('');
  const clear = useRef(0);

  useEffect(() => {
    setCanCopy(Boolean(navigator.clipboard && window.isSecureContext));
    return () => clearTimeout(clear.current);
  }, []);

  const copy = async () => {
    clearTimeout(clear.current);
    try {
      await navigator.clipboard.writeText(EMAIL);
      setStatus('Copied');
      say('Good. Use it.');
    } catch {
      setStatus('Couldn’t copy');
    }
    clear.current = setTimeout(() => setStatus(''), 3000);
  };

  return { canCopy, status, copy };
}
