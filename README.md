# BIO–SYNTHETIC

[Festival website](https://fattyrecordingco.github.io/Bio-Synthtetic-festival/) · [GitHub repository](https://github.com/fattyrecordingco/Bio-Synthtetic-festival)

A hypothetical overnight festival curated by Anshul Jain / adotj for Fatty Recording Co. All artist invitations and commissions are proposals. The programme note remains **917 words**, with all 17 encounters and 36 references preserved.

## Run locally

```sh
npm start
```

Open http://localhost:4173/. Node 18+ is required; running the site needs no dependency installation. Alternatively, run `python3 -m http.server 4173`.

## Files

| Location | Contents |
| --- | --- |
| `index.html`, `styles.css` | Website structure, layout and theme colours |
| `stage-ui.js`, `stage-art.js`, `player.js` | Interactions, artwork and music player |
| `content/` | Editable artists, schedule, programme note, references and credits |
| `assets/` | Published images, fonts, font licences and downloadable booklet |
| `docs/assignment-check.txt` | Check against the assignment brief |
| `scripts/` | Local server, build and document tools |
| `tests/` | Content, interaction, accessibility and responsive-layout checks |
| `.github/workflows/pages.yml` | GitHub Pages publishing workflow |
| `.agents/skills/` | Requested interface-copy cleanup skill |
| `source-material/` | Local original HTML, original assignment, MMT form and original images; excluded from Git and publishing |
| `submission/` | Final local Word report and PDF; excluded from Git and publishing |

Edit festival details in `content/festival.json`, the note in `content/programme-note.txt`, and shared acknowledgements in `content/credits.json`. Image attribution is in `content/image-credits.json`; the sculpture generation record is in `content/artwork.json`. Hosting details live in `content/site.json`.

The knob and time slider share state. Drag, touch or use arrow keys, Home/End and Page Up/Down. `[#]` switches between dithering and ASCII. Artwork and artist portraits follow the theme colours defined in `styles.css`. Reduced motion disables rotation. Escape closes the reading panel.

## Booklet and submission

The public booklet is `assets/Bio-synthetic-booklet.docx`. The local submission includes the supplied MMT declaration first; personal fields and signature remain for the student to fill.

To regenerate the booklet with Python:

```sh
python -m pip install -r requirements-docs.txt
python scripts/build-booklet.py
```

To also regenerate the local submission:

```sh
python scripts/build-booklet.py --declaration "source-material/MMT-PlagiarismDeclaration2026.docx"
```

This writes `submission/Bio-synthetic_Curation_Submission.docx`. Export the completed document to PDF in Word after filling the form. The generator makes no network requests. The public booklet omits the personal declaration.

## Check and build

```sh
npm ci
npx playwright install chromium
npm test
npm start
```

With the server running, use a second terminal:

```sh
npm run test:browser
npm run build
```

Linux browsers may need Playwright's system libraries. Browser checks write disposable results to `test-results/`. `dist/` and `node_modules/` are generated and excluded from Git.

To check the GitHub Pages project path locally:

```sh
SITE_BASE_PATH=/Bio-Synthtetic-festival STATIC_DIRECTORY=dist PORT=4174 npm start
TEST_URL=http://localhost:4174/Bio-Synthtetic-festival/ npm run test:browser
```

Each push to `main` checks the content, builds `dist/` and publishes through GitHub Actions. The build includes only public site files; `source-material/` and `submission/` stay local. The public assignment-check download retains its existing URL.

## Recordings and credits

Nothing plays on arrival. Artist selection requests an existing recording. Some streaming services require another play press; source links remain available. Closing a profile preserves playback; closing the player stops it. Live festival commissions and existing recordings are distinct.

Research, concept, curation and BECA: Anshul Jain / adotj. ChatGPT assisted with grammar, paraphrasing supplied research, and website and booklet production. The hand-and-leaf illustration used OpenAI image generation. Artist photographs and logos have separate source credits; Anton and Space Grotesk use the SIL Open Font License.
