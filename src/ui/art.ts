/**
 * Scene art — self-contained inline SVG vignettes keyed by `room.art`.
 *
 * Style: a nod to early-1980s vector/flood-fill adventure illustration —
 * bold flat colour regions, hard ink outlines, a limited punchy palette, on
 * the classic 256×192 (4:3) frame — modernised with crisp vectors, a soft
 * sky gradient, a faint scanline wash and vignette. These are ORIGINAL
 * compositions (spec §3/§7: evoke the era's look, never copy its artwork);
 * no external assets, so they ship in the static bundle and work offline.
 *
 * The markup here is authored by us (never user input), so rendering it as
 * innerHTML in the UI layer is safe.
 */

const INK = '#141019';

/**
 * Frame a scene: sky gradient, an ink-outlined body group (every solid shape
 * gets the hand-drawn outline for free), then scanline + vignette + border
 * overlays. `extra` is drawn above the outlined group without an outline
 * (glows, stars, ripples).
 */
function scene(
  id: string,
  sky: [string, string],
  body: string,
  extra = '',
): string {
  return `<svg viewBox="0 0 256 192" role="img" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/>
      <stop offset="1" stop-color="${sky[1]}"/>
    </linearGradient>
    <pattern id="scan-${id}" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="1.5" fill="#000" opacity="0.10"/>
    </pattern>
    <radialGradient id="vig-${id}" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.62" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.34"/>
    </radialGradient>
  </defs>
  <rect width="256" height="192" fill="url(#sky-${id})"/>
  <g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    ${body}
  </g>
  <g stroke="none">${extra}</g>
  <rect width="256" height="192" fill="url(#scan-${id})"/>
  <rect width="256" height="192" fill="url(#vig-${id})"/>
  <rect x="2" y="2" width="252" height="188" rx="7" fill="none" stroke="${INK}" stroke-width="2.5" opacity="0.55"/>
</svg>`;
}

