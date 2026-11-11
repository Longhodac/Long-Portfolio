import { Fragment, useRef, useState } from 'react';
import { PROJECTS } from '../content.js';
import { useTabs } from '../hooks/useTabs.js';
import { Bullets, NEW_TAB, Perch, SectionTitle, Stats, Tags, Viz, Window } from './parts.jsx';
import { Pipeline } from './Pipeline.jsx';
import { cx } from './cx.js';

const COUNT = PROJECTS.length;
const neighbour = (index, step) => (index + step + COUNT) % COUNT;

// The quest board: an index of projects grouped by field, and the open project beside it.
// The pips in the title bar fill in as projects are opened, and the pager steps through them in order.
export function Projects({ effectsOn, say }) {
  const board = useRef(null);
  const [opened, setOpened] = useState(() => new Set([0]));

  const onSelect = index => {
    const firstVisit = !opened.has(index);
    const next = new Set(opened).add(index);
    setOpened(next);
    if (board.current.getBoundingClientRect().top < document.querySelector('.nav').offsetHeight) board.current.scrollIntoView();
    say(firstVisit && next.size === COUNT ? 'Full clear. Completionist.' : PROJECTS[index].line);
  };
  const { enhanced, selected, select, tabProps, panelHidden } = useTabs(COUNT, onSelect);

  const pips = enhanced && (
    <>
      {PROJECTS.map((project, i) => <b key={project.id} className={opened.has(i) ? 'is-seen' : ''}></b>)}
      <span>{`${opened.size}/${COUNT}`}</span>
    </>
  );

  return (
    <section id="projects" className="section" aria-labelledby="projects-title" data-perch-section="" data-line="Crash something. I dare you.">
      <div className="column">
        <SectionTitle id="projects-title">Projects</SectionTitle>

        <div className="win-wrap">
          <Perch pose="sit" x="0.86" y="0" wide={{ pose: 'crouch', x: '1.14', y: '0.3' }} />
          <Window windowRef={board} className={cx('board', enhanced && 'is-enhanced')} title="Quest board" data-tabs=""
            bar={<span className="board-pips" aria-hidden="true">{pips}</span>}>
            <div className="board-body">
              <div className="board-side">
                <div className="board-rail" role="tablist" aria-label="Projects" aria-orientation="vertical">
                  {PROJECTS.map((project, i) => (
                    <Fragment key={project.id}>
                      {project.group !== PROJECTS[i - 1]?.group && <p className="board-group" aria-hidden="true">{project.group}</p>}
                      <button className="board-tab" id={`tab-${project.id}`} aria-controls={`quest-${project.id}`} data-kind={project.kind} data-line={project.line} {...tabProps(i)}>
                        <svg className="board-icon" viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges"><path d={project.icon} /></svg>
                        <b>{project.name}</b><span>{project.stack}</span><em>{project.badge}</em>
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div className="board-main">
                {PROJECTS.map((project, i) => (
                  <div key={project.id} className="board-panel" role="tabpanel" id={`quest-${project.id}`} aria-labelledby={`tab-${project.id}`} tabIndex={0} hidden={panelHidden(i)}>
                    <h3 className="project-title" id={`${project.id}-title`}><a href={project.href} target="_blank" rel="noopener noreferrer">{project.title}<span className="sr-only"> on GitHub (opens in a new tab)</span></a></h3>
                    <p className="meta">{project.meta}{project.metaLink && <a className="link" href={project.metaLink.href} target="_blank" rel="noopener noreferrer">{project.metaLink.text}{NEW_TAB}</a>}</p>
                    <Bullets items={project.bullets} />
                    <Stats items={project.stats} row />
                    <Viz {...project.viz} />
                    <Tags items={project.tags} />
                    {project.id === 'logplat' && <LogPlatExtras effectsOn={effectsOn} say={say} />}
                  </div>
                ))}

                <div className="board-pager" hidden={!enhanced}>
                  {[-1, 1].map(step => (
                    <button key={step} className="board-step" type="button" data-step={step} onClick={() => select(neighbour(selected, step))}>
                      <span className="sr-only">{step < 0 ? 'Previous project: ' : 'Next project: '}</span><b>{enhanced ? PROJECTS[neighbour(selected, step)].name : ''}</b>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Window>
        </div>
      </div>
    </section>
  );
}

function LogPlatExtras({ effectsOn, say }) {
  return (
    <>
      <Pipeline effectsOn={effectsOn} say={say} />

      <details className="details">
        <summary>How it was tested</summary>
        <div className="details-body">
          <p>Each chaos scenario writes 60,000 lines at 3,000 lines/s, injects a fault four seconds in, heals it, and then runs the checker. All 17 passed with zero missing lines in three full runs, using the whole stack in Docker on one laptop.</p>
          <dl className="scenarios">
            <dt>Process kills</dt><dd>SIGKILL the collector, Kafka, the indexer, the agent, or OpenSearch.</dd>
            <dt>Network faults</dt><dd>Toxiproxy cuts the links to the collector, Kafka, and OpenSearch, adds 800 ms of latency, resets connections, throttles Kafka to 50 KB/s, and blackholes OpenSearch.</dd>
            <dt>Forced duplicates</dt><dd>Drop the collector’s acks, or kill the indexer after a write but before its offset commit. These fail unless OpenSearch absorbs the redundant writes.</dd>
            <dt>Crash loops</dt><dd>Kill the collector and the indexer three times each, and kill every service in sequence.</dd>
          </dl>
          <p>The throughput limit is the indexer’s poll, write, commit cycle, not the agents or the collector.</p>
          <p><a className="link" href="https://github.com/Longhodac/log-plat/blob/main/results/README.md" target="_blank" rel="noopener noreferrer">Results and raw output{NEW_TAB}</a></p>
        </div>
      </details>
    </>
  );
}
