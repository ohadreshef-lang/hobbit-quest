/**
 * Scene art keyed by `room.art`. Each entry is a self-contained inline SVG
 * vignette — no external assets, so it ships in the static bundle and works
 * offline. Swap or extend freely without touching the engine; the engine
 * only ever hands us the `art` key.
 *
 * The markup here is authored by us (never user input), so rendering it as
 * innerHTML in the UI layer is safe.
 */

// A shared frame: sky gradient + soft vignette. `body` is the scene content.
function scene(id: string, sky: [string, string], body: string): string {
  return `<svg viewBox="0 0 480 240" role="img" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/>
      <stop offset="1" stop-color="${sky[1]}"/>
    </linearGradient>
    <radialGradient id="vig-${id}" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="480" height="240" fill="url(#sky-${id})"/>
  ${body}
  <rect width="480" height="240" fill="url(#vig-${id})"/>
</svg>`;
}

const ART: Record<string, string> = {
  // A comfortable hall: fire on the left, round green door on the right.
  hall: scene('hall', ['#3a2c1c', '#241a10'], `
    <rect y="150" width="480" height="90" fill="#4a361f"/>
    <path d="M0 150 Q240 60 480 150 L480 0 L0 0 Z" fill="#2c2114"/>
    <rect x="34" y="96" width="96" height="66" rx="4" fill="#1b130b"/>
    <ellipse cx="82" cy="162" rx="52" ry="12" fill="#d9a441" opacity="0.25"/>
    <path d="M82 158 q-16 -22 0 -40 q10 14 8 24 q10 -6 8 -18 q14 20 0 34 z" fill="#f0b13a"/>
    <path d="M82 158 q-8 -14 0 -26 q6 10 0 26 z" fill="#ffe08a"/>
    <circle cx="392" cy="150" r="52" fill="#3f6f3a"/>
    <circle cx="392" cy="150" r="52" fill="none" stroke="#2c4d29" stroke-width="4"/>
    <circle cx="392" cy="150" r="6" fill="#d9a441"/>
    <path d="M210 168 l0 -46 q18 -8 34 0 l0 46 z" fill="#5b4326"/>
    <rect x="208" y="164" width="40" height="10" rx="3" fill="#3f2e1a"/>`),

  // The cellar: barrels and a lamp glow under a stone vault.
  cellar: scene('cellar', ['#2a2620', '#171310'], `
    <path d="M0 60 Q240 8 480 60 L480 0 L0 0 Z" fill="#211d17"/>
    <g fill="#5a3f22" stroke="#3a2915" stroke-width="3">
      <rect x="150" y="120" width="70" height="96" rx="14"/>
      <rect x="228" y="120" width="70" height="96" rx="14"/>
      <rect x="188" y="60" width="70" height="70" rx="12"/>
    </g>
    <g stroke="#3a2915" stroke-width="3">
      <line x1="150" y1="150" x2="220" y2="150"/>
      <line x1="228" y1="150" x2="298" y2="150"/>
      <line x1="188" y1="90" x2="258" y2="90"/>
    </g>
    <line x1="70" y1="0" x2="70" y2="70" stroke="#2a2018" stroke-width="3"/>
    <circle cx="70" cy="86" r="18" fill="#d9a441" opacity="0.3"/>
    <path d="M62 74 h16 l4 16 h-24 z" fill="#caa24a"/>
    <circle cx="70" cy="82" r="5" fill="#ffe08a"/>`),

  // Bag End's round green door on the hillside at dusk.
  door: scene('door', ['#c9873f', '#6d4a2c'], `
    <path d="M0 150 Q240 96 480 150 L480 240 L0 240 Z" fill="#3f5d34"/>
    <path d="M0 178 Q240 140 480 178 L480 240 L0 240 Z" fill="#2f4a28"/>
    <circle cx="240" cy="176" r="60" fill="#6b4a2a"/>
    <circle cx="240" cy="176" r="54" fill="#3f7f3a"/>
    <circle cx="240" cy="176" r="54" fill="none" stroke="#2b5a29" stroke-width="5"/>
    <circle cx="264" cy="176" r="7" fill="#e7c24a"/>
    <circle cx="120" cy="150" r="16" fill="#f2c14e"/>
    <circle cx="360" cy="150" r="16" fill="#f2c14e"/>
    <path d="M232 236 Q210 210 150 210" stroke="#caa877" stroke-width="10" fill="none" opacity="0.8"/>`),

  // The Great East Road winding into wild hills at nightfall.
  road: scene('road', ['#e0a24a', '#4a3a5c'], `
    <circle cx="380" cy="70" r="26" fill="#f6e2a0" opacity="0.85"/>
    <path d="M0 150 Q120 110 260 138 T480 120 L480 240 L0 240 Z" fill="#5a4a34"/>
    <path d="M0 185 Q160 150 300 176 T480 168 L480 240 L0 240 Z" fill="#3c3122"/>
    <path d="M205 240 Q250 176 252 150 Q254 126 306 118" fill="none" stroke="#cdae7c" stroke-width="26" opacity="0.75" stroke-linecap="round"/>
    <path d="M205 240 Q250 176 252 150 Q254 126 306 118" fill="none" stroke="#e6cf9c" stroke-width="3" stroke-dasharray="6 14"/>
    <line x1="150" y1="150" x2="150" y2="120" stroke="#2c2016" stroke-width="4"/>
    <rect x="120" y="112" width="34" height="10" rx="2" fill="#7a5c34"/>`),

  // The trolls' clearing: a great fire, dark woods, a looming shadow.
  fire: scene('fire', ['#241a2c', '#120c16'], `
    <g fill="#0f1a10">
      <path d="M0 150 l30 -50 l24 40 l26 -60 l30 70 z"/>
      <path d="M360 150 l28 -60 l26 46 l24 -40 l30 54 z"/>
    </g>
    <path d="M0 176 Q240 150 480 176 L480 240 L0 240 Z" fill="#0c1a0e"/>
    <path d="M404 176 q-6 -70 26 -78 q34 8 26 78 z" fill="#080a08" opacity="0.9"/>
    <circle cx="422" cy="104" r="5" fill="#d98b6f" opacity="0.8"/>
    <circle cx="440" cy="106" r="5" fill="#d98b6f" opacity="0.8"/>
    <ellipse cx="210" cy="196" rx="90" ry="18" fill="#d9a441" opacity="0.28"/>
    <path d="M210 200 q-30 -34 -6 -70 q6 22 16 26 q-4 -30 10 -44 q-2 30 14 40 q10 12 6 30 q-8 22 -40 18 z" fill="#e8641f"/>
    <path d="M210 198 q-18 -22 -2 -48 q4 16 12 22 q0 -18 8 -28 q2 26 10 34 q6 12 0 22 z" fill="#f4b13a"/>
    <path d="M208 196 q-8 -14 0 -30 q6 12 4 30 z" fill="#ffe58c"/>
    <rect x="176" y="198" width="70" height="8" rx="3" fill="#3a2a1a"/>`),

  // A stony ford: a river over flat stones under a bright sky.
  ford: scene('ford', ['#8fb8d6', '#5b7fa0'], `
    <path d="M0 120 Q240 96 480 120 L480 160 L0 160 Z" fill="#3f6d4a"/>
    <rect y="150" width="480" height="90" fill="#4a7fa6"/>
    <g stroke="#bcd8ea" stroke-width="3" opacity="0.7" fill="none">
      <path d="M20 176 q40 -6 80 0 t80 0"/>
      <path d="M240 196 q40 -6 80 0 t120 0"/>
      <path d="M60 214 q40 -6 80 0 t80 0"/>
    </g>
    <g fill="#9a9186">
      <ellipse cx="140" cy="182" rx="26" ry="10"/>
      <ellipse cx="240" cy="200" rx="30" ry="11"/>
      <ellipse cx="340" cy="184" rx="24" ry="9"/>
    </g>`),

  // The wildwood: crowded dark trunks and a narrow path.
  wood: scene('wood', ['#2c3a28', '#141d14'], `
    <path d="M0 180 Q240 156 480 180 L480 240 L0 240 Z" fill="#1a2716"/>
    <g fill="#20301c">
      <path d="M40 240 q10 -140 20 -160 q10 20 20 160 z"/>
      <path d="M150 240 q8 -170 18 -190 q10 20 18 190 z"/>
      <path d="M300 240 q8 -150 18 -172 q10 22 18 172 z"/>
      <path d="M420 240 q8 -160 16 -180 q8 20 16 180 z"/>
    </g>
    <path d="M230 240 Q250 190 244 150" fill="none" stroke="#3a4a30" stroke-width="14" stroke-linecap="round"/>
    <circle cx="250" cy="70" r="18" fill="#cfe0b0" opacity="0.25"/>`),

  // The high pass: cold grey peaks against a thin sky.
  pass: scene('pass', ['#b8c4d0', '#6b7788'], `
    <path d="M0 200 L120 70 L200 150 L300 40 L400 160 L480 90 L480 240 L0 240 Z" fill="#5c6675"/>
    <path d="M0 220 L110 120 L210 200 L320 110 L440 210 L480 170 L480 240 L0 240 Z" fill="#454e5b"/>
    <g fill="#eef2f6">
      <path d="M120 70 l24 40 l-48 0 z"/>
      <path d="M300 40 l26 44 l-52 0 z"/>
    </g>
    <path d="M170 240 Q250 190 250 150 Q250 120 300 108" fill="none" stroke="#8f99a6" stroke-width="12" stroke-linecap="round" opacity="0.7"/>`),

  // The hidden haven: lamplit halls and a waterfall under stars.
  haven: scene('haven', ['#1b2340', '#0e1326'], `
    <g fill="#eaf0ff">
      <circle cx="70" cy="46" r="1.6"/><circle cx="150" cy="30" r="1.4"/>
      <circle cx="250" cy="52" r="1.8"/><circle cx="360" cy="34" r="1.4"/>
      <circle cx="430" cy="60" r="1.6"/><circle cx="200" cy="70" r="1.2"/>
    </g>
    <path d="M0 150 Q240 118 480 150 L480 240 L0 240 Z" fill="#20305a"/>
    <path d="M0 190 Q240 160 480 190 L480 240 L0 240 Z" fill="#152343"/>
    <rect x="300" y="60" width="10" height="150" fill="#bcd6f0" opacity="0.55"/>
    <g fill="#f2c14e">
      <rect x="110" y="150" width="10" height="16" rx="2"/>
      <rect x="150" y="146" width="10" height="20" rx="2"/>
      <rect x="196" y="150" width="10" height="16" rx="2"/>
    </g>
    <circle cx="130" cy="140" r="8" fill="#f6d27a" opacity="0.7"/>
    <circle cx="176" cy="136" r="9" fill="#f6d27a" opacity="0.7"/>`),
};

// Parchment-map fallback for any unmapped / missing art key.
const FALLBACK = scene('map', ['#d8c193', '#b79b68'], `
  <rect x="40" y="30" width="400" height="180" rx="6" fill="#e9d7ab" stroke="#a2814f" stroke-width="4"/>
  <path d="M90 170 Q170 120 210 150 T360 90" fill="none" stroke="#7a5c34" stroke-width="3" stroke-dasharray="5 9"/>
  <circle cx="90" cy="170" r="6" fill="#7a5c34"/>
  <path d="M356 84 l10 6 l-10 6 z" fill="#7a5c34"/>
  <path d="M300 150 l6 -14 l6 14 l-6 -6 z" fill="#8a5a3a"/>`);

export function artFor(key: string | undefined): string {
  if (!key) return FALLBACK;
  return ART[key] ?? FALLBACK;
}
