'use strict';

// Core content and navigation work without JavaScript.
const header = document.querySelector('.site-header');
const topMarker = document.getElementById('top');
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-scrolled', !entry.isIntersecting);
  }).observe(topMarker);

  const navigation = [...document.querySelectorAll('nav a')];
  const sections = [...document.querySelectorAll('main section[id]')];
  // Keep the navigation location visible without polling scroll position.
  const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navigation.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-15% 0px -45% 0px' });
  sections.forEach(section => sectionObserver.observe(section));
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) navigation.forEach(link => link.removeAttribute('aria-current'));
  }, { threshold: 0.3 }).observe(document.querySelector('.hero'));
}

const stageDetails = {
  agent: ['01 / Agent', 'Each batch is written to a disk spool before it is sent. The agent holds on to it until the collector confirms that Kafka has accepted it.'],
  collector: ['02 / Collector', 'The collector validates incoming entries and publishes them to Kafka. It acknowledges the agent only after Kafka confirms the write, so an unconfirmed batch can be retried.'],
  kafka: ['03 / Kafka', 'Kafka buffers the records between ingestion and indexing. If the indexer stops before committing its offsets, Kafka delivers those records again when it resumes.'],
  indexer: ['04 / Indexer', 'The indexer writes records in bulk and commits its Kafka offsets only after OpenSearch accepts them. Failed writes are retried; unreadable records go to a dead-letter topic.'],
  search: ['05 / OpenSearch', 'Each document uses a stable ID derived from the log line’s file position. A retry overwrites the same document instead of creating a duplicate. A REST API provides filtered search.']
};
const stageButtons = [...document.querySelectorAll('[data-stage]')];
const description = document.getElementById('stage-description');
document.querySelector('.pipeline-diagram').classList.add('is-interactive');
stageButtons.forEach(button => {
  button.disabled = false;
  button.addEventListener('click', () => {
    const detail = stageDetails[button.dataset.stage];
    stageButtons.forEach(stage => {
      const active = stage === button;
      stage.classList.toggle('is-active', active);
      stage.setAttribute('aria-pressed', String(active));
    });
    description.querySelector('.stage-detail-number').textContent = detail[0];
    description.querySelector('p').textContent = detail[1];
  });
});

const copyButton = document.querySelector('.copy-button');
const copyStatus = document.querySelector('.copy-status');
if (navigator.clipboard && window.isSecureContext) {
  copyButton.classList.add('is-available');
  let clearStatus;
  copyButton.addEventListener('click', async () => {
    clearTimeout(clearStatus);
    try {
      await navigator.clipboard.writeText('lhodac@ucsd.edu');
      copyStatus.textContent = 'Email copied.';
    } catch {
      copyStatus.textContent = 'Select the address to copy it.';
    }
    clearStatus = setTimeout(() => { copyStatus.textContent = ''; }, 5000);
  });
}
