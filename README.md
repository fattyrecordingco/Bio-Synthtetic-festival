BIO-SYNTHETIC — Fatty Recording Co.

[Open the festival website](https://fattyrecordingco.github.io/Bio-Synthtetic-festival/)

A short interactive festival poster with dithered artist portraits, a hand-and-leaf artwork and compact programme panels. Curated by Anshul Jain / adotj. All festival invitations and commissions are hypothetical.

This repository is the website’s source and publishing location. GitHub Actions checks the programme and builds `dist/`; GitHub Pages publishes it after each push to `main`. The workflow is [.github/workflows/pages.yml](.github/workflows/pages.yml).

Run locally with `npm start` (Node 18+, no install required), then open http://localhost:4173/. Use `npm run build` for the static output. See [README.txt](README.txt) for editing, music-service behaviour and browser checks.

The programme note remains exactly **917 words**. The downloadable booklet includes the reference register and image credits. [ASSIGNMENT-CHECK.txt](ASSIGNMENT-CHECK.txt) records the brief check; [content/sources.txt](content/sources.txt) contains the references.

The original assignment handouts and the earlier `bio-synthetic/` checkout remain local and are ignored by Git. Work on the files at this repository’s root. Its `origin` is `https://github.com/fattyrecordingco/Bio-Synthtetic-festival.git`.

To test GitHub Pages project-path handling locally:

```sh
npm run build
SITE_BASE_PATH=/Bio-Synthtetic-festival STATIC_DIRECTORY=dist PORT=4174 npm start
```

Open http://localhost:4174/Bio-Synthtetic-festival/. Hosting URLs and the project path are recorded in [content/site.json](content/site.json).
