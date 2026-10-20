// App marks for the simulated computer. Drawn here as simple SVG so the desk reads as the
// tools a real team uses: the company's ERP (Ledgerline), Gmail, Google Calendar, Messages,
// Contacts, and Wake. No image files.

const svg = (vb, body) => '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>';

export const ICONS = {
  gmail: svg('0 0 48 48',
    '<path fill="#4285F4" d="M6 40h7V23L4 16v21c0 1.7 1.3 3 2 3z"/>' +
    '<path fill="#34A853" d="M35 40h7c.7 0 2-1.3 2-3V16l-9 7z"/>' +
    '<path fill="#FBBC04" d="M35 11v12l9-7v-4c0-3.6-4.1-5.6-7-3.5z"/>' +
    '<path fill="#EA4335" d="M13 23V11l11 8.3L35 11v12l-11 8.3z"/>' +
    '<path fill="#C5221F" d="M4 12v4l9 7V11l-2-1.5C8.1 7.4 4 9.4 4 12z"/>'),
  qbo: svg('0 0 48 48',
    '<circle cx="24" cy="24" r="22" fill="#2CA01C"/>' +
    '<path fill="#fff" d="M16.5 15.5a8.5 8.5 0 0 0 0 17h1.2v-3.2h-1.2a5.3 5.3 0 0 1 0-10.6h3v18.8a3.2 3.2 0 0 0 3.2 3.2V15.5zM31.5 32.5a8.5 8.5 0 0 0 0-17h-1.2v3.2h1.2a5.3 5.3 0 0 1 0 10.6h-3V10.5a3.2 3.2 0 0 0-3.2-3.2v25.2z"/>'),
  calendar: svg('0 0 48 48',
    '<rect x="6" y="6" width="36" height="36" rx="3" fill="#fff"/>' +
    '<path fill="#4285F4" d="M6 15V9a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v6z"/>' +
    '<path fill="#EA4335" d="M33 42l9-9h-9z"/><path fill="#FBBC04" d="M42 33V15h-9v18z"/>' +
    '<path fill="#34A853" d="M15 42h18v-9H15z"/><path fill="#188038" d="M6 33v6a3 3 0 0 0 3 3h6v-9z"/>' +
    '<path fill="#1967D2" d="M6 15h9v18H6z"/>' +
    '<text x="24" y="31" text-anchor="middle" font-family="Roboto,Arial,sans-serif" font-weight="700" font-size="13" fill="#4285F4">31</text>'),
  messages: svg('0 0 48 48',
    '<defs><linearGradient id="msgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DF07A"/><stop offset="1" stop-color="#16C42E"/></linearGradient></defs>' +
    '<rect x="2" y="2" width="44" height="44" rx="11" fill="url(#msgG)"/>' +
    '<path fill="#fff" d="M24 11c-8.8 0-16 5.8-16 13 0 4 2.2 7.6 5.7 10-.3 2-1.3 3.9-2.9 5.3 3.2 0 5.9-1.2 7.9-3a19 19 0 0 0 5.3.7c8.8 0 16-5.8 16-13s-7.2-13-16-13z"/>'),
  drive: svg('0 0 48 48',
    '<path fill="#0066DA" d="M6.6 37.2l1.9 3.3c.4.7 1 1.2 1.6 1.6l6.7-11.6H3.3c0 .8.2 1.5.6 2.2z"/>' +
    '<path fill="#00AC47" d="M24 17.4L17.3 5.8c-.7.4-1.2.9-1.6 1.6L3.9 27.7c-.4.7-.6 1.4-.6 2.2h13.4z"/>' +
    '<path fill="#EA4335" d="M37.9 42.1c.7-.4 1.2-.9 1.6-1.6l.8-1.3 3.7-6.4c.4-.7.6-1.4.6-2.2H31.3l2.9 5.6z"/>' +
    '<path fill="#00832D" d="M24 17.4l6.7-11.6c-.7-.4-1.4-.6-2.2-.6h-9c-.8 0-1.6.2-2.2.6z"/>' +
    '<path fill="#2684FC" d="M31.3 29.9H16.7L10 41.5c.7.4 1.4.6 2.2.6h23.6c.8 0 1.6-.2 2.2-.6z"/>' +
    '<path fill="#FFBA00" d="M37.8 18.1l-6.2-10.7c-.4-.7-1-1.2-1.6-1.6l-6.7 11.6 7.3 12.5h13.3c0-.8-.2-1.5-.6-2.2z"/>'),
  sheets: svg('0 0 48 48',
    '<path fill="#0F9D58" d="M29 4H12a3 3 0 0 0-3 3v34a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3V14z"/>' +
    '<path fill="#87CEAC" d="M29 4v7a3 3 0 0 0 3 3h7z"/>' +
    '<path fill="#F1F1F1" d="M16 22v14h16V22zm2 2h5v3h-5zm0 5h5v5h-5zm12 5h-5v-5h5zm0-7h-5v-3h5z"/>'),
  docs: svg('0 0 48 48',
    '<path fill="#4285F4" d="M29 4H12a3 3 0 0 0-3 3v34a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3V14z"/>' +
    '<path fill="#A1C2FA" d="M29 4v7a3 3 0 0 0 3 3h7z"/>' +
    '<path fill="#F1F1F1" d="M16 22h16v2H16zm0 5h16v2H16zm0 5h16v2H16zm0 5h11v2H16z"/>'),
  contacts: svg('0 0 48 48',
    '<circle cx="24" cy="24" r="22" fill="#1A73E8"/>' +
    '<circle cx="24" cy="19" r="7" fill="#fff"/><path fill="#fff" d="M11 36c1.5-6 7-9 13-9s11.5 3 13 9a17 17 0 0 1-26 0z"/>'),
  wake: svg('0 0 48 48',
    '<defs><linearGradient id="wkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="1" stop-color="#4F46E5"/></linearGradient></defs>' +
    '<rect x="2" y="2" width="44" height="44" rx="11" fill="url(#wkG)"/>' +
    '<path fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M11 17l5.5 15 7.5-15 7.5 15L37 17"/>'),
  erp: svg('0 0 48 48',
    '<rect x="2" y="2" width="44" height="44" rx="11" fill="#1F3A5C"/>' +
    '<rect x="11" y="27" width="6" height="10" rx="1.5" fill="#7FB2E5"/><rect x="21" y="19" width="6" height="18" rx="1.5" fill="#A9CCF0"/><rect x="31" y="12" width="6" height="25" rx="1.5" fill="#fff"/>'),
  folder: svg('0 0 24 24', '<path fill="#5F6368" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z"/>'),
};

