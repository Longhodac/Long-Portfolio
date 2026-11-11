import { Fragment, useRef, useState } from 'react';
import { STAGES } from '../content.js';
import { useTabs } from '../hooks/useTabs.js';
import { useDeliverySim } from '../hooks/useDeliverySim.js';
import { cx } from './cx.js';

// The log pipeline's stages as tabs, with a crash button that shows a failure only makes lines wait.
export function Pipeline({ effectsOn, say }) {
  const { enhanced, selected, tabProps, panelHidden, tabs } = useTabs(STAGES.length);
  const root = useRef(null);
  const canvas = useRef(null);
  const line = useRef(null);
  const { down, counts, toggle } = useDeliverySim({ effectsOn, root, canvas, line, tabs });
  const [status, setStatus] = useState('');
  const name = STAGES[selected].name;
  const live = enhanced && effectsOn;

  const crash = () => {
    if (toggle(selected)) {
      setStatus(`${name} is down. Lines wait and none are lost.`);
      say('Nothing lost. Told you.');
    } else {
      setStatus(`${name} restarted. Waiting lines move again.`);
    }
  };

  return (
    <div ref={root} className={cx('pipeline', enhanced && 'is-enhanced')} data-tabs="" role="group" aria-labelledby="pipeline-caption">
      <p id="pipeline-caption" className="pipeline-caption"><b>Pipeline</b> <span>Select a stage to see what happens when it fails</span></p>
      <div className="stages" role="tablist" aria-label="Pipeline stages" aria-orientation="horizontal">
        <canvas ref={canvas} className="stages-canvas" aria-hidden="true" hidden={enhanced && !effectsOn}></canvas>
        {STAGES.map((stage, i) => (
          <Fragment key={stage.name}>
            <button className={cx('stage', down.has(i) && 'is-down')} id={`tab-${stage.name}`} aria-controls={`panel-${stage.name}`} {...tabProps(i)}>{stage.name}</button>
            {stage.wire && <span ref={i === 0 ? line : undefined} className="edge" aria-hidden="true"><span>{stage.wire}</span></span>}
          </Fragment>
        ))}
      </div>
      <div className="sim" hidden={!live}>
        <div className="sim-controls">
          <button className={cx('btn crash', down.has(selected) && 'is-down')} type="button" onClick={crash}>{down.has(selected) ? 'Restart ' : 'Crash '}<span className="crash-name">{name}</span></button>
          <p className="sim-readout" aria-hidden="true"><span>read <b data-count="read">{counts.read}</b></span><span>indexed <b data-count="indexed">{counts.indexed}</b></span><span>in flight <b data-count="waiting">{counts.read - counts.indexed}</b></span><span>lost <b data-count="lost">0</b></span></p>
          <p className="sim-note">An illustration of the delivery rules, not measured data.</p>
          <p className="sr-only sim-status" role="status">{status}</p>
        </div>
        <div className={cx('crt', down.size > 0 && 'is-paged')} aria-hidden="true"><img src="/assets/art/roman.jpg" alt="" width="840" height="494" loading="lazy" decoding="async" /><span className="crt-label"></span></div>
      </div>
      {STAGES.map((stage, i) => (
        <div key={stage.name} className="stage-panel" role="tabpanel" id={`panel-${stage.name}`} aria-labelledby={`tab-${stage.name}`} tabIndex={0} hidden={panelHidden(i)}>
          <h4 className="panel-title">{stage.name}</h4>
          <dl>
            <dt>Does</dt><dd>{stage.does}</dd>
            <dt>If it fails</dt><dd>{stage.fails}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}
