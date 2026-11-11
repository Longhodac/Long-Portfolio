import { JOBS, TIMELINE_MARKS } from '../content.js';
import { useTabs } from '../hooks/useTabs.js';
import { Bullets, Perch, SectionTitle, Stats, Viz, Window } from './parts.jsx';
import { cx } from './cx.js';

// The quest log: one tab per job, with a timeline that lights the open one.
export function Work() {
  const { enhanced, selected, tabProps, panelHidden } = useTabs(JOBS.length);
  return (
    <section id="work" className="section" aria-labelledby="work-title" data-perch-section="" data-line="Five quests so far.">
      <div className="column">
        <SectionTitle id="work-title">Work</SectionTitle>
        <div className="win-wrap">
          <Perch pose="sit" x="0.84" y="0" />
          <Window className={cx('quest', enhanced && 'is-enhanced')} title="Quest log" data-tabs="">
            <div className="quest-tabs" role="tablist" aria-label="Jobs" aria-orientation="horizontal">
              {JOBS.map((job, i) => (
                <button key={job.id} id={`tab-${job.id}`} aria-controls={`job-${job.id}`} {...tabProps(i)}><b>{job.name}</b><span>{job.dates}</span></button>
              ))}
            </div>
            <div className="timeline" aria-hidden="true">
              {JOBS.map((job, i) => (
                <i key={job.id} className={enhanced && i === selected ? 'is-current' : undefined} style={{ '--from': job.timeline.from, '--to': job.timeline.to }}></i>
              ))}
              <p>{TIMELINE_MARKS.map(mark => <span key={mark.label} style={mark.at === undefined ? undefined : { '--at': mark.at }}>{mark.label}</span>)}</p>
            </div>
            {JOBS.map((job, i) => (
              <div key={job.id} className="quest-panel" role="tabpanel" id={`job-${job.id}`} aria-labelledby={`tab-${job.id}`} tabIndex={0} hidden={panelHidden(i)}>
                <h3>{job.title}</h3>
                <p className="meta">{job.meta}</p>
                <Bullets items={job.bullets} />
                <Stats items={job.stats} />
                <Viz {...job.viz} />
              </div>
            ))}
          </Window>
        </div>
      </div>
    </section>
  );
}
