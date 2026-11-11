// Everything the page says. Content sources are listed in the README.

export const JOBS = [
  {
    id: 'ibm',
    name: 'IBM',
    dates: 'Aug – Dec 2026',
    timeline: { from: 14, to: 19 },
    title: 'IBM',
    meta: 'Software Developer Intern / Durham, NC / Aug – Dec 2026',
    bullets: [
      'Built a ReAct multi-agent system turning meeting transcripts, Slack & design docs into runbooks for 20+ engineers',
      'Developed a Python MCP server connecting Slack, Teams, and IBM docs to search 100+ runbooks in <100 ms',
      'Improved agent reliability via Langfuse evaluations, debugging retrieval failures and refining prompts and skills',
      'Designed Milvus vector DB schemas for embeddings and metadata; deployed on OpenShift with Jenkins CI/CD',
      'Reviewed teammates’ infrastructure PRs and debugged deployment failures, unblocking internal IBM services'
    ],
    stats: [
      { value: '20+', label: 'engineers served' },
      { value: '100+', label: 'runbooks searchable' },
      { value: '<100 ms', label: 'to search them' }
    ],
    viz: { name: 'runbooks', caption: 'How runbooks get built and searched. An illustration, not measured data.' }
  },
  {
    id: 'workday',
    name: 'Workday',
    dates: 'May – Aug 2026',
    timeline: { from: 11, to: 14 },
    title: 'Workday',
    meta: 'Software Engineer Intern / Pleasanton, CA / May – Aug 2026',
    bullets: [
      'Shipped a LangGraph payroll triage agent for on-call engineers, cutting production incident resolution time 30%',
      'Integrated 20+ MCP, Jira, and CLI tools to automate production investigations, cutting manual triage time 50%',
      'Built a React/TypeScript dashboard for agent monitoring and approvals, integrating Okta SSO for employee sign-in',
      'Wrote Jest unit tests and LangSmith assertions to catch agent approval regressions and incorrect tool-call outputs'
    ],
    stats: [
      { value: '30%', label: 'less incident resolution time', bar: { v: 0.7, from: 1 } },
      { value: '50%', label: 'less manual triage time', bar: { v: 0.5, from: 1 } },
      { value: '20+', label: 'tools integrated' }
    ],
    viz: { name: 'triage', caption: 'One incident, from alert to approved fix. An illustration, not measured data.' }
  },
  {
    id: 'transnode',
    name: 'Transnode AI',
    dates: 'Feb – May 2026',
    timeline: { from: 8, to: 11 },
    title: 'Transnode AI',
    meta: 'Software Engineer Intern, UC Launch Accelerator / Remote / Feb – May 2026',
    bullets: [
      'Owned end-to-end delivery of a React verification portal with Cloud Vision OCR, cutting manual review time 40%',
      'Built Stripe billing APIs with an immutable credit ledger and idempotent webhooks to prevent duplicate charges',
      'Implemented Firebase authentication and RBAC for candidate documents across 7 employer roles and workspaces'
    ],
    stats: [
      { value: '40%', label: 'less manual review time', bar: { v: 0.6, from: 1 } },
      { value: '7', label: 'employer roles with RBAC' }
    ],
    viz: { name: 'billing', caption: 'Document review on top, billing below, where a repeated webhook never reaches the ledger. An illustration, not measured data.' }
  },
  {
    id: 'e4e',
    name: 'Engineers for Exploration',
    dates: 'Jan – May 2026',
    timeline: { from: 7, to: 11 },
    title: 'Engineers for Exploration, UC San Diego',
    meta: 'Research Software Engineer / San Diego, CA / Jan – May 2026',
    bullets: [
      'Built a TypeScript sync API for an iOS field app, achieving 95%+ upload success to AWS S3 with automated retries',
      'Optimized a Rust image-processing library with Rayon parallelism to speed analysis of field-captured fish images'
    ],
    stats: [
      { value: '95%+', label: 'upload success to S3', bar: { v: 0.95, from: 0 } }
    ],
    viz: { name: 'uploads', caption: 'Uploads retry until they land, and images process in parallel. An illustration, not measured data.' }
  },
  {
    id: 'ujima',
    name: 'UJIMA S&P Research',
    dates: 'Jun 2025 – May 2026',
    timeline: { from: 0, to: 11 },
    title: 'UJIMA S&P Research Group, UC San Diego',
    meta: 'Research Software Engineer / San Diego, CA / Jun 2025 – May 2026',
    bullets: [
      'Developed a Flask/PostgreSQL app for 108K face images, finding filters altered model predictions in 46% of cases',
      'Processed 50K+ comments across 3K+ TikTok videos using concurrent Python ETL and Playwright for NLP tasks'
    ],
    stats: [
      { value: '108K', label: 'face images' },
      { value: '50K+', label: 'comments' },
      { value: '3K+', label: 'TikTok videos' }
    ],
    viz: { name: 'waffle', caption: 'How often a filter changed the model’s prediction. Each square is 1% of cases.' }
  }
];

