/**
 * ask_user — MCP tool that lets the agent ask the user a question and WAIT for an answer.
 *
 * Unlike regular chat (where agent just writes text and hopes user responds),
 * this tool creates a structured question block with clickable options.
 * The tool execution PAUSES until the user responds.
 *
 * In YOLO mode: auto-selects the first option.
 */
export function createAskUserTool(app) {
    return {
        name: 'ask_user',
        description: `Zadaj użytkownikowi pytanie i CZEKAJ na odpowiedź.

JAK DZIAŁA:
- Wyświetla pytanie w chacie z opcjami do kliknięcia
- Wykonanie narzędzia PAUZUJE aż użytkownik odpowie
- Użytkownik klika opcję LUB wpisuje własną odpowiedź
- Wynik to tekst odpowiedzi użytkownika

KIEDY UŻYWAĆ:
- Potrzebujesz wyboru użytkownika zanim kontynuujesz (np. "który folder?", "jaki format?")
- Nie jesteś pewien intencji użytkownika — zapytaj zamiast zgadywać
- Musisz potwierdzić ważną decyzję (np. "usunąć ten plik?")
- Planujesz złożone zadanie i potrzebujesz inputu na etapach

KIEDY NIE UŻYWAĆ:
- Pytanie retoryczne / nie czekasz na odpowiedź → napisz normalnie
- Prosta rozmowa → odpowiadaj bez narzędzia
- Jedno oczywiste działanie → po prostu je zrób

UWAGI:
- Podaj 2-4 konkretne opcje + zawsze jest "Wpisz własną odpowiedź"
- Pierwsza opcja = domyślna (wybierana automatycznie w YOLO mode)
- context: krótki opis DLACZEGO pytasz (pomaga userowi zrozumieć)`,
        inputSchema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'Treść pytania do użytkownika.'
                },
                options: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Sugerowane odpowiedzi (2-4 opcje). Pierwsza = domyślna. Opcjonalne — bez nich user dostaje tylko pole tekstowe.'
                },
                context: {
                    type: 'string',
                    description: 'Krótki opis kontekstu pytania (dlaczego pytasz). Opcjonalne.'
                }
            },
            required: ['question']
        },
        /**
         * Execute is special — it uses plugin._askUserCallback to pause and wait for user input.
         * The callback is set by chat_view.js when rendering the ask_user block.
         */
        execute: async (args, app, plugin) => {
            const { question, options, context } = args;

            if (!question || typeof question !== 'string') {
                return { success: false, error: 'question jest wymagane' };
            }

            // ask_user ZAWSZE czeka na usera — nawet w YOLO mode.
            // Cały sens tego toola to "MUSZĘ zapytać usera". YOLO go nie omija.

            // Wait for user response via callback
            if (!plugin?._askUserPromise) {
                // Create the promise that chat_view will resolve
                let resolveAnswer;
                plugin._askUserPromise = new Promise(resolve => {
                    resolveAnswer = resolve;
                });
                plugin._askUserResolve = resolveAnswer;
            }

            // Signal to chat_view to render the question block
            plugin._askUserPending = { question, options: options || [], context: context || '' };

            // Wait for user response (chat_view will call plugin._askUserResolve(answer))
            const answer = await plugin._askUserPromise;

            // Cleanup
            plugin._askUserPending = null;
            plugin._askUserPromise = null;
            plugin._askUserResolve = null;

            return {
                success: true,
                question,
                answer,
                auto: false
            };
        }
    };
}
