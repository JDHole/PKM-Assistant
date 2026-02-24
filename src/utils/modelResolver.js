/**
 * Model Resolver - central model creation for all roles
 *
 * Resolution chain for each role:
 * 1. agent.models.{role} (per-agent override)
 * 2. Global settings (obsek.{role}Platform + obsek.{role}Model)
 * 3. For 'main': smart_chat_model.platform + model (SC compatibility)
 * 4. null (no model configured)
 *
 * API keys always come from the global pool: smart_chat_model.{platform}_api_key
 */
import { log } from './Logger.js';

/** Cache for model instances */
const _cache = new Map();

/** Default models per platform */
const DEFAULT_MODELS = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    gemini: 'gemini-1.5-pro',
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-chat',
    open_router: 'anthropic/claude-sonnet-4-20250514',
    ollama: 'llama3',
    lm_studio: 'default',
};

/**
 * Detect platform from API keys in smart_chat_model settings
 * @param {Object} scSettings - smart_chat_model settings
 * @returns {string|null}
 */
function _detectPlatform(scSettings) {
    for (const p of ['anthropic', 'openai', 'deepseek', 'gemini', 'groq', 'open_router', 'ollama', 'lm_studio']) {
        if (scSettings[`${p}_api_key`] || p === 'ollama' || p === 'lm_studio') return p;
    }
    return null;
}

/**
 * Create a SmartChatModel instance for a given role.
 *
 * @param {Object} plugin - Obsek plugin instance
 * @param {'main'|'minion'|'master'} role - Model role
 * @param {Object} [agent] - Agent instance (for per-agent overrides)
 * @param {Object} [minionConfig] - Minion config (for minion role - model field in minion.md)
 * @returns {Object|null} SmartChatModel instance or null
 */
export function createModelForRole(plugin, role, agent = null, minionConfig = null) {
    const env = plugin?.env;
    if (!env) return null;

    const scSettings = env.settings?.smart_chat_model || {};
    const obsek = env.settings?.obsek || {};

    // --- Resolution chain ---
    let platform = null;
    let modelId = null;

    // Step 1: Per-agent override
    if (agent?.models?.[role]) {
        const agentOverride = agent.models[role];
        platform = agentOverride.platform || null;
        modelId = agentOverride.model || null;
    }

    // Step 2: Global obsek settings (role-specific)
    if (!modelId) {
        if (role === 'main') {
            // Main uses SC's own settings for backward compatibility
            platform = platform || scSettings.platform || _detectPlatform(scSettings);
            modelId = scSettings[`${platform}_model`] || DEFAULT_MODELS[platform] || null;
        } else if (role === 'minion') {
            // Minion: check minionConfig.model first, then global
            modelId = minionConfig?.model || obsek.minionModel || null;
            platform = platform || obsek.minionPlatform || null;
        } else if (role === 'master') {
            modelId = obsek.masterModel || null;
            platform = platform || obsek.masterPlatform || null;
        }
    }

    // Step 3: If no platform yet, detect from keys
    if (!platform) {
        platform = scSettings.platform || _detectPlatform(scSettings);
    }

    if (!platform || !modelId || !modelId.trim()) {
        log.debug('ModelResolver', `${role}: brak platformy lub modelu (platform=${platform}, model=${modelId})`);
        return null;
    }

    // API key always from global pool
    const api_key = scSettings[`${platform}_api_key`];
    if (!api_key && platform !== 'ollama' && platform !== 'lm_studio') {
        log.debug('ModelResolver', `${role}: brak API key dla ${platform}`);
        return null;
    }

    // Cache check
    const agentName = agent?.name || '_global';
    const cacheKey = `${agentName}:${role}:${platform}:${modelId.trim()}`;
    const cached = _cache.get(cacheKey);
    if (cached?.stream) {
        log.debug('ModelResolver', `${role}: z CACHE → ${platform}/${modelId.trim()}`);
        return cached;
    }

    // Create model
    const module_config = env.config?.modules?.smart_chat_model;
    if (!module_config?.class) return null;

    try {
        const model = new module_config.class({
            ...module_config,
            class: null,
            env: env,
            settings: env.settings,
            adapter: platform,
            api_key: api_key,
            model_key: modelId.trim(),
        });
        _cache.set(cacheKey, model);
        log.model(role, platform, modelId.trim());
        return model;
    } catch (e) {
        log.warn('ModelResolver', `Nie udało się stworzyć modelu ${role}:`, e);
        return null;
    }
}

/**
 * Clear the model cache (call when settings change, agent switches, etc.)
 */
export function clearModelCache() {
    _cache.clear();
}
