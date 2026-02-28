import { encodingForModel } from 'js-tiktoken';

/**
 * Liczy tokeny w tekście używając tiktoken
 * @param {string} text - Tekst do policzenia
 * @param {string} model - Model do użycia (default: 'gpt-4')
 * @returns {number} Liczba tokenów
 */
export function countTokens(text, model = 'gpt-4') {
    if (!text) {
        return 0;
    }
    try {
        const enc = encodingForModel(model);
        const tokens = enc.encode(text);
        return tokens.length;
    } catch (e) {
        return countTokensSimple(text);
    }
}

/**
 * Prosty fallback gdy tiktoken nie działa
 * Przybliżenie: 4 znaki ≈ 1 token
 * @param {string} text 
 * @returns {number}
 */
export function countTokensSimple(text) {
    if (!text) {
        return 0;
    }
    return Math.ceil(text.length / 4);
}

/**
 * Główna funkcja eksportowana - używa tiktoken z fallback
 * @param {string} text - Tekst do policzenia
 * @param {string} model - Model do użycia
 * @returns {number} Liczba tokenów
 */
export function getTokenCount(text, model = 'gpt-4') {
    try {
        return countTokens(text, model);
    } catch (e) {
        console.warn('tiktoken failed, using simple counter:', e);
        return countTokensSimple(text);
    }
}
