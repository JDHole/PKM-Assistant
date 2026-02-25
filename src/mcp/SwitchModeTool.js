/**
 * SwitchModeTool — MCP tool pozwalający agentowi przełączyć tryb pracy.
 *
 * Zachowanie zależy od ustawienia autoChangeMode:
 *   'off' → narzędzie niedostępne (filtrowane na poziomie chat_view)
 *   'ask' → zwraca propozycję, chat_view renderuje przycisk potwierdzenia
 *   'on'  → przełącza natychmiast przez event
 */

import { isValidMode, getModeInfo } from '../core/WorkMode.js';

export function createSwitchModeTool(app) {
    return {
        name: 'switch_mode',
        description: [
            'Przełącz tryb pracy czatu. Dostępne tryby:',
            '- rozmowa: Rozmowa bez dostępu do vault (tylko pamięć + delegacja)',
            '- planowanie: Analiza i planowanie — czytanie bez edycji',
            '- praca: Pełna moc — wszystkie narzędzia',
            '- kreatywny: Tworzenie treści — pisanie bez kasowania',
            '',
            'Użyj gdy charakter zadania wymaga innego zestawu narzędzi.',
            'Podaj reason żeby użytkownik wiedział dlaczego proponujesz zmianę.',
        ].join('\n'),
        inputSchema: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: ['rozmowa', 'planowanie', 'praca', 'kreatywny'],
                    description: 'Docelowy tryb pracy',
                },
                reason: {
                    type: 'string',
                    description: 'Krótkie uzasadnienie zmiany trybu (widoczne dla użytkownika)',
                },
            },
            required: ['mode'],
        },
        execute: async (args, app, plugin) => {
            const { mode, reason } = args;

            // Validate mode
            if (!isValidMode(mode)) {
                return { error: `Nieznany tryb: "${mode}". Dostępne: rozmowa, planowanie, praca, kreatywny.` };
            }

            const autoChange = plugin.env?.settings?.obsek?.autoChangeMode || 'ask';
            const modeInfo = getModeInfo(mode);

            if (autoChange === 'off') {
                return {
                    error: 'Zmiana trybu przez agenta jest wyłączona. Użytkownik może zmienić tryb ręcznie.',
                };
            }

            if (autoChange === 'on') {
                // Immediate switch — fire event, chat_view listens
                plugin.events?.trigger('work-mode-change', { mode, reason });
                return {
                    success: true,
                    mode: modeInfo.id,
                    label: modeInfo.label,
                    icon: modeInfo.icon,
                    message: `Przełączono na tryb: ${modeInfo.icon} ${modeInfo.label}`,
                };
            }

            // 'ask' — return proposal for chat_view to render as confirmation button
            return {
                proposal: true,
                mode: modeInfo.id,
                label: modeInfo.label,
                icon: modeInfo.icon,
                reason: reason || '',
                message: `Proponuję przełączenie na tryb: ${modeInfo.icon} ${modeInfo.label}${reason ? ` — ${reason}` : ''}`,
            };
        },
    };
}
