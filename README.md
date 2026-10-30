# Long HoDac portfolio

A dependency-free static portfolio, with self-hosted fonts and original SVG illustrations.

## Preview

Run `npm run dev`, then open http://127.0.0.1:4173. The server requires Python 3. The site itself does not require Node, Python, or a backend in production.

## Edit

- `dist/index.html`: semantic page content and SVG diagrams.
- `dist/styles.css`: design tokens, typography, responsive layouts, and accessibility preferences.
- `dist/script.js`: the pipeline stage explorer, navigation state, and optional copy-email control.

Run `npm run check` to check JavaScript syntax. No build step is required. Deploy `dist/` as static files. `.openai/hosting.json` stores the existing private Sites project.

## Content sources

Experience and education are based on the supplied résumé, with permission to use its details. The project description and delivery diagram follow https://github.com/Longhodac/log-plat. The 17 fault scenarios and their stated zero-loss outcomes refer to that project's local tests, not production traffic or a guarantee against all failures. The personal process description is based on Long's own account.

Internship diagrams are explicitly simplified conceptual views, not reproductions of internal systems or screenshots.

Fonts: Instrument Sans and IBM Plex Mono, distributed under the SIL Open Font License. Licenses are included in `dist/assets/fonts/`.

## Accessibility and performance

Native landmarks and controls, skip navigation, visible focus, reduced-motion support, no scroll-reveal dependencies, touch targets at least 44px tall, and a vertical pipeline layout on phones. All primary content remains available without JavaScript. No third-party runtime requests, trackers, videos, or animation libraries.
