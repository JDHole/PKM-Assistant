/**
 * ConnectorGenerator - Creates irregular crystal connector dots + vertical lines
 * for the action chain in chat messages (like Claude Code's dot+line but crystals).
 *
 * KLUCZOWE: Kryształy są NIEREGULARNE — nie zwykłe diamenty (rotate 45deg).
 * Używamy 6 predefiniowanych kształtów wybieranych z seed.
 */

// Simple hash for seed-based shape selection
function hashSeed(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h) || 1;
}

// 6 predefiniowanych nieregularnych kształtów kryształu (SVG polygon points, viewBox 0 0 10 10)
const CRYSTAL_SHAPES = [
  // Odłamek (asymetryczny, ostry)
  '2,0 8,2 10,7 6,10 0,8 1,3',
  // Igła (długi, wąski)
  '5,0 9,3 7,10 3,10 1,3',
  // Klaster (wielopunktowy)
  '3,0 7,1 10,4 8,8 5,10 1,7 0,3',
  // Pryzmat (trójkątny z odchyleniem)
  '5,0 10,6 7,10 2,10 0,4',
  // Kryształ podwójny (dwa szczyty)
  '3,0 7,0 10,5 7,10 3,10 0,5',
  // Odłamek II (krótki, szeroki)
  '1,1 6,0 10,3 9,8 4,10 0,6',
];

export class ConnectorGenerator {
  /**
   * Create a connector element (irregular crystal dot + vertical line)
   * @param {string} color - CSS color (hex or rgb triplet for rgba)
   * @param {boolean} isActive - Whether currently processing (animated)
   * @param {string} seed - Seed for shape selection (e.g. agent name)
   * @returns {HTMLElement}
   */
  static create(color = 'currentColor', isActive = false, seed = '') {
    const el = document.createElement('div');
    el.className = 'cs-connector' + (isActive ? ' cs-connector--active' : '');

    // Select irregular crystal shape from seed
    const idx = hashSeed(seed) % CRYSTAL_SHAPES.length;
    const shape = CRYSTAL_SHAPES[idx];

    el.innerHTML = `
      <div class="cs-connector__crystal">
        <svg viewBox="0 0 10 10" width="10" height="10">
          <polygon points="${shape}"
            fill="${color}" fill-opacity="0.08"
            stroke="${color}" stroke-width="0.8" stroke-opacity="0.3"/>
        </svg>
      </div>
      <div class="cs-connector__line"></div>
    `;
    return el;
  }

  /**
   * Create a small decorative marker (4-6px, for shard ::after etc.)
   * @param {string} color - CSS color
   * @param {string} seed - Seed for shape selection
   * @param {number} size - Marker size (default 5)
   * @returns {string} SVG string
   */
  static createMarker(color = 'currentColor', seed = '', size = 5) {
    const idx = hashSeed(seed) % CRYSTAL_SHAPES.length;
    const shape = CRYSTAL_SHAPES[idx];
    return `<svg viewBox="0 0 10 10" width="${size}" height="${size}">
      <polygon points="${shape}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1" stroke-opacity="0.3"/>
    </svg>`;
  }

  /**
   * Get the clip-path polygon string for CSS usage
   * @param {string} seed - Seed for shape selection
   * @returns {string} CSS clip-path polygon value
   */
  static getClipPath(seed = '') {
    // Convert SVG points to clip-path percentages
    const clipPaths = [
      'polygon(20% 0%, 80% 20%, 100% 70%, 60% 100%, 0% 80%, 10% 30%)',
      'polygon(50% 0%, 90% 30%, 70% 100%, 30% 100%, 10% 30%)',
      'polygon(30% 0%, 70% 10%, 100% 40%, 80% 80%, 50% 100%, 10% 70%, 0% 30%)',
      'polygon(50% 0%, 100% 60%, 70% 100%, 20% 100%, 0% 40%)',
      'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
      'polygon(10% 10%, 60% 0%, 100% 30%, 90% 80%, 40% 100%, 0% 60%)',
    ];
    const idx = hashSeed(seed) % clipPaths.length;
    return clipPaths[idx];
  }
}