// Small UI glyphs, Material-style outlines.
const g = (d, vb = '0 0 24 24') => svg(vb, '<path fill="currentColor" d="' + d + '"/>');
export const GLYPH = {
  menu: g('M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z'),
  search: g('M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z'),
  inbox: g('M19 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 12h-4a3 3 0 0 1-6 0H5V5h14z'),
  star: g('M22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2l5.5 4.7L5.8 21 12 17.3l6.2 3.7-1.6-7.1z'),
  clock: g('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z'),
  send: g('M2 21l21-9L2 3v7l15 2-15 2z'),
  file: g('M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z'),
  label: g('M17.6 5.8A2 2 0 0 0 16 5H5a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h11c.7 0 1.3-.3 1.6-.8L22 12z'),
  back: g('M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z'),
  archive: g('M20.5 5.2l-1.4-1.7A1.5 1.5 0 0 0 18 3H6c-.5 0-.9.2-1.2.5L3.5 5.2A2 2 0 0 0 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5c0-.5-.2-.9-.5-1.3zM12 17.5L6.5 12H10v-2h4v2h3.5zM5.1 5l.8-1h12l.9 1z'),
  trash: g('M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z'),
  more: g('M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'),
  reply: g('M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z'),
  print: g('M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zm-3 11H8v-5h8zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-1-9H6v4h12z'),
  attach: g('M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z'),
  plus: g('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'),
  check: g('M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'),
  chevL: g('M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z'),
  chevR: g('M10 6L8.6 7.4 13.2 12l-4.6 4.6L10 18l6-6z'),
  chevD: g('M7.4 8.6L12 13.2l4.6-4.6L18 10l-6 6-6-6z'),
  home: g('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'),
  chart: g('M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z'),
  bank: g('M4 10v7h3v-7zm6 0v7h3v-7zM2 22h19v-3H2zm14-12v7h3v-7zM11.5 1L2 6v2h19V6z'),
  tag: g('M21.4 11.6l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .6.2 1.1.6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM5.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'),
  people: g('M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0h-1c1.2.8 2 2 2 3.5V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z'),
  receipt: g('M18 17H6v-2h12zm0-4H6v-2h12zm0-4H6V7h12zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2z'),
  grid: g('M4 8h4V4H4zm6 12h4v-4h-4zm-6 0h4v-4H4zm0-6h4v-4H4zm6 0h4v-4h-4zm6-10v4h4V4zm-6 4h4V4h-4zm6 6h4v-4h-4zm0 6h4v-4h-4z'),
  sparkle: g('M12 2l2.1 6.4L20.5 10.5l-6.4 2.1L12 19l-2.1-6.4L3.5 10.5l6.4-2.1zM19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z'),
  wifi: g('M1 9l2 2a12.7 12.7 0 0 1 18 0l2-2a15.6 15.6 0 0 0-22 0zm8 8l3 3 3-3a4.2 4.2 0 0 0-6 0zm-4-4l2 2a7 7 0 0 1 10 0l2-2a9.9 9.9 0 0 0-14 0z'),
  battery: g('M2 7h17a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm1 2v6h12V9zm18 1h1.5v4H21z'),
  lock: g('M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9z'),
  refresh: g('M17.7 6.3A8 8 0 1 0 19.7 14h-2.1A6 6 0 1 1 12 6c1.7 0 3.1.7 4.2 1.8L13 11h7V4z'),
  video: g('M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-3.5l4 4v-11z'),
  pin: g('M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'),
  flag: g('M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z'),
  note: g('M3 17.2V21h3.8L17.8 10l-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.8z'),
};
