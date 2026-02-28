/**
 * Crystal Soul Design System — Public API
 *
 * Usage:
 *   import { IconGenerator, CrystalGenerator, ColorPalette } from './crystal-soul/index.js';
 *
 *   // Generate icon SVG
 *   const iconSvg = IconGenerator.generate('vault_search', 'search', { size: 24, color: '#4A6FA5' });
 *
 *   // Generate crystal SVG
 *   const crystalSvg = CrystalGenerator.generate('jaskier', { size: 48, color: '#7B5EA7', glow: true });
 *
 *   // Get color palette
 *   const allColors = ColorPalette.ALL_COLORS;
 *   const color = ColorPalette.pickColor('jaskier');  // deterministic color from name
 */

export { IconGenerator } from './IconGenerator.js';
export { CrystalGenerator } from './CrystalGenerator.js';
export { SvgHelper, hexToRgbTriplet } from './SvgHelper.js';
export { UiIcons } from './UiIcons.js';
export { ConnectorGenerator } from './ConnectorGenerator.js';
export {
  COLOR_GROUPS,
  ALL_COLORS,
  getColorByHex,
  getColorByName,
  getColorGroup,
  getGroupNames,
  pickColor,
} from './ColorPalette.js';
