BIO-SYNTHETIC / short interactive edition

Public website
  https://bio-synthetic-first-light.fatty-record-8662.chatgpt.site
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
  Regenerate: python3 scripts/build-booklet.py
  See ASSIGNMENT-CHECK.txt for the supplied brief and policy limits.

Checks and build (development dependencies only)
  npm install
  npx playwright install chromium
  npm test
  Start the local server, then: npm run test:browser
  npm run build
  dist/ contains only the public website and files. Raw images, templates and
  test tools are excluded. Linux browsers may need additional system libraries.

Publication
  Source is mirrored to the supplied GitHub repository. Sites serves the public
  website identified by .openai/hosting.json. A GitHub push alone does not publish
  a new Sites version. Keep public access unchanged on subsequent updates.

Credits
  Concept, curation and BECA: Anshul Jain / adotj, Fatty Recording Co.
  ChatGPT: research, drafting, code and design assistance.
  Central sculpture: built-in OpenAI image generation; live dither/ASCII display.
  Artist sources: content/image-credits.json and the booklet.
  Anton and Space Grotesk: SIL Open Font License (licences in assets/).
  Front-end copy skill: .agents/skills/frontend-copy-cleanup/SKILL.md.
