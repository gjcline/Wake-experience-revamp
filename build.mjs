// Bundles the engines, content and interface into one self-contained page.
//   dist/index.html     the deployable site (download, email and print enabled)
//   dist/artifact.html  the same build as an embeddable fragment for preview hosts
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

const out = await build({ entryPoints: ['src/ui/app.js'], bundle: true, format: 'iife', minify: !process.env.DEV, write: false, target: 'es2020', legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = ['src/ui/styles.css', 'src/ui/round1.css', 'src/ui/round2.css', 'src/ui/os/os.css', 'src/ui/os/erp.css', 'src/ui/clean.css', 'src/ui/scenes.css', 'src/ui/ink.css'].map((f) => readFileSync(f, 'utf8')).join('\n');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Press+Start+2P&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">';
// The description already used on the page. OG, twitter, and the crawlable intro repeat it; they do not invent copy.
const description = 'Run a company for one Monday morning. Then run the same morning again with Wake, and see how the week turns out.';
const intro = (host) => host === 'web' ? `<main class="screen"><h1>The Wake Experience</h1><p>${description}</p><noscript><p>This interactive experience needs JavaScript.</p></noscript></main>` : '';
const body = (host) => `${host === 'web' ? '' : '<title>The Wake Experience</title>\n'}${fonts}\n<style>\n${css}</style>\n<div id="wx" class="wx cl-root">${intro(host)}</div>\n<script>window.WAKE_HOST=${JSON.stringify(host)};window.WAKE_CONFIG=window.WAKE_CONFIG||${JSON.stringify({ logEndpoint: '', bookUrl: process.env.WAKE_BOOK_URL || 'https://cal.com/bliztic/wake' })};</script>\n<script>\n${js}</script>\n`;

mkdirSync('dist', { recursive: true });
rmSync('dist/art', { recursive: true, force: true });
cpSync('src/dashboard.html', 'dist/dashboard.html'); // the team's private runs dashboard, at /dashboard
cpSync('media', 'dist/media', { recursive: true }); // the recorded intro, the logo, and the share preview (og.jpg)
writeFileSync('dist/index.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="${description}">\n<meta name="theme-color" content="#0b0b0b">\n<link rel="icon" type="image/png" sizes="32x32" href="/media/icon-32.png">\n<link rel="apple-touch-icon" href="/media/icon-180.png">\n<link rel="canonical" href="https://experience.wakepe.com/">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Wake">\n<meta property="og:title" content="The Wake Experience">\n<meta property="og:description" content="${description}">\n<meta property="og:url" content="https://experience.wakepe.com/">\n<meta property="og:image" content="https://experience.wakepe.com/media/og.jpg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="The Wake Experience: run a company for one Monday morning">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="The Wake Experience">\n<meta name="twitter:description" content="${description}">\n<meta name="twitter:image" content="https://experience.wakepe.com/media/og.jpg">\n<title>The Wake Experience</title>\n</head>\n<body>\n${body('web')}</body>\n</html>\n`);
writeFileSync('dist/artifact.html', body('artifact'));
console.log('built dist/index.html', (js.length / 1024).toFixed(0) + ' KB js');
