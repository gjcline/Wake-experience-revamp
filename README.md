# The Wake Experience

A playable business simulation. One static page, no backend.

## Deploy to Vercel

    tar -xzf wake-experience.tar.gz
    cd wake-experience
    npm install
    npm test          # 16 path and credibility tests
    npx vercel --prod

Vercel runs `npm run build` and serves `dist/`. A prebuilt `dist/index.html` is included,
so you can also open that file directly or drop it on any static host.

## Change the content

Everything a visitor reads lives in `src/content/`. Edit, then `npm test && npm run build`.
See ARCHITECTURE.md for how the pieces fit.
