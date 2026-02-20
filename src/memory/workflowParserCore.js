/**
 * Core logic for parsing workflows
 * @param {string} fileContent
 * @param {Function} yamlParser - Function to parse YAML string
 * @returns {{name: string, trigger: string, description: string, content: string}}
 */
export function parseWorkflowCore(fileContent, yamlParser) {
    if (!fileContent) {
        return { name: '', trigger: '', description: '', content: '' };
    }

    // Normalizacja końców linii
    const text = fileContent.replace(/\r\n/g, '\n');

    // Regex do wyciągnięcia frontmattera
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = text.match(frontmatterRegex);

    let metadata = {};
    let content = text;

    if (match) {
        try {
            metadata = yamlParser(match[1]) || {};
        } catch (e) {
            console.error('Błąd parsowania YAML w workflow:', e);
        }
        // Usunięcie frontmattera z treści
        content = text.replace(frontmatterRegex, '').trim();
    }

    return {
        name: metadata.name || '',
        trigger: metadata.trigger || '',
        description: metadata.description || '',
        content: content
    };
}

/**
 * Formats workflow for prompt
 * @param {object} workflow 
 * @returns {string}
 */
export function formatWorkflowForPromptCore(workflow) {
    return `## Workflow: ${workflow.name}
${workflow.description}
${workflow.content}`;
}