// The timeline's axis labels, positioned in months from Jun 2025.
export const TIMELINE_MARKS = [
  { label: 'Jun 2025' },
  { label: 'Jan 2026', at: 7 },
  { label: 'Dec 2026', at: 19 }
];

// `kind` picks the badge and icon colour. The icon is an 8×8 pixel grid written as one SVG path.
export const PROJECTS = [
  {
    id: 'logplat',
    group: 'Systems',
    kind: 'main',
    badge: 'Main',
    line: 'Seventeen ways to kill it. Zero lost.',
    icon: 'M0 0h8v1h-8zM0 2h5v1h-5zM0 4h8v1h-8zM0 6h6v1h-6z',
    name: 'Log pipeline',
    stack: 'Go · Kafka',
    title: 'Distributed Log Ingestion Pipeline',
    href: 'https://github.com/Longhodac/log-plat',
    meta: 'Main quest / Distributed systems',
    bullets: [
      'Built a Go/Kafka pipeline with durable spooling and idempotent writes, with zero loss in 17 tests on 1.02M logs',
      'Processed 70K logs/sec in local tests, cutting repeat-query latency 23× via Redis caching and OpenSearch indexing'
    ],
    stats: [
      { value: '0', label: 'logs lost' },
      { value: '17', label: 'tests' },
      { value: '1.02M', label: 'logs tested' },
      { value: '70K', label: 'logs/sec, local tests' },
      { value: '23×', label: 'lower repeat-query latency' }
    ],
    viz: { name: 'race', caption: 'The same repeat query, before and after caching. 23× is the measured ratio, and the speed shown is illustrative.' },
    tags: ['Go', 'gRPC', 'Kafka', 'Redis', 'OpenSearch', 'Chaos Testing']
  },
  {
    id: 'hnsw',
    group: 'Systems',
    kind: 'side',
    badge: 'Side',
    line: '45 microseconds. Don’t blink.',
    icon: 'M1 0h4v1h-4zM0 1h1v1h-1zM5 1h1v1h-1zM0 2h1v1h-1zM5 2h1v1h-1zM0 3h1v1h-1zM5 3h1v1h-1zM1 4h4v1h-4zM4 5h2v1h-2zM5 6h2v1h-2zM6 7h2v1h-2z',
    name: 'Vector search',
    stack: 'C++ · HNSW',
    title: 'Low-Latency Vector Search Engine',
    href: 'https://github.com/Longhodac/hnsw-cpp',
    meta: 'Side quest / Systems performance',
    bullets: [
      'Built a C++ HNSW search engine for 1M vectors, reaching 45 µs/query at 95% recall with SIMD and prefetching',
      'Scaled parallel search 4.9× on 10 threads with atomic reads and striped locks; mmap indexes loaded in ∼2 ms'
    ],
    stats: [
      { value: '45 µs', label: 'per query, 95% recall' },
      { value: '4.9×', label: 'on 10 threads' },
      { value: '∼2 ms', label: 'mmap index load' }
    ],
    viz: { name: 'hnsw', caption: 'A real greedy search through layers, on a small sample graph rather than the 1M-vector index.' },
    tags: ['C++', 'HNSW', 'SIMD', 'Concurrency', 'mmap']
  },
  {
    id: 'talentlens',
    group: 'AI & agents',
    kind: 'side',
    badge: 'Side',
    line: 'Two of five became four of five.',
    icon: 'M1 0h5v1h-5zM1 1h1v1h-1zM5 1h2v1h-2zM1 2h1v1h-1zM6 2h1v1h-1zM1 3h1v1h-1zM3 3h2v1h-2zM6 3h1v1h-1zM1 4h1v1h-1zM6 4h1v1h-1zM1 5h1v1h-1zM3 5h2v1h-2zM6 5h1v1h-1zM1 6h1v1h-1zM6 6h1v1h-1zM1 7h6v1h-6z',
    name: 'Resume search',
    stack: 'FAISS · reranking',
    title: 'AI Resume Search with Reranking',
    href: 'https://github.com/anirudh9280/TalentLens_Public',
    meta: 'Side quest / Search and ranking / Team of 5',
    bullets: [
      'Led a 5-person team on resume search for 500+ members, using reranking to lift top-5 matches from 40% to 80%',
      'Built OCR-backed resume search using Tesseract to parse scanned PDFs and FAISS for semantic candidate retrieval'
    ],
    stats: [
      { value: '80%', label: 'top-5 matches, up from 40%', bar: { v: 0.8, from: 0.4 } },
      { value: '500+', label: 'members' },
      { value: '5', label: 'person team' }
    ],
    viz: { name: 'rerank', caption: 'Solid rows are matches. An example ranking showing the measured shift from 2 of 5 to 4 of 5.' },
    tags: ['Python', 'PyTorch', 'FAISS', 'ChromaDB']
  },
  {
    id: 'nebula',
    group: 'AI & agents',
    kind: 'hackathon',
    badge: 'Hackathon',
    line: 'Four tiers. I’m stuck on reading.',
    icon: 'M3 0h1v1h-1zM3 1h1v1h-1zM2 2h3v1h-3zM0 3h7v1h-7zM2 4h3v1h-3zM3 5h1v1h-1zM6 5h1v1h-1zM3 6h1v1h-1zM5 6h3v1h-3zM6 7h1v1h-1z',
    name: 'Nebula',
    stack: 'Study knowledge graph',
    title: 'Nebula Knowledge Graph Study Tracker',
    href: 'https://github.com/andrewy1n/IrvineHacks2026',
    meta: 'Hackathon / Irvine Hacks 2026',
    bullets: [
      'Built a study tool with a team at Irvine Hacks 2026 that turns a course PDF into a live knowledge graph of concepts',
      'Built the web app flow from uploaded PDF to JSON to a D3 force graph, with mastery features that track each concept',
      'Concepts climb four tiers, from reading to recall, written answers, and explaining aloud, fed by a Chrome extension that tracks reading on OpenStax'
    ],
    stats: [
      { value: '4', label: 'mastery tiers' },
      { value: '3', label: 'web app, API, extension' },
      { value: '2', label: 'LLM APIs, extract and grade' }
    ],
    viz: { name: 'nebula', caption: 'One concept climbing the four mastery tiers. An illustration on a made-up graph, not a real course.' },
    tags: ['React', 'TypeScript', 'D3', 'FastAPI', 'SQLite', 'Chrome Extension']
  },
  {
    id: 'stratos',
    group: 'AI & agents',
    kind: 'hackathon',
    badge: 'Hackathon',
    line: 'Five loops, then it answers.',
    icon: 'M0 1h8v1h-8zM0 2h2v1h-2zM6 2h2v1h-2zM0 3h1v1h-1zM2 3h1v1h-1zM5 3h1v1h-1zM7 3h1v1h-1zM0 4h1v1h-1zM3 4h2v1h-2zM7 4h1v1h-1zM0 5h1v1h-1zM7 5h1v1h-1zM0 6h8v1h-8z',
    name: 'STRATOS',
    stack: 'Sponsor outreach agent',
    title: 'STRATOS Sponsor Outreach Agent',
    href: 'https://github.com/Longhodac/STRATOS-SandHacks',
    meta: 'Hackathon / SandHacks 2026',
    bullets: [
      'Built an outreach agent for student clubs at SandHacks that finds sponsors by industry, researches contacts, and drafts emails',
      'Integrated a Groq function-calling loop into the chat sidebar, chaining up to 5 rounds of tool calls across 6 tools',
      'Added the Python agents that research contacts, a Perplexity email lookup and a Selenium site scraper, served by FastAPI'
    ],
    stats: [
      { value: '6', label: 'agent tools' },
      { value: '5', label: 'loop rounds at most' },
      { value: '5', label: 'template bricks per draft' }
    ],
    viz: { name: 'agentloop', caption: 'One request going round the agent loop. An illustration, not a recorded run.' },
    tags: ['React', 'TypeScript', 'Groq', 'FastAPI', 'Perplexity', 'Selenium']
  },
  {
    id: 'droids',
    group: 'Web',
    kind: 'club',
    badge: 'Club',
    line: 'Robots need websites too.',
    icon: 'M3 0h2v1h-2zM3 1h2v1h-2zM1 2h6v1h-6zM1 3h1v1h-1zM3 3h2v1h-2zM6 3h1v1h-1zM1 4h6v1h-6zM1 5h1v1h-1zM6 5h1v1h-1zM1 6h6v1h-6zM2 7h1v1h-1zM5 7h1v1h-1z',
    name: 'Triton Droids',
    stack: 'Robotics club site',
    title: 'Triton Droids Website',
    href: 'https://github.com/triton-droids/website',
    meta: 'Club / Lead Full-Stack Developer / ',
    metaLink: { href: 'https://tritondroids.org/', text: 'tritondroids.org' },
    bullets: [
      'Lead full-stack developer for the website of UC San Diego’s humanoid robotics club, live at tritondroids.org',
      'Shipped 16 pull requests, including the homepage sections, the Join page, and the Humanoid Robot project page',
      'Added 3D robot model viewers, an auto-scrolling gallery, per-page SEO with a sitemap, and page analytics'
    ],
    stats: [
      { value: '16', label: 'pull requests merged' },
      { value: '10', label: 'routes' },
      { value: '3', label: 'device profiles in the test suite' }
    ],
    viz: { name: 'screens', caption: 'One page at the three screen sizes the project’s Playwright suite covers. An illustration.' },
    tags: ['React', 'TypeScript', 'Tailwind', 'Vite', 'Playwright']
  }
];

