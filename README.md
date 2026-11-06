# Long HoDac portfolio

A static site with a retro cyberpunk fan theme: a pixel-art city, Capri from Cyberpunk: Edgerunners 2 drawn as live vector art, and the show's GIFs playing in neon frames hung around the page. There is no build step and no runtime dependency, and everything it loads is self-hosted.

## Preview

Run `npm run dev`, then open http://127.0.0.1:4173. The server requires Python 3. If the port is taken, an earlier server is probably still running. Stop it or run `python3 -m http.server 4174 --directory dist`.

## Edit

- `dist/index.html` holds all page content. Job and project bullets come straight from the résumé.
- `dist/styles.css` holds the design tokens, layout, and motion, split into cascade layers.
- `dist/script.js` runs the tabs, crash demo, copy button, effects toggle, framed pictures, and section tracking. It lazy-loads the diagrams, the city, and Capri.
- `dist/scene.js` draws the pixel city on a low-resolution canvas. Colours are in `STOPS`, and the towers come from seeded random numbers, so they're the same on every visit.
- `dist/viz.js` draws the animated diagrams. Flow diagrams are tables of nodes, wires, and timed moves, so editing one means editing data. Each `<figure data-viz="name">` in the HTML picks one.
- `dist/capri.js` draws and animates Capri and her speech bubble. Where she goes is set in the HTML: each `.perch` element names a pose and a position with `data-pose`, `data-x`, and `data-y`. What she says on arrival is the section's `data-line`.
- `tools/build_art.py` makes the loops, posters, floor, and dither tiles in `dist/assets/art/`. Run `npm run art -- /path/to/sources`. It needs numpy, OpenCV, Pillow, and ffmpeg. The source GIFs and stills are show footage, so they aren't in this repository, and the script lists the file names it expects.

Run `npm run check` to check JavaScript syntax. Deploy `dist/` as static files. `.openai/hosting.json` stores the existing private Sites project.

`dist/assets/art/logo.png` was drawn once from Saira italic, thresholded to pixels. `dist/assets/art/city.png` is a capture of the city, used before JavaScript runs. `dist/assets/social.jpg` is a screenshot of the hero at 1200×630.

## What's pixel art and what isn't

The city, the hero's floor, the logo, the window frames, and the big section titles are pixel art. Capri, the framed GIFs, the sky, the diagrams, and all reading text aren't, so they stay sharp and easy to read.

## Framed pictures

Each GIF plays whole, uncropped and at full length, with VHS-style colour and scanlines but no added motion. The cracked-face picture is a still because it has no GIF.

Each picture has a fixed spot in the gap between two sections, chosen to suit it: Roman looking shocked above Work, the cracked face leading into the crash demo in Projects, the Capri and D fight before About, and D looking up through the embers right above the sky. Each spot is a `.hang` element in the HTML, and its position, tilt, and frame colour are CSS variables on that class. On screens up to 1000px wide each spot becomes its own row, alternating left and right. Frames sit behind the windows, so they can't cover text.

The night sky stays at the end of the page rather than in a frame. It's the first shot of its GIF with the lights made to twinkle, and the small Capri in it is painted out so the live one can stand there looking up.

## How Capri works

She is drawn at full device resolution from the vector model in [capri-companion](https://github.com/TheAgencyMGE/capri-companion): traced, palette-flat shapes for four poses (sit, lie, crouch, and back). On top of those the code adds:

- **One deformation field** for head turns, hair sway, and breath, so neighbouring shapes never tear apart.
- **A live face:** blinks, gaze, squint, happy arcs, blank stare, many eyes, and a zigzag, fang, or teeth mouth.
- **Glitter** clipped to her hair, with two layers fading into each other.
- **Glitch bursts** every few seconds, and a teleport that breaks her into bands and shards when she moves.

She redraws twelve times a second, like limited animation, and twenty-four during effects. After 30 seconds without input she falls asleep and drops to six.

She sits behind the windows and perches on them, so she never covers text. As you scroll she teleports between perches and says a line in a bubble beside her head. The bubble picks whichever side is clear of the windows, and it sits behind them too, so it can't cover text either.

The face is drawn 1.3× larger than the model's, so it reads at this size. `dist/assets/capri/model.json` is a slimmed copy of the repo's model, simplified and rounded to whole units, with a few detached shards removed from the sitting pose.

## Diagrams

Every number in the stat tiles and meters comes from the résumé, and most of them are plain text, so they also work without JavaScript. The pictures explain how each system works and are labelled as illustrations:

- **IBM, Workday, Transnode, Engineers for Exploration:** flow diagrams built from what each bullet describes.
- **UJIMA:** a grid of 100 squares, 46 of which flip, for the 46% of cases where a filter changed the prediction.
- **Log pipeline:** a race where the cached side finishes 23 queries in the time the other finishes one.
- **Vector search:** a real greedy search through a three-layer graph, on a small sample graph rather than the real index.
- **Resume search:** an example ranking that goes from 2 of the top 5 matching to 4 of 5, the measured 40% to 80%.

Everything drawn is a pure function of time, so diagrams loop cleanly and hold one frame when effects are off. They run at 20 fps and only while on screen.

## Licensing and fan content

This is unofficial fan work, and parts of it aren't covered by any license:

- The drawing code in `dist/capri.js` is adapted from capri-companion, under MIT. See `dist/capri-companion-LICENSE.txt`.
- `dist/assets/capri/model.json` is traced from frames of the show, and that repo's MIT license excludes it. Its rights sit with CD PROJEKT RED, Studio Trigger, and Netflix.
- The videos and pictures in `dist/assets/art/` (`crack`, `duel`, `embers`, `roman`, `sky`) are derived from show footage, with the same rights holders. `embers` also includes the show's logo, because it's the whole GIF.

CD PROJEKT RED's fan content guidelines rule out commercial use and ask fan work to carry a notice that it is unofficial. The page doesn't currently show one. The guidelines don't cover Edgerunners material, which also involves Netflix and Studio Trigger. Remove these assets before using this version somewhere that could count as commercial.

Geist, Geist Mono, and Jersey 10 are under the SIL Open Font License, in `dist/assets/fonts/`.

## Content sources

Experience, projects, education, and skills come from Long's résumé. The pipeline notes and chaos scenarios follow https://github.com/Longhodac/log-plat and its `results/README.md`. Those numbers come from local runs on one laptop, not production traffic. The crash simulation on the page is labeled as an illustration of the delivery rules, not measured data.

## Browser features

The page is complete without any of these. They are added with `@supports` or feature checks:

- Scroll-driven animations for the nav progress bar
- `clip`-based overflow, so Capri can hang off the page's edge without creating sideways scrolling

## Accessibility and performance

Semantic landmarks, a skip link, visible focus, and the WAI-ARIA tabs pattern with arrow, Home, and End keys for the job list and the pipeline. The header's effects toggle stops the videos, city, diagrams, simulation, and Capri's movement, and the choice is remembered. Effects start off for `prefers-reduced-motion` and data-saver users. Capri, the city, the framed pictures, and the diagrams are decorative and hidden from screen readers, since the bullets and stat tiles carry the same facts, though her eyes do follow keyboard focus. Without JavaScript all the content still shows, with a still of the city behind it and every job and pipeline note listed.

The city is a low-resolution canvas redrawn on scroll and twelve times a second. Only the largest video on screen plays, because Chrome drops the whole page to about 16 fps while two videos play at once. Everything stops when the tab is hidden.
