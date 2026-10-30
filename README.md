# Long HoDac portfolio

A dependency-free static site with self-hosted fonts.

## Preview

Run `npm run dev`, then open http://127.0.0.1:4173. The server requires Python 3. If the port is taken, an earlier server is probably still running; stop it or run `python3 -m http.server 4174 --directory dist`.

## Edit

- `dist/index.html` holds all page content, including the log-plat pipeline and its per-stage failure notes.
- `dist/styles.css` holds the design tokens (light and dark), typography, and the one mobile breakpoint.
- `dist/script.js` turns the pipeline stages into keyboard-accessible tabs and adds the copy-email button. Without it, every stage's notes are shown in a list.

Run `npm run check` to check JavaScript syntax. There is no build step. Deploy `dist/` as static files. `.openai/hosting.json` stores the existing private Sites project.

`dist/assets/social.png` is rendered from `social.svg`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1200,630 --screenshot="$PWD/dist/assets/social.png" "file://$PWD/dist/assets/social.svg"
```

## Content sources

Experience and education come from Long's résumé. The log-plat description, pipeline notes, chaos scenarios, and throughput figure follow https://github.com/Longhodac/log-plat and its `results/README.md`. Those numbers come from local runs on one laptop, not production traffic.

Fonts: Instrument Sans and IBM Plex Mono, under the SIL Open Font License. Licenses are in `dist/assets/fonts/`.

## Accessibility

Semantic landmarks, a skip link, visible focus, 44px touch targets on navigation, the WAI-ARIA tabs pattern with arrow, Home, and End keys for the pipeline, `prefers-reduced-motion` and `forced-colors` support, and no third-party requests.
