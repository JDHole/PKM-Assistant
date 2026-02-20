import { parseYaml } from 'obsidian';
import { parseWorkflowCore, formatWorkflowForPromptCore } from './workflowParserCore.js';

/**
 * Parsuje plik workflow używając obsidian.parseYaml
 * @param {string} fileContent - Zawartość pliku markdown
 * @returns {{name: string, trigger: string, description: string, content: string}}
 */
export function parseWorkflow(fileContent) {
    return parseWorkflowCore(fileContent, parseYaml);
}

/**
 * Formatuje workflow do wstrzyknięcia w prompt
 * @param {{name: string, description: string, content: string}} workflow
 * @returns {string}
 */
export function formatWorkflowForPrompt(workflow) {
    return formatWorkflowForPromptCore(workflow);
}
