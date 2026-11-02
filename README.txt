BIO-SYNTHETIC — website source

Run
  Open a terminal in this folder and run:
    node scripts/serve.mjs
  Open http://localhost:4173
  Stop with Ctrl+C. Requires Node 18 or newer, no install or build step.
  Alternatively: python3 -m http.server 4173

The website needs a local HTTP server to read its content files. Double-clicking
index.html will not load those files. The public companion is published with Sites; source is maintained in the supplied GitHub repository.

Edit
  content/festival.json       Artists, schedule, listening references, spaces,
                              source links, verified preview URLs and credits.
  content/programme-note.txt  Original 917-word note, separate from all other copy.
  index.html                 Page structure and short interface text.
  styles.css                 Colours, typography, layout and responsive rules.
  art.js                     Original ASCII hands, leaves and synth illustration.
  scripts/draw-foliage.py     Rebuild assets/foliage.svg with Python 3.
  app.js                     Schedule, profiles, map, time and saved journey.
  player.js                  Persistent recording player and service integrations.

Music
  Nothing loads or plays on page arrival. Selecting an artist requests playback
  in the floating player. Verified Spotify previews play after that click when
  the browser permits it. These are excerpts, not full songs or festival audio.
  SoundCloud and YouTube request playback through their official APIs.
  Bandcamp has no public remote playback API: its real controls stay visible,
  requiring play in its own iframe. Browser policies, location, service consent
  and availability can also require a second press. No fabricated playback state.
  Switching artists stops the prior recording. Closing a profile keeps music
  running; closing the floating player stops it. Preview endings do not loop.
  The original streaming links remain available if a preview is unavailable.

Local assets
  Artwork, styles, scripts, content, booklet and fonts are stored here. Streaming
  services, recordings, external sources and the optional regional map need the
  internet. Nothing is uploaded. No analytics or external requests on arrival.
  Saved schedule choices use browser localStorage; nothing leaves the browser.

Booklet
  The downloadable DOCX preserves the supplied 917-word note, schedule and
  submission details. Its old cover picture is removed; references, project
  attribution, Spotify artist link and public companion link are reconciled.
  It contains the complete website reference register. Rebuild it with:
    python3 scripts/build-booklet.py
  The two original files one folder above are untouched.
  See ASSIGNMENT-CHECK.txt for the supplied brief and verification findings.

Checks (development only)
  npm install
  npx playwright install chromium
  npm test
  Start the local server, then: npm run test:browser
  Browser checks use Playwright and axe-core. Linux Chromium may need system
  libraries; run npx playwright install-deps chromium if your machine needs them.
  These packages are not needed to run the website.

Credits
  Festival concept, BECA and original note: Anshul Jain / adotj, Fatty Recording Co.
  ChatGPT assisted with the rebuild, original vector/ASCII artwork and tests.
  Anton and Space Grotesk: SIL Open Font License; licences in assets/.
  Music remains on its original services, credited and linked to the artists.
  The installed frontend-copy-cleanup skill is at:
  .agents/skills/frontend-copy-cleanup/SKILL.md (also installed in Codex).

Publishable output
  npm run build writes the static site into dist/. It includes only the public
  website, assets, reference register and assignment check, not tools or templates.
  .openai/hosting.json identifies its public Sites host. The source repository is
  https://github.com/fattyrecordingco/Bio-Synthtetic-festival
