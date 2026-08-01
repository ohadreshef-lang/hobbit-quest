/**
 * Placeholder scene art keyed by `room.art`. Emoji stand-ins keep the
 * scaffold dependency-free; swap these for pixel art / SVG later without
 * touching the engine.
 */
const ART: Record<string, string> = {
  hall: '🚪🪑🔥',
  cellar: '🛢️🕯️',
  door: '🟢🚪',
  road: '🛤️🌄',
  fire: '🔥🍖🌲',
};

export function artFor(key: string | undefined): string {
  if (!key) return '🗺️';
  return ART[key] ?? '🗺️';
}