const ART: Record<string, string> = {
  // A cosy hall: hearth on the left, round green door on the right.
  hall: scene('hall', ['#3b2c1e', '#241812'], `
    <path d="M8 132 h240 v60 h-240 z" fill="#7a5230"/>
    <path d="M8 40 q120 -34 240 0 v92 q-120 -22 -240 0 z" fill="#5b3d22"/>
    <rect x="20" y="86" width="72" height="52" rx="4" fill="#1a1410"/>
    <path d="M56 132 q-16 -20 -2 -38 q6 12 10 14 q-2 -18 8 -26 q0 20 8 26 q8 8 4 24 z" fill="#e0642a"/>
    <path d="M56 132 q-9 -13 -1 -25 q5 9 8 12 q0 -10 5 -15 q0 14 4 20 z" fill="#f4c033"/>
    <circle cx="198" cy="98" r="40" fill="#3f9f4a"/>
    <circle cx="198" cy="98" r="7" fill="#f2d04b"/>
    <rect x="120" y="96" width="30" height="30" rx="4" fill="#f2d04b"/>
    <path d="M120 111 h30 M135 96 v30" stroke="${INK}" stroke-width="2"/>`),

  // Under-cellar / tunnels: stone vault, ale barrels, a hung lamp.
  cellar: scene('cellar', ['#33302a', '#171410'], `
    <path d="M0 44 q128 -30 256 0 v10 q-128 -24 -256 0 z" fill="#26221b"/>
    <g fill="#7a4e26">
      <rect x="70" y="96" width="48" height="72" rx="12"/>
      <rect x="128" y="96" width="48" height="72" rx="12"/>
      <rect x="99" y="44" width="48" height="54" rx="11"/>
    </g>
    <g stroke="${INK}" stroke-width="2">
      <path d="M70 120 h48 M128 120 h48 M99 66 h48"/>
    </g>
    <rect x="36" y="30" width="4" height="40" fill="#2a2018"/>
    <path d="M28 68 h20 l5 18 h-30 z" fill="#caa24a"/>`, `
    <ellipse cx="38" cy="96" rx="26" ry="20" fill="#f2d04b" opacity="0.22"/>
    <circle cx="38" cy="80" r="5" fill="#fff0b0"/>`),

  // A round green door set in a green hill under a bright sky.
  door: scene('door', ['#8fd0e6', '#cfeaf2'], `
    <path d="M0 118 q128 -46 256 0 v74 h-256 z" fill="#4aa84a"/>
    <path d="M0 150 q128 -30 256 0 v42 h-256 z" fill="#2f7d32"/>
    <circle cx="128" cy="140" r="46" fill="#6b4a2a"/>
    <circle cx="128" cy="140" r="40" fill="#3f9f4a"/>
    <circle cx="150" cy="140" r="6" fill="#f2d04b"/>
    <path d="M128 100 v80 M88 140 h80" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="60" cy="120" r="13" fill="#f2d04b"/>
    <circle cx="196" cy="120" r="13" fill="#f2d04b"/>
    <path d="M124 186 q-18 -22 -60 -22" fill="none" stroke="#cdb083" stroke-width="8"/>`),

  // The road at dusk winding into hills; a signpost.
  road: scene('road', ['#f2a65a', '#5a4570'], `
    <circle cx="200" cy="48" r="20" fill="#f7e39a"/>
    <path d="M0 118 q80 -26 150 -6 t106 -8 v88 h-256 z" fill="#6a5a3a"/>
    <path d="M0 148 q90 -22 160 -2 t96 -6 v52 h-256 z" fill="#463a26"/>
    <path d="M104 192 q26 -50 24 -70 q-2 -18 26 -30 l14 8 q-26 10 -24 26 q2 22 -20 66 z" fill="#d8bd86"/>
    <path d="M128 122 q0 -18 26 -30" fill="none" stroke="#efdcab" stroke-width="2" stroke-dasharray="4 8"/>
    <rect x="70" y="96" width="4" height="30" fill="#3a2a18"/>
    <rect x="52" y="90" width="30" height="10" rx="2" fill="#8a5a2b"/>`),

  // The dragon's hall: a red beast coiled on a heap of gold.
  fire: scene('fire', ['#3a1414', '#160a0c'], `
    <path d="M0 150 q128 -26 256 0 v42 h-256 z" fill="#3a2110"/>
    <g fill="#f2d04b">
      <path d="M20 168 l16 -20 l16 20 z"/>
      <path d="M44 172 l22 -30 l22 30 z"/>
      <path d="M150 170 l20 -26 l20 26 z"/>
      <path d="M186 172 l18 -22 l18 22 z"/>
    </g>
    <path d="M60 150 q-6 -46 40 -54 q40 -6 60 18 q18 18 -2 34 q-30 -20 -50 -6 q22 -2 28 12 q-40 8 -74 -4 z" fill="#c23b2c"/>
    <path d="M160 114 q22 -20 40 -10 q-14 6 -18 20 q-14 -8 -22 -10 z" fill="#c23b2c"/>
    <circle cx="150" cy="118" r="4" fill="#f2d04b"/>`, `
    <ellipse cx="128" cy="164" rx="120" ry="20" fill="#f2a83a" opacity="0.16"/>`),

  // A stony ford: a bright river over flat stones.
  ford: scene('ford', ['#8fd0e6', '#bfe6f0'], `
    <path d="M0 96 q128 -20 256 0 v18 h-256 z" fill="#4aa84a"/>
    <path d="M0 112 h256 v58 h-256 z" fill="#3f8fd0"/>
    <path d="M0 150 q128 -14 256 0 v42 h-256 z" fill="#2f7d32"/>
    <g fill="#9aa2ad">
      <ellipse cx="70" cy="134" rx="20" ry="8"/>
      <ellipse cx="132" cy="146" rx="24" ry="9"/>
      <ellipse cx="196" cy="132" rx="18" ry="7"/>
    </g>`, `
    <g stroke="#dff0f6" stroke-width="2" fill="none" opacity="0.7">
      <path d="M12 126 q20 -5 40 0 t40 0"/>
      <path d="M150 140 q20 -5 40 0 t50 0"/>
    </g>`),

  // The great wood: black trunks and a narrow path.
  wood: scene('wood', ['#2f3b28', '#141c14'], `
    <path d="M0 150 q128 -20 256 0 v42 h-256 z" fill="#16220f"/>
    <g fill="#233018">
      <path d="M24 192 q6 -120 14 -136 q8 16 14 136 z"/>
      <path d="M96 192 q5 -140 12 -158 q8 18 12 158 z"/>
      <path d="M176 192 q5 -128 12 -146 q7 18 12 146 z"/>
      <path d="M232 192 q5 -120 10 -136 q6 16 10 136 z"/>
    </g>
    <path d="M120 192 q16 -46 12 -78" fill="none" stroke="#3f4a30" stroke-width="10"/>`, `
    <circle cx="132" cy="40" r="14" fill="#cfe0b0" opacity="0.22"/>`),

  // The high pass: angular grey peaks with snow caps.
  pass: scene('pass', ['#bcccd8', '#6f7c8c'], `
    <path d="M0 120 L58 44 L104 96 L150 30 L206 104 L256 60 L256 192 L0 192 Z" fill="#5c6879"/>
    <path d="M0 150 L52 96 L110 150 L166 92 L224 150 L256 120 L256 192 L0 192 Z" fill="#454f5e"/>
    <g fill="#eef3f7">
      <path d="M58 44 l14 22 l-28 0 z"/>
      <path d="M150 30 l16 24 l-32 0 z"/>
    </g>
    <path d="M96 192 q40 -40 40 -74" fill="none" stroke="#8b96a4" stroke-width="9"/>`),

  // The hidden haven: lamplit halls and a waterfall under stars.
  haven: scene('haven', ['#1c2447', '#0c1024'], `
    <path d="M0 120 q128 -26 256 0 v72 h-256 z" fill="#233163"/>
    <path d="M0 150 q128 -22 256 0 v42 h-256 z" fill="#141d3f"/>
    <g fill="#f2d04b">
      <rect x="52" y="120" width="9" height="14" rx="2"/>
      <rect x="72" y="116" width="9" height="18" rx="2"/>
      <rect x="176" y="122" width="9" height="12" rx="2"/>
      <rect x="196" y="118" width="9" height="16" rx="2"/>
    </g>`, `
    <g fill="#eef2ff">
      <circle cx="40" cy="26" r="1.5"/><circle cx="96" cy="18" r="1.3"/>
      <circle cx="150" cy="30" r="1.6"/><circle cx="208" cy="20" r="1.3"/>
      <circle cx="228" cy="40" r="1.5"/><circle cx="120" cy="44" r="1.1"/>
    </g>
    <rect x="150" y="40" width="7" height="86" fill="#cfe0f5" opacity="0.6"/>
    <circle cx="66" cy="112" r="7" fill="#ffe89a" opacity="0.6"/>
    <circle cx="190" cy="112" r="7" fill="#ffe89a" opacity="0.6"/>`),
};

// Parchment-map fallback for any unmapped / missing art key.
const FALLBACK = scene('map', ['#dcc79a', '#bda06e'], `
  <rect x="26" y="24" width="204" height="144" rx="5" fill="#ecdbb0"/>
  <path d="M60 132 q46 -40 80 -18 t70 -60" fill="none" stroke="#7a5c34" stroke-width="2.5" stroke-dasharray="4 7"/>
  <circle cx="60" cy="132" r="5" fill="#7a5c34"/>
  <path d="M206 56 l9 4 l-9 5 z" fill="#7a5c34"/>
  <path d="M150 96 l6 -12 l6 12 l-6 -5 z" fill="#9a5a3a"/>`);

export function artFor(key: string | undefined): string {
  if (!key) return FALLBACK;
  return ART[key] ?? FALLBACK;
}
