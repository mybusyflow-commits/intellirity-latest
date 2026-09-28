/* =========================================================
   icons.js — Intellirity icon system
   40+ hand-crafted SVG icons.
   - 24x24 viewbox
   - 1.5px stroke (1.25 too thin at 16px display size)
   - stroke-linecap="round" stroke-linejoin="round"
   - currentColor for fill/stroke
   - consistent optical sizing (icons fit their visual bbox, not the cell)
   ========================================================= */

const wrap = (size, body) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  // Brand
  shield:       '<path d="M12 2.5 L20 5 V12 C20 16.5 16.8 20 12 21.5 C7.2 20 4 16.5 4 12 V5 Z"/>' +
                '<path d="M8.5 12 L11 14.5 L15.5 9.5"/>',

  // Navigation
  overview:     '<rect x="3" y="3" width="7" height="7"/>' +
                '<rect x="14" y="3" width="7" height="7"/>' +
                '<rect x="3" y="14" width="7" height="7"/>' +
                '<rect x="14" y="14" width="7" height="7"/>',
  threat:       '<path d="M12 2.5 L20 5 V12 C20 16.5 16.8 20 12 21.5 C7.2 20 4 16.5 4 12 V5 Z"/>' +
                '<path d="M12 8 V12.5"/>' +
                '<circle cx="12" cy="15.5" r=".6" fill="currentColor"/>',
  search:       '<circle cx="11" cy="11" r="6.5"/>' +
                '<path d="M16 16 L20.5 20.5"/>',
  pulse:        '<path d="M2 12 H6 L9 4 L15 20 L18 12 H22"/>',
  scan:         '<path d="M4 8 V6 A2 2 0 0 1 6 4 H8"/>' +
                '<path d="M16 4 H18 A2 2 0 0 1 20 6 V8"/>' +
                '<path d="M20 16 V18 A2 2 0 0 1 18 20 H16"/>' +
                '<path d="M8 20 H6 A2 2 0 0 1 4 18 V16"/>' +
                '<circle cx="12" cy="12" r="3"/>',
  model:        '<circle cx="12" cy="12" r="8.5"/>' +
                '<circle cx="12" cy="12" r="3"/>' +
                '<path d="M12 3.5 V7 M12 17 V20.5 M3.5 12 H7 M17 12 H20.5"/>',
  policy:       '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>' +
                '<path d="M3.5 9 H20.5 M8 3.5 V9"/>',
  model_audit:  '<path d="M5 3 H15 L19 7 V21 H5 Z"/>' +
                '<path d="M15 3 V7 H19"/>' +
                '<path d="M8 11 H16 M8 14.5 H16 M8 18 H13"/>',
  settings:     '<circle cx="12" cy="12" r="2.5"/>' +
                '<path d="M12 3 V5.5 M12 18.5 V21 M4.2 4.2 L6 6 M18 18 L19.8 19.8 M3 12 H5.5 M18.5 12 H21 M4.2 19.8 L6 18 M18 6 L19.8 4.2"/>',
  docs:         '<path d="M5 3 H14 L19 8 V21 H5 Z"/>' +
                '<path d="M14 3 V8 H19"/>' +
                '<path d="M8 12 H16 M8 15 H16 M8 18 H13"/>',

  // Security features
  jailbreak:    '<path d="M12 2.5 L20 5 V12 C20 16.5 16.8 20 12 21.5 C7.2 20 4 16.5 4 12 V5 Z"/>' +
                '<path d="M9 11 L12 14 L15 8"/>' +
                '<path d="M9 8 L7.5 9.5 M15 17 L16.5 15.5"/>',
  monitoring:   '<rect x="2.5" y="3.5" width="19" height="14" rx="1.5"/>' +
                '<path d="M2.5 9 H21.5"/>' +
                '<path d="M6 14 L9 11 L12 13 L15 9 L18 12"/>' +
                '<path d="M8 21 H16"/>',
  enforcement:  '<path d="M5 4 H19 V8 H5 Z"/>' +
                '<path d="M5 11 H19 V14 H5 Z"/>' +
                '<path d="M5 17 H14 V20 H5 Z"/>',
  code:         '<path d="M8 7 L3.5 12 L8 17"/>' +
                '<path d="M16 7 L20.5 12 L16 17"/>' +
                '<path d="M14 5 L10 19"/>',
  leak:         '<rect x="4" y="9" width="16" height="11" rx="1.5"/>' +
                '<path d="M7 9 V6 C7 3.8 9.2 2 12 2 C14.8 2 17 3.8 17 6 V9"/>' +
                '<circle cx="12" cy="14.5" r="1.5" fill="currentColor"/>',
  flow:         '<circle cx="4" cy="4" r="1.8"/>' +
                '<circle cx="20" cy="4" r="1.8"/>' +
                '<circle cx="4" cy="20" r="1.8"/>' +
                '<circle cx="20" cy="20" r="1.8"/>' +
                '<path d="M5.5 4 H18.5 M4 5.5 V18.5 M20 5.5 V18.5 M5.5 20 H18.5"/>',
  vpi:          '<circle cx="12" cy="9" r="4"/>' +
                '<path d="M9 9 L11 11 L15 6"/>' +
                '<path d="M8 12.5 L7 21 L12 18 L17 21 L16 12.5"/>',
  escrow:       '<circle cx="12" cy="12" r="8.5"/>' +
                '<path d="M12 6.5 V17.5 M7.5 9 H16.5 M7.5 15 H16.5"/>',
  anomaly:      '<path d="M2 6 C5 6 5 9 8 9 S11 6 14 6 S17 9 20 9"/>' +
                '<path d="M2 12 C5 12 5 15 8 15 S11 12 14 12 S17 15 20 15"/>' +
                '<path d="M2 18 C5 18 5 21 8 21 S11 18 14 18 S17 21 20 21"/>' +
                '<circle cx="20" cy="9" r="2" fill="currentColor" stroke="none"/>',

  // Status
  check:        '<path d="M4.5 12 L10 17.5 L19.5 6.5"/>',
  cross:        '<path d="M6 6 L18 18 M18 6 L6 18"/>',
  alert:        '<path d="M12 3 L21 19 H3 Z"/>' +
                '<path d="M12 10 V14"/>' +
                '<circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  info:         '<circle cx="12" cy="12" r="9"/>' +
                '<path d="M12 11 V16"/>' +
                '<circle cx="12" cy="8" r=".6" fill="currentColor"/>',
  lock:         '<rect x="4" y="10" width="16" height="11" rx="1.5"/>' +
                '<path d="M7 10 V7 C7 4.2 9.2 2 12 2 C14.8 2 17 4.2 17 7 V10"/>' +
                '<circle cx="12" cy="15" r="1" fill="currentColor"/>',
  unlock:       '<rect x="4" y="10" width="16" height="11" rx="1.5"/>' +
                '<path d="M7 10 V7 C7 4.2 9.2 2 12 2 C14.8 2 17 4.2 17 7"/>' +
                '<circle cx="12" cy="15" r="1" fill="currentColor"/>',
  bell:         '<path d="M5 17 V11 C5 7.7 7.7 5 11 5 H13 C16.3 5 19 7.7 19 11 V17 L20.5 18.5 H3.5 Z"/>' +
                '<path d="M9.5 20.5 A2.5 2.5 0 0 0 14.5 20.5"/>',

  // UI
  arrow_right:  '<path d="M4 12 H20"/>' +
                '<path d="M14 6 L20 12 L14 18"/>',
  arrow_up_right:'<path d="M7 17 L17 7"/>' +
                  '<path d="M8 7 H17 V16"/>',
  arrow_left:   '<path d="M20 12 H4"/>' +
                '<path d="M10 6 L4 12 L10 18"/>',
  arrow_down:   '<path d="M6 9 L12 15 L18 9"/>',
  plus:         '<path d="M12 5 V19 M5 12 H19"/>',
  minus:        '<path d="M5 12 H19"/>',
  close:        '<path d="M6 6 L18 18 M18 6 L6 18"/>',
  chevron_down: '<path d="M6 9 L12 15 L18 9"/>',
  chevron_right:'<path d="M9 6 L15 12 L9 18"/>',
  chevron_left: '<path d="M15 6 L9 12 L15 18"/>',
  more:         '<circle cx="6" cy="12" r="1.4" fill="currentColor"/>' +
                '<circle cx="12" cy="12" r="1.4" fill="currentColor"/>' +
                '<circle cx="18" cy="12" r="1.4" fill="currentColor"/>',
  download:     '<path d="M12 4 V15 M7 11 L12 16 L17 11"/>' +
                '<path d="M4 19 H20"/>',
  external:     '<path d="M14 5 H19 V10"/>' +
                '<path d="M19 5 L11 13"/>' +
                '<path d="M19 13 V18 A1 1 0 0 1 18 19 H6 A1 1 0 0 1 5 18 V6 A1 1 0 0 1 6 5 H11"/>',
  copy:         '<rect x="8" y="8" width="12" height="12" rx="1.5"/>' +
                '<path d="M16 8 V5 A1 1 0 0 0 15 4 H5 A1 1 0 0 0 4 5 V15 A1 1 0 0 0 5 16 H8"/>',
  filter:       '<path d="M3 5 H21 L14 13 V19 L10 21 V13 Z"/>',
  refresh:      '<path d="M20 8 A8 8 0 0 0 6 6.5"/>' +
                '<path d="M20 4 V8 H16"/>' +
                '<path d="M4 16 A8 8 0 0 0 18 17.5"/>' +
                '<path d="M4 20 V16 H8"/>',
  command:      '<path d="M9 6 A3 3 0 1 0 9 12 V18 M15 6 A3 3 0 1 1 15 12 V18"/>',
  link:         '<path d="M10 14 A4 4 0 0 0 14 18 L17 15 A4 4 0 0 0 17 11"/>' +
                '<path d="M14 10 A4 4 0 0 0 10 6 L7 9 A4 4 0 0 0 7 13"/>' +
                '<path d="M9 15 L15 9"/>',
  user:         '<circle cx="12" cy="8" r="4"/>' +
                '<path d="M4 21 C4 16.6 7.6 13 12 13 C16.4 13 20 16.6 20 21"/>',
  users:        '<circle cx="9" cy="8" r="3.5"/>' +
                '<circle cx="17" cy="9.5" r="2.5"/>' +
                '<path d="M3 20 C3 16.5 5.7 14 9 14 C12.3 14 15 16.5 15 20"/>' +
                '<path d="M15 20 C15 18 16.4 16.5 18 16.5 C19.6 16.5 21 18 21 20"/>',
  play:         '<path d="M7 4.5 V19.5 L19 12 Z" fill="currentColor"/>',
  edit:         '<path d="M4 20 L8 19 L19 8 L16 5 L5 16 Z"/>' +
                '<path d="M14 7 L17 10"/>',
  trash:        '<path d="M4 7 H20 M9 7 V4 H15 V7 M6 7 V20 A1 1 0 0 0 7 21 H17 A1 1 0 0 0 18 20 V7 M10 11 V17 M14 11 V17"/>',
  eye:          '<path d="M2 12 C4 7 8 5 12 5 C16 5 20 7 22 12 C20 17 16 19 12 19 C8 19 4 17 2 12 Z"/>' +
                '<circle cx="12" cy="12" r="3"/>',
  eye_off:      '<path d="M3 3 L21 21"/>' +
                '<path d="M10.5 6.5 C11 6.2 11.5 6 12 6 C16 6 20 8 22 12 C21.3 13.5 20.3 14.7 19 15.6"/>' +
                '<path d="M6.5 6.5 C4 8 2.5 10 2 12 C4 16 8 18 12 18 C13.5 18 14.9 17.7 16 17.2"/>' +
                '<path d="M14 14 A3 3 0 0 1 10 10"/>',
  help:         '<circle cx="12" cy="12" r="9"/>' +
                '<path d="M9 9 A3 3 0 0 1 12 6 C13.7 6 15 7.3 15 9 C15 10.7 13 11 12 12"/>' +
                '<circle cx="12" cy="16" r=".6" fill="currentColor"/>',
  dot:          '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  globe:        '<circle cx="12" cy="12" r="9"/>' +
                '<path d="M3 12 H21 M12 3 C15 6 16 9 16 12 C16 15 15 18 12 21 C9 18 8 15 8 12 C8 9 9 6 12 3 Z"/>',
  send:         '<path d="M21 3 L11 13"/>' +
                '<path d="M21 3 L14 21 L11 13 L3 10 Z"/>',
  book:         '<path d="M4 4 H10 A2 2 0 0 1 12 6 V20 A2 2 0 0 0 10 18 H4 Z"/>' +
                '<path d="M20 4 H14 A2 2 0 0 0 12 6 V20 A2 2 0 0 1 14 18 H20 Z"/>',
  zap:          '<path d="M13 2 L4 14 H11 L10 22 L20 10 H13 Z"/>',
  hash:         '<path d="M5 9 H19 M5 15 H19 M10 4 L8 20 M16 4 L14 20"/>',
  terminal:     '<rect x="3" y="4" width="18" height="16" rx="1.5"/>' +
                '<path d="M7 9 L10 12 L7 15 M12 15 H17"/>',
  activity:     '<path d="M3 12 H7 L10 4 L14 20 L17 12 H21"/>',
  database:     '<ellipse cx="12" cy="5" rx="8" ry="2.5"/>' +
                '<path d="M4 5 V12 C4 13.4 7.6 14.5 12 14.5 C16.4 14.5 20 13.4 20 12 V5"/>' +
                '<path d="M4 12 V19 C4 20.4 7.6 21.5 12 21.5 C16.4 21.5 20 20.4 20 19 V12"/>',
  server:       '<rect x="3" y="3" width="18" height="6" rx="1.5"/>' +
                '<rect x="3" y="11" width="18" height="6" rx="1.5"/>' +
                '<rect x="3" y="19" width="18" height="2" rx="1"/>' +
                '<circle cx="7" cy="6" r=".6" fill="currentColor"/>' +
                '<circle cx="7" cy="14" r=".6" fill="currentColor"/>',
  cloud:        '<path d="M6 17 A4 4 0 0 1 6 9 A6 6 0 0 1 18 9 A4 4 0 0 1 18 17 Z"/>',
  cube:         '<path d="M12 3 L21 8 V16 L12 21 L3 16 V8 Z"/>' +
                '<path d="M3 8 L12 13 L21 8 M12 13 V21"/>',
  layers:       '<path d="M12 3 L21 8 L12 13 L3 8 Z"/>' +
                '<path d="M3 12 L12 17 L21 12"/>' +
                '<path d="M3 16 L12 21 L21 16"/>',
  key:          '<circle cx="8" cy="14" r="4"/>' +
                '<path d="M11 11 L21 1 M18 4 L20 6 M16 6 L18 8"/>',
  unlock_key:   '<circle cx="8" cy="14" r="4"/>' +
                '<path d="M11 11 L20 2 M17 5 L19 7 M15 7 L17 9"/>',
  bolt:         '<path d="M13 3 L5 13 H10 L9 21 L17 11 H12 Z" fill="currentColor"/>',
  cpu:          '<rect x="6" y="6" width="12" height="12" rx="1.5"/>' +
                '<rect x="9" y="9" width="6" height="6" rx=".5"/>' +
                '<path d="M9 2 V4 M12 2 V4 M15 2 V4 M9 20 V22 M12 20 V22 M15 20 V22 M2 9 H4 M2 12 H4 M2 15 H4 M20 9 H22 M20 12 H22 M20 15 H22"/>',
  eye_check:    '<path d="M2 12 C4 7 8 5 12 5 C16 5 20 7 22 12 C20 17 16 19 12 19 C8 19 4 17 2 12 Z"/>' +
                '<path d="M8 12 L11 15 L16 9"/>',
  document:     '<path d="M5 3 H14 L19 8 V21 H5 Z"/>' +
                '<path d="M14 3 V8 H19"/>' +
                '<path d="M8 13 H16 M8 16 H16 M8 10 H12"/>',
  chart:        '<path d="M3 21 H21"/>' +
                '<rect x="5" y="13" width="3" height="6"/>' +
                '<rect x="11" y="9" width="3" height="10"/>' +
                '<rect x="17" y="5" width="3" height="14"/>',
  shield_check: '<path d="M12 2.5 L20 5 V12 C20 16.5 16.8 20 12 21.5 C7.2 20 4 16.5 4 12 V5 Z"/>' +
                '<path d="M8.5 12 L11 14.5 L15.5 9.5"/>',
  sparkles:     '<path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z"/>' +
                '<path d="M19 4 L20 6 L22 7 L20 8 L19 10 L18 8 L16 7 L18 6 Z"/>',
  inbox:        '<path d="M3 13 L6 5 H18 L21 13"/>' +
                '<path d="M3 13 V20 A1 1 0 0 0 4 21 H20 A1 1 0 0 0 21 20 V13"/>' +
                '<path d="M3 13 H9 L10 15 H14 L15 13 H21"/>',
  flag:         '<path d="M5 21 V4 H17 L15 8 L17 12 H5"/>',
  sun:          '<circle cx="12" cy="12" r="4"/>' +
                '<path d="M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6"/>',
  moon:         '<path d="M20 14.5 A8 8 0 1 1 9.5 4 A6 6 0 0 0 20 14.5 Z"/>',
  award:        '<circle cx="12" cy="9" r="6"/>' +
                '<path d="M9 14 L7 22 L12 19 L17 22 L15 14"/>',
  trending:     '<path d="M3 17 L9 11 L13 15 L21 7"/>' +
                '<path d="M15 7 H21 V13"/>',
  trending_down:'<path d="M3 7 L9 13 L13 9 L21 17"/>' +
                '<path d="M15 17 H21 V11"/>'
};

/**
 * Render an icon by name.
 * @param {string} name - key from ICONS
 * @param {number} size - pixel size (default 16)
 */
export function icon(name, size = 16) {
  const body = ICONS[name];
  if (!body) {
    console.warn(`[icons] unknown icon: ${name}`);
    return wrap(size, '<circle cx="12" cy="12" r="9"/>');
  }
  return wrap(size, body);
}

export const ICON_NAMES = Object.keys(ICONS);