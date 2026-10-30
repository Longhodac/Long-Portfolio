'use strict';

// Everything on the page works without JavaScript. This adds the pipeline tabs and the copy button.
const pipeline = document.querySelector('.pipeline');
const tabs = [...pipeline.querySelectorAll('[role="tab"]')];
const edges = [...pipeline.querySelectorAll('.edge')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

function select(index, focus) {
  tabs.forEach((tab, i) => {
    const active = i === index;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    panels[i].hidden = !active;
  });
  // Light the path up to the selected stage, one hop after another.
  edges.forEach((edge, i) => {
    edge.style.setProperty('--delay', `${i * 50}ms`);
    edge.classList.toggle('is-reached', i < index);
  });
  if (focus) tabs[index].focus();
}

const keyTargets = {
  ArrowRight: i => (i + 1) % tabs.length,
  ArrowDown: i => (i + 1) % tabs.length,
  ArrowLeft: i => (i - 1 + tabs.length) % tabs.length,
  ArrowUp: i => (i - 1 + tabs.length) % tabs.length,
  Home: () => 0,
  End: () => tabs.length - 1
};

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(i, false));
  tab.addEventListener('keydown', event => {
    const target = keyTargets[event.key];
    if (!target) return;
    event.preventDefault();
    select(target(i), true);
  });
});
pipeline.classList.add('is-enhanced');
select(0, false);

const copyButton = document.querySelector('.copy');
const copyStatus = document.querySelector('.copy-status');
if (navigator.clipboard && window.isSecureContext) {
  copyButton.hidden = false;
  let clearStatus;
  copyButton.addEventListener('click', async () => {
    clearTimeout(clearStatus);
    try {
      await navigator.clipboard.writeText('lhodac@ucsd.edu');
      copyStatus.textContent = 'Copied';
    } catch {
      copyStatus.textContent = 'Couldn’t copy';
    }
    clearStatus = setTimeout(() => { copyStatus.textContent = ''; }, 3000);
  });
}
