// Bundles the engines, content and interface into one self-contained page.
//   dist/index.html     the deployable site (download, email and print enabled)
//   dist/artifact.html  the same build as an embeddable fragment for preview hosts
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = await build({ entryPoints: ['src/ui/app.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = readFileSync('src/ui/styles.css', 'utf8') + '\n' + readFileSync('src/ui/arcade/arcade.css', 'utf8');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Press+Start+2P&family=VT323&display=swap">';
const body = (host) => `<title>The Wake Experience</title>\n${fonts}\n<style>\n${css}</style>\n<div id="wx" class="wx arcade"></div>\n<script>window.WAKE_HOST=${JSON.stringify(host)};window.WAKE_CONFIG=window.WAKE_CONFIG||{logEndpoint:""};</script>\n<script>\n${js}</script>\n`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="Run a company through one Monday morning. Then see what was happening underneath it.">\n</head>\n<body>\n${body('web')}</body>\n</html>\n`);
writeFileSync('dist/artifact.html', body('artifact'));
console.log('built dist/index.html', (js.length / 1024).toFixed(0) + ' KB js');
