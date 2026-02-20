
/**
 * Formatuje tablicę wiadomości do Markdown
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} metadata - {created, agent, tokens_used}
 * @param {string|null} summary - Opcjonalne podsumowanie
 * @returns {string} Markdown content
 */
export function formatToMarkdown(messages, metadata = {}, summary = null) {
    const lines = [];

    // 1. Frontmatter YAML
    if (metadata && Object.keys(metadata).length > 0) {
        lines.push('---');
        for (const [key, value] of Object.entries(metadata)) {
            // Ensure proper serialization of dates or complex objects if needed
            // But for simple metadata (string/number), this suffices
            lines.push(`${key}: ${value}`);
        }
        lines.push('---');
    }

    // 2. Messages
    messages.forEach(msg => {
        // Capitalize role for the header (user -> User, assistant -> Assistant)
        const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        lines.push(`## ${role}`);
        lines.push(msg.content);
    });

    // 3. Summary
    if (summary) {
        lines.push('---');
        lines.push('## Podsumowanie sesji');
        lines.push(summary);
    }

    return lines.join('\n');
}

/**
 * Parsuje Markdown sesji z powrotem do struktury
 * @param {string} content - Zawartość pliku MD
 * @returns {{messages: Array, metadata: Object, summary: string|null}}
 */
export function parseSessionFile(content) {
    const result = {
        messages: [],
        metadata: {},
        summary: null
    };

    if (!content) return result;

    // Normalize line endings to \n
    let text = content.replace(/\r\n/g, '\n');

    // 1. Extract Frontmatter
    // Looks for --- at the start, content, then ---
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const fmMatch = text.match(frontmatterRegex);

    if (fmMatch) {
        const rawFm = fmMatch[1];
        rawFm.split('\n').forEach(line => {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex !== -1) {
                const key = line.slice(0, separatorIndex).trim();
                let value = line.slice(separatorIndex + 1).trim();

                // Simple type conversion for tokens_used
                if (key === 'tokens_used') {
                    value = parseInt(value, 10) || 0;
                }

                result.metadata[key] = value;
            }
        });

        // Remove frontmatter from text to simplify remaining parsing
        text = text.replace(frontmatterRegex, '').trim();
    }

    // 2. Extract Summary
    // Looks for the specific summary section at the end
    // Pattern: Newline (optional) + --- + Newline + ## Podsumowanie sesji + Newline + Content
    const summaryRegex = /(?:^|\n)---\n## Podsumowanie sesji\n([\s\S]*)$/;
    const summaryMatch = text.match(summaryRegex);

    if (summaryMatch) {
        result.summary = summaryMatch[1].trim();
        // Remove summary from text
        text = text.replace(summaryRegex, '').trim();
    }

    // 3. Parse Messages
    // Split by "## Role"
    // We look for "## " at the start of the line.
    // The split will result in [empty/pre-text, "User\nContent", "Assistant\nContent", ...]
    const parts = text.split(/(?:^|\n)## /);

    parts.forEach(part => {
        if (!part.trim()) return;

        // The first line is the role
        const splitIndex = part.indexOf('\n');
        if (splitIndex === -1) {
            // Handle case where message might be just a header (empty content)? 
            // Or single line? Assume content follows header.
            // If no newline, maybe content is empty or on same line (unlikely for strict format but possible)
            // Strict format requirement: ## Role\nContent
            // But let's be robust:
            const role = part.trim().toLowerCase();
            if (role) {
                result.messages.push({ role, content: '' });
            }
            return;
        }

        const role = part.slice(0, splitIndex).trim().toLowerCase();
        const content = part.slice(splitIndex + 1).trim();

        if (role) {
            result.messages.push({ role, content });
        }
    });

    return result;
}