// The log pipeline's stages, in delivery order. `wire` labels the link to the next stage.
export const STAGES = [
  {
    name: 'agent',
    wire: 'gRPC',
    does: 'Tails log files and gives each line an ID from its file position. Each batch is written to a disk spool with fsync before it’s sent.',
    fails: 'Spooled batches survive the crash. A batch is deleted only after the collector acks it, so anything unacknowledged is resent on restart.'
  },
  {
    name: 'collector',
    wire: 'acks=all',
    does: 'gRPC server. Checks the API key, rejects invalid entries, and publishes to Kafka partitioned by service, waiting for all replicas to confirm.',
    fails: 'It acks the agent only after Kafka confirms the write. No ack means the agent keeps the batch and resends it with exponential backoff.'
  },
  {
    name: 'kafka',
    wire: 'poll',
    does: 'Buffers records between ingestion and indexing, so a slow indexer doesn’t push back on the agents.',
    fails: 'The collector can’t get a confirmed write, so it never acks. Batches stay in the agents’ spools until Kafka is back.'
  },
  {
    name: 'indexer',
    wire: '_bulk',
    does: 'Kafka consumer group. Bulk-writes into daily indices and commits its offsets only after OpenSearch accepts the writes. Records it can’t parse go to a dead-letter topic.',
    fails: 'A crash between the write and the commit means Kafka redelivers those records. They carry the same IDs, so they overwrite the earlier copies.'
  },
  {
    name: 'opensearch',
    does: 'Stores each line as a document keyed by its log ID. The query API on top supports filters by time, service, level, and text, with cursor pagination.',
    fails: 'The indexer retries failed items and holds off on committing, so the records wait in Kafka until OpenSearch recovers.'
  }
];

export const SKILLS = [
  ['Languages', 'Java, Python, C/C++, Go, TypeScript, JavaScript, SQL, Rust, Swift, HTML/CSS'],
  ['Backend & data', 'Distributed Systems, Concurrency, REST APIs, gRPC, Kafka, Redis, PostgreSQL, OpenSearch, Milvus'],
  ['Frameworks & testing', 'React, Node.js, Jest, LangGraph, LangSmith, FAISS, PyTorch, Playwright, Integration Testing'],
  ['Cloud & DevOps', 'AWS (S3, EC2), Docker, Kubernetes, OpenShift, Jenkins, CI/CD, Git, GitHub Actions, Grafana']
];

export const POKE_LINES = ['Hey. Hands off.', 'Careful, choom.', 'Do that again. See what happens.', 'Yes, I’m real enough.', 'Read the page, not me.'];
