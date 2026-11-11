import { useArrival } from '../hooks/useArrival.js';
import { cx } from './cx.js';

// A window: a title bar and a body that powers on the first time it scrolls into view.
export function Window({ className, title, bar, windowRef, children, ...rest }) {
  const [ref, arrival] = useArrival();
  const setRef = el => {
    ref.current = el;
    if (windowRef) windowRef.current = el;
  };
  return (
    <div ref={setRef} className={cx('win', className, arrival)} {...rest}>
      <p className="win-bar"><span>{title}</span>{bar}<i aria-hidden="true"></i></p>
      {children}
    </div>
  );
}

export function SectionTitle({ id, children }) {
  const [ref, arrival] = useArrival();
  return <h2 ref={ref} id={id} className={cx('sec-title', arrival)}>{children}</h2>;
}

export function Bullets({ items }) {
  return <ul className="bullets">{items.map(item => <li key={item}>{item}</li>)}</ul>;
}

export function Stats({ items, row }) {
  return (
    <ul className={cx('stats', row && 'stats-row')} aria-label="Key numbers">
      {items.map(stat => (
        <li key={stat.label}><b>{stat.value}</b><span>{stat.label}</span>{stat.bar && <i className="bar" style={{ '--v': stat.bar.v, '--from': stat.bar.from }}></i>}</li>
      ))}
    </ul>
  );
}

// A diagram drawn by engines/viz.js. It stays hidden until that engine finds a drawing for its name.
export function Viz({ name, caption }) {
  return <figure className="viz" data-viz={name} hidden><canvas aria-hidden="true"></canvas><figcaption>{caption}</figcaption></figure>;
}

export function Tags({ items }) {
  return <ul className="tags" aria-label="Technologies">{items.map(tag => <li key={tag}>{tag}</li>)}</ul>;
}

export const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

export function Perch({ pose, x, y, wide }) {
  return (
    <div className="perch" data-perch="" data-pose={pose} data-x={x} data-y={y}
      data-wide-pose={wide?.pose} data-wide-x={wide?.x} data-wide-y={wide?.y}></div>
  );
}

// A framed picture hung between two sections. Its spot, tilt, and colour are CSS variables on the slot's class.
export function Hang({ slot, children }) {
  return <div className={`hang hang-${slot}`}><figure className="frame" aria-hidden="true">{children}</figure></div>;
}

export function FxVideo({ poster, src, width, height }) {
  return <video muted loop playsInline preload="none" poster={poster} width={width} height={height} tabIndex={-1} data-fx-video=""><source src={src} type="video/mp4" /></video>;
}
