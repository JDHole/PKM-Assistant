import { addIcon } from 'obsidian';
export function add_smart_dice_icon() {
    addIcon("smart-dice", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="1" width="22" height="22" rx="2" fill="none"/>

  <g transform="translate(12 10) scale(0.18) translate(-50 -50)">
    <path d="M50 20 L80 40 L80 60 L50 100" fill="none" stroke="currentColor" stroke-width="4"/>
    <path d="M30 50 L55 70" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="50" cy="20" r="9" fill="currentColor"/>
    <circle cx="75" cy="40" r="9" fill="currentColor"/>
    <circle cx="75" cy="70" r="9" fill="currentColor"/>
    <circle cx="50" cy="100" r="9" fill="currentColor"/>
    <circle cx="25" cy="50" r="9" fill="currentColor"/>
  </g>
</svg>
`);
}

export function add_obsek_icon() {
    addIcon("obsek-icon", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" stroke="currentColor">
  <circle cx="50" cy="50" r="44" fill="none" stroke-width="5"/>
  <circle cx="50" cy="32" r="6"/>
  <circle cx="30" cy="52" r="6"/>
  <circle cx="70" cy="52" r="6"/>
  <circle cx="40" cy="72" r="6"/>
  <circle cx="60" cy="72" r="6"/>
  <line x1="50" y1="32" x2="30" y2="52" stroke-width="3"/>
  <line x1="50" y1="32" x2="70" y2="52" stroke-width="3"/>
  <line x1="30" y1="52" x2="40" y2="72" stroke-width="3"/>
  <line x1="70" y1="52" x2="60" y2="72" stroke-width="3"/>
  <line x1="30" y1="52" x2="70" y2="52" stroke-width="3"/>
  <line x1="40" y1="72" x2="60" y2="72" stroke-width="3"/>
</svg>
`);
}
