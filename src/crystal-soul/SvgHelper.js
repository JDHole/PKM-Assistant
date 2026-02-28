/**
 * SvgHelper - Converts SVG strings from Crystal Soul generators to DOM elements.
 */
import { CrystalGenerator } from './CrystalGenerator.js';
import { IconGenerator } from './IconGenerator.js';

/**
 * Convert hex color (#RRGGBB) to an RGB triplet string "R, G, B" for CSS rgba().
 * @param {string} hex - Color in #RRGGBB format
 * @returns {string} "R, G, B"
 */
export function hexToRgbTriplet(hex) {
  const h = (hex || '#999999').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

export class SvgHelper {
  /**
   * Parse an SVG string into an SVGElement.
   * @param {string} svgString - Complete <svg>...</svg> markup
   * @returns {SVGElement}
   */
  static toElement(svgString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    return doc.documentElement;
  }

  /**
   * Create an agent crystal avatar element.
   * @param {string} agentName - Seed for crystal generation
   * @param {string} color - Hex color
   * @param {number} size - Pixel size
   * @param {boolean} glow - Whether to add glow filter
   * @returns {HTMLElement} A wrapper div containing the SVG
   */
  static crystalAvatar(agentName, color, size = 32, glow = false) {
    const svgStr = CrystalGenerator.generate(agentName, { size, color, glow });
    const wrapper = document.createElement('div');
    wrapper.className = 'cs-crystal-avatar';
    wrapper.style.setProperty('--cs-agent-color', color);
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${Math.round(size * 100 / 60)}px`;
    wrapper.innerHTML = svgStr;
    return wrapper;
  }

  /**
   * Create a tool/action icon element.
   * @param {string} seed - Tool name or unique identifier
   * @param {string} category - 'memory'|'search'|'write'|'connect'|'arcane'|'mixed'
   * @param {string} color - Hex color (or 'currentColor')
   * @param {number} size - Pixel size
   * @returns {HTMLElement}
   */
  static toolIcon(seed, category, color = 'currentColor', size = 18) {
    const svgStr = IconGenerator.generate(seed, category, { size, color });
    const wrapper = document.createElement('span');
    wrapper.className = 'cs-icon';
    wrapper.innerHTML = svgStr;
    return wrapper;
  }
}
