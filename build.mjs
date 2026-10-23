// Bundles the engines, content and interface into one self-contained page.
//   dist/index.html     the deployable site (download, email and print enabled)
//   dist/artifact.html  the same build as an embeddable fragment for preview hosts
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

const out = await build({ entryPoints: ['src/ui/app.js'], bundle: true, format: 'iife', minify: !process.env.DEV, write: false, target: 'es2020', legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = ['src/ui/styles.css', 'src/ui/round1.css', 'src/ui/round2.css', 'src/ui/os/os.css', 'src/ui/os/erp.css', 'src/ui/clean.css', 'src/ui/scenes.css'].map((f) => readFileSync(f, 'utf8')).join('\n');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Press+Start+2P&display=swap">';
const body = (host) => `<title>The Wake Experience</title>\n${fonts}\n<style>\n${css}</style>\n<div id="wx" class="wx cl-root"></div>\n<script>window.WAKE_HOST=${JSON.stringify(host)};window.WAKE_CONFIG=window.WAKE_CONFIG||${JSON.stringify({ logEndpoint: '', bookUrl: process.env.WAKE_BOOK_URL || 'https://cal.com/bliztic/wake' })};</script>\n<script>\n${js}</script>\n`;

mkdirSync('dist', { recursive: true });
rmSync('dist/art', { recursive: true, force: true });
cpSync('src/dashboard.html', 'dist/dashboard.html'); // the team's private runs dashboard, at /dashboard
cpSync('media', 'dist/media', { recursive: true }); // the recorded intro, at /media/wake-intro.mp4
writeFileSync('dist/index.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="Run a company through one Monday morning. Then see what was happening underneath it.">\n</head>\n<body>\n${body('web')}</body>\n</html>\n`);
writeFileSync('dist/artifact.html', body('artifact'));
console.log('built dist/index.html', (js.length / 1024).toFixed(0) + ' KB js');
