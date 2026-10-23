// THE INTRO
// The 15-second intro video (media/wake-intro.mp4, with a WebM copy for browsers without H.264),
// played full screen after the Start screen and from "Watch the intro" on the title. Both start
// from a click, so it plays with sound; if a browser still blocks sound it plays muted with a
// Sound on button. Skip is always there, and if the video can't play the title follows.

import { h } from './art.js';

export const INTRO_SRC = 'media/wake-intro.mp4';
const WEBM = 'media/wake-intro.webm';

export function playIntro({ mount, onDone }) {
  const video = h('video', { class: 'iv-video', playsinline: '', preload: 'auto' },
    h('source', { src: INTRO_SRC, type: 'video/mp4' }), h('source', { src: WEBM, type: 'video/webm' }));
  const sound = h('button', { class: 'iv-btn', type: 'button', hidden: true }, 'Sound on');
  const skip = h('button', { class: 'iv-btn', type: 'button' }, 'Skip intro');
  const bar = h('i');
  mount(h('main', { class: 'sc-screen iv' }, video, h('div', { class: 'iv-ctl' }, sound, skip), h('div', { class: 'iv-prog' }, bar)));

  let done = false;
  const key = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); finish(); } };
  const stop = () => { done = true; window.removeEventListener('keydown', key); try { video.pause(); } catch (e) { /* fine */ } };
  function finish() { if (done) return; stop(); if (onDone) onDone(); }
  window.addEventListener('keydown', key);
  skip.onclick = finish;
  sound.onclick = () => { video.muted = false; sound.hidden = true; video.play().catch(() => {}); };
  video.addEventListener('ended', finish);
  video.lastChild.addEventListener('error', finish);
  video.addEventListener('timeupdate', () => { if (video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%'; });
  // with sound if the browser allows it, otherwise muted with a way to turn it on
  video.play().catch(() => { video.muted = true; sound.hidden = false; return video.play(); }).catch(finish);
  return stop;
}
