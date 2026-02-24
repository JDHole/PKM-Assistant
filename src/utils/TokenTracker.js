/**
 * TokenTracker — sledzenie zuzycia tokenow per-wiadomosc i per-sesje.
 * Role: main, minion, master.
 */
export class TokenTracker {
    constructor() {
        this.entries = [];
        this.totals = {
            main:   { input: 0, output: 0 },
            minion: { input: 0, output: 0 },
            master: { input: 0, output: 0 },
        };
    }

    /**
     * Zapisuje zuzycie tokenow z jednego wywolania API.
     * @param {'main'|'minion'|'master'} role
     * @param {number} inputTokens  — prompt_tokens
     * @param {number} outputTokens — completion_tokens
     */
    record(role, inputTokens, outputTokens) {
        const inp = inputTokens || 0;
        const out = outputTokens || 0;
        this.entries.push({
            role,
            input: inp,
            output: out,
            timestamp: Date.now(),
        });
        if (this.totals[role]) {
            this.totals[role].input += inp;
            this.totals[role].output += out;
        }
    }

    /**
     * Zwraca podsumowanie sesji.
     * @returns {{ input: number, output: number, total: number, byRole: object }}
     */
    getSessionTotal() {
        let input = 0;
        let output = 0;
        for (const r of Object.values(this.totals)) {
            input += r.input;
            output += r.output;
        }
        return {
            input,
            output,
            total: input + output,
            byRole: {
                main:   { ...this.totals.main },
                minion: { ...this.totals.minion },
                master: { ...this.totals.master },
            },
        };
    }

    /**
     * Zwraca tablice wpisow per-wywolanie.
     * @returns {Array<{role: string, input: number, output: number, timestamp: number}>}
     */
    getBreakdown() {
        return [...this.entries];
    }

    /** Reset na nowa sesje. */
    clear() {
        this.entries = [];
        this.totals = {
            main:   { input: 0, output: 0 },
            minion: { input: 0, output: 0 },
            master: { input: 0, output: 0 },
        };
    }
}
