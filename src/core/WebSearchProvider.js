import { requestUrl } from 'obsidian';
import { log } from '../utils/Logger.js';

/**
 * Web Search Provider — multi-provider architecture.
 * Domyślnie: Jina AI (bez klucza API, za darmo).
 * Opcjonalnie: Tavily, Brave, SearXNG (wymagają klucza lub self-host).
 */

// ═══════════════════════════════════════════
// PROVIDER IMPLEMENTATIONS
// ═══════════════════════════════════════════

/**
 * Jina AI — domyślny provider.
 * s.jina.ai → search + pełna treść stron (nie snippety!)
 * Działa BEZ klucza API (3 RPM). Z kluczem: 100 RPM + 10M tokenów/mies.
 */
async function jinaSearch(query, limit, apiKey) {
    const headers = {
        'Accept': 'application/json',
        'X-Return-Format': 'json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    log.debug('WebSearch', `Jina search: ${query}`);

    try {
        const response = await requestUrl({ url, headers, method: 'GET' });
        const data = JSON.parse(response.text);

        // Jina zwraca { data: [{title, url, content, description}] }
        const results = (data.data || []).slice(0, limit).map(item => ({
            title: item.title || '(brak tytułu)',
            url: item.url || '',
            content: item.content || item.description || ''
        }));

        return results;
    } catch (err) {
        // 401 = Jina wymaga klucza API
        if (err.status === 401 || err.message?.includes('401')) {
            throw new Error(
                'Jina AI wymaga klucza API. Wejdź na https://jina.ai/ → kliknij "API" → skopiuj klucz (darmowy, 10M tokenów). ' +
                'Wklej go w ustawieniach pluginu → Web Search → Klucz API.'
            );
        }
        throw err;
    }
}

/**
 * Tavily — AI-focused search API.
 * Wymaga klucza API (1000 zapytań/mies. free).
 */
async function tavilySearch(query, limit, apiKey) {
    if (!apiKey) throw new Error('Tavily wymaga klucza API. Załóż darmowe konto na tavily.com');

    const response = await requestUrl({
        url: 'https://api.tavily.com/search',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: limit,
            include_answer: false
        })
    });
    const data = JSON.parse(response.text);

    return (data.results || []).map(item => ({
        title: item.title || '(brak tytułu)',
        url: item.url || '',
        content: item.content || ''
    }));
}

/**
 * Brave Search API.
 * Wymaga klucza API (~1000 zapytań/mies. free z $5 kredytu).
 */
async function braveSearch(query, limit, apiKey) {
    if (!apiKey) throw new Error('Brave Search wymaga klucza API. Załóż konto na brave.com/search/api/');

    const response = await requestUrl({
        url: `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey
        }
    });
    const data = JSON.parse(response.text);

    return (data.web?.results || []).map(item => ({
        title: item.title || '(brak tytułu)',
        url: item.url || '',
        content: item.description || ''
    }));
}

/**
 * SearXNG — self-hosted metasearch.
 * User podaje URL swojej instancji. Zero limitów, zero kosztów.
 */
async function searxngSearch(query, limit, _apiKey, instanceUrl) {
    if (!instanceUrl) throw new Error('SearXNG wymaga URL instancji (np. http://localhost:8888)');

    const url = `${instanceUrl.replace(/\/+$/, '')}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo`;
    const response = await requestUrl({ url, method: 'GET' });
    const data = JSON.parse(response.text);

    return (data.results || []).slice(0, limit).map(item => ({
        title: item.title || '(brak tytułu)',
        url: item.url || '',
        content: item.content || item.snippet || ''
    }));
}

/**
 * Serper.dev — Google Search API wrapper.
 * Wymaga klucza API (2500 zapytań jednorazowo free).
 */
async function serperSearch(query, limit, apiKey) {
    if (!apiKey) throw new Error('Serper.dev wymaga klucza API. Załóż konto na serper.dev');

    const response = await requestUrl({
        url: 'https://google.serper.dev/search',
        method: 'POST',
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, num: limit })
    });
    const data = JSON.parse(response.text);

    return (data.organic || []).map(item => ({
        title: item.title || '(brak tytułu)',
        url: item.link || '',
        content: item.snippet || ''
    }));
}

// ═══════════════════════════════════════════
// PROVIDER REGISTRY
// ═══════════════════════════════════════════

export const WEB_SEARCH_PROVIDERS = {
    jina:    { label: 'Jina AI (darmowy)', requiresKey: false, requiresUrl: false, fn: jinaSearch },
    tavily:  { label: 'Tavily',            requiresKey: true,  requiresUrl: false, fn: tavilySearch },
    brave:   { label: 'Brave Search',      requiresKey: true,  requiresUrl: false, fn: braveSearch },
    serper:  { label: 'Serper.dev',        requiresKey: true,  requiresUrl: false, fn: serperSearch },
    searxng: { label: 'SearXNG (self-hosted)', requiresKey: false, requiresUrl: true, fn: searxngSearch },
};

/** Links where user can create free accounts. */
export const PROVIDER_SIGNUP_URLS = {
    jina:    'https://jina.ai/reader/',
    tavily:  'https://tavily.com/',
    brave:   'https://brave.com/search/api/',
    serper:  'https://serper.dev/',
    searxng: 'https://docs.searxng.org/',
};

// ═══════════════════════════════════════════
// MAIN SEARCH FUNCTION
// ═══════════════════════════════════════════

/**
 * Execute web search via configured provider.
 * @param {string} query - Search query
 * @param {Object} settings - obsek.webSearch settings
 * @param {number} [limit=5] - Max results
 * @returns {Promise<{success: boolean, provider: string, query: string, results: Array, count: number}>}
 */
export async function executeWebSearch(query, settings = {}, limit = 5) {
    const providerId = settings.provider || 'jina';
    const provider = WEB_SEARCH_PROVIDERS[providerId];

    if (!provider) {
        throw new Error(`Nieznany provider web search: ${providerId}`);
    }

    if (provider.requiresKey && !settings.apiKey) {
        throw new Error(`${provider.label} wymaga klucza API. Wejdź w ustawienia pluginu → Web Search.`);
    }

    if (provider.requiresUrl && !settings.instanceUrl) {
        throw new Error(`${provider.label} wymaga URL instancji. Wejdź w ustawienia pluginu → Web Search.`);
    }

    const startTime = Date.now();

    try {
        const results = await provider.fn(query, limit, settings.apiKey, settings.instanceUrl);
        const duration = Date.now() - startTime;
        log.info('WebSearch', `${provider.label}: "${query}" → ${results.length} wyników (${duration}ms)`);

        return {
            success: true,
            provider: providerId,
            query,
            results,
            count: results.length
        };
    } catch (error) {
        log.error('WebSearch', `${provider.label} błąd:`, error);
        throw error;
    }
}
