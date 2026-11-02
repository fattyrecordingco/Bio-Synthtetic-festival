BIO-SYNTHETIC / short interactive edition

Public website
  https://fattyrecordingco.github.io/Bio-Synthtetic-festival/
Source
  https://github.com/fattyrecordingco/Bio-Synthtetic-festival

Run locally
  npm start
  Open http://localhost:4173. Stop with Ctrl+C.
  Node 18+ is required. No dependency install is needed to run the site.
  Alternatively use: python3 -m http.server 4173

The front page is a single poster-like scene. Programme, listening room, place,
programme note and references open in a reusable panel. Escape or × closes it.
The hand's dial responds to pointer drag, touch, arrow keys, Home/End and Page
Up/Down. The bottom time range is an alternative. Both share the same state.
The [#] control switches the artwork between dither and ASCII. No synth or
plant-data simulation runs. Reduced motion disables the sculpture rotation.

Edit
  index.html                  The short front page and player structure.
  styles.css                  Palette, responsive layout and panel styles.
  stage-ui.js                 Panels, schedule, saved sets, maps and time controls.
  stage-art.js                Live dithering, ASCII and portrait cropping.
  player.js                   One persistent recording player.
  content/festival.json       All artists, encounters, recordings and references.
  content/programme-note.txt  Protected original note: 917 words.
  content/image-credits.json  Image origins and attribution.
  content/artwork.json        Original sculpture generation prompt and credit.
  content/credits.json        Shared curation, assistance and artwork credits.

Images
  Artist photographs and logos come from their credited artist/production pages.
  Download originals: python3 scripts/fetch-portraits.py (uses the internet).
  Originals are stored in ignored assets/raw/. The published web copies are in
  assets/artists/. Dithering and profile crops happen at display time in canvas.
  The generated sculpture is assets/sculpture.webp. Its generation prompt is in
  content/artwork.json; the original PNG is retained in Codex generated_images.
  The Manganiyar image is from The Manganiyar Seduction, an existing production,
  and does not identify a confirmed festival ensemble.

Music
  Nothing loads or plays on arrival. Selecting an artist requests their existing
  recording. Verified Spotify previews can play from that gesture; previews end
  without looping. SoundCloud and YouTube use official controllers. Bandcamp and
  Plantland Radio retain their real service controls. Some browsers and services
  require another play press. The full source link remains available if a service
  is unavailable. No button claims playback until the service reports it.
  Closing a profile keeps music playing; closing the floating player stops it.
  Switching artists stops the previous recording.

Content and booklet
  All 17 original encounters and nine artists are preserved. BECA solo, the
  Manganiyar collaboration and sunrise jugalbandi remain separate. The original
  917-word programme note is unchanged. The booklet includes the full reference
  register, artist-image credits and the public companion link.
  Regenerate: install requirements-docs.txt into a Python virtual environment,
  then run python scripts/build-booklet.py. The script uses editable content
  files and makes no network requests.
  For the local submission, add:
  --declaration "MMT-PlagiarismDeclaration2026 (1).docx"
  This prepends the supplied form and AI-use statement. Student ID, module,
  lecturers, date and signature stay blank for the student. The form and
  Bio-synthetic_Curation_Submission.docx/PDF stay local and are ignored by Git.
  The public booklet omits the personal declaration.
  See ASSIGNMENT-CHECK.txt for the supplied brief and policy limits.

Checks and build (development dependencies only)
  npm install
  npx playwright install chromium
  npm test
  Start the local server, then: npm run test:browser
  Project-path check: SITE_BASE_PATH=/Bio-Synthtetic-festival
  STATIC_DIRECTORY=dist PORT=4174 npm start
  Then use TEST_URL=http://localhost:4174/Bio-Synthtetic-festival/
  npm run test:browser (join the environment values on one command line).
  npm run build
  dist/ contains only the public website and files. Raw images, templates and
  test tools are excluded. Linux browsers may need additional system libraries.

Publication
  This repository publishes directly to GitHub Pages through
  .github/workflows/pages.yml. Each push to main verifies the protected note and
  citations, builds dist/ and deploys the result. No Sites hosting is required.
  GitHub Pages source must be set to GitHub Actions. The workflow and site use
  relative asset paths so the project URL works under /Bio-Synthtetic-festival/.
  content/site.json is the source for the booklet’s public companion URL.

Local repository
  The workspace root is now a checkout of the shared GitHub repository, tracking
  origin/main. Its folder label may still say "curation assignment" in VS Code;
  the configured origin is the festival repository. Work on the root files.
  The original handouts and previous bio-synthetic/ folder are retained locally
  and ignored. They are not the publishing source.

Credits
  Research, concept, curation and BECA: Anshul Jain / adotj, Fatty Recording Co.
  ChatGPT: grammar, paraphrasing supplied research, website and booklet production.
  Central sculpture: built-in OpenAI image generation; live dither/ASCII display.
  Artist sources: content/image-credits.json and the booklet.
  Anton and Space Grotesk: SIL Open Font License (licences in assets/).
  Front-end copy skill: .agents/skills/frontend-copy-cleanup/SKILL.md.
