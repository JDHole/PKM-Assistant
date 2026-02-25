/**
 * Stream Helper - wraps SmartChatModel's .stream() as a Promise
 * Used by memory subsystem (extraction, summarization, consolidation).
 *
 * Problem: SmartChatModel has ONLY .stream() (callback-based).
 * Solution: Wrap it so callers can do: const text = await streamToComplete(model, msgs)
 */
import { log } from '../utils/Logger.js';

/**
 * Call a SmartChatModel in non-streaming mode.
 * @param {Object} chatModel - SmartChatModel instance with .stream()
 * @param {Array} messages - Array of { role, content } messages
 * @returns {Promise<{ text: string, usage: object|null }>} Response text + token usage
 */
export function streamToComplete(chatModel, messages) {
    log.debug('StreamHelper', `streamToComplete: ${messages.length} wiadomości`);
    return new Promise((resolve, reject) => {
        chatModel.stream(
            { messages },
            {
                chunk: () => {
                    // Chunks are accumulated internally by the model.
                    // We wait for done() which has the final complete text.
                },
                done: (response) => {
                    // Extract text from standard OpenAI/Anthropic response format
                    const content = response?.choices?.[0]?.message?.content || '';
                    const usage = response?.usage || null;
                    log.debug('StreamHelper', `streamToComplete DONE: ${content.length} znaków`);
                    resolve({ text: content, usage });
                },
                error: (err) => {
                    log.error('StreamHelper', 'streamToComplete ERROR:', err);
                    reject(err instanceof Error ? err : new Error(String(err)));
                }
            }
        );
    });
}

/**
 * Call a SmartChatModel with tool support. Runs a tool-calling loop:
 * model responds -> if tool_calls, execute them -> feed results back -> repeat.
 *
 * Used by MinionRunner for context prep and minion_task.
 *
 * @param {Object} chatModel - SmartChatModel instance with .stream()
 * @param {Array} messages - Initial messages array [{ role, content }]
 * @param {Array} tools - Tool definitions in OpenAI format [{ type: "function", function: {...} }]
 * @param {Function} executeToolCall - async ({ id, name, arguments }) => string (result)
 * @param {Object} [options]
 * @param {number} [options.maxIterations=3] - Max tool-calling rounds
 * @returns {Promise<{ finalText: string, toolsUsed: string[], usage: { prompt_tokens: number, completion_tokens: number }|null }>}
 */
export async function streamToCompleteWithTools(chatModel, messages, tools, executeToolCall, options = {}) {
    const maxIterations = options.maxIterations || 3;
    const minIterations = options.minIterations || 1;
    const toolsUsed = [];
    const toolCallDetails = [];
    let currentMessages = [...messages];
    const loopStart = Date.now();
    const totalUsage = { prompt_tokens: 0, completion_tokens: 0 };

    log.group('StreamHelper', `streamToCompleteWithTools (min ${minIterations}, max ${maxIterations} iteracji, ${tools.length} narzędzi)`);

    for (let i = 0; i < maxIterations; i++) {
        log.debug('StreamHelper', `--- Iteracja ${i + 1}/${maxIterations} ---`);
        const iterStart = Date.now();

        // Call model with tools
        const response = await new Promise((resolve, reject) => {
            chatModel.stream(
                { messages: currentMessages, tools: tools.length > 0 ? tools : undefined },
                {
                    chunk: () => {},
                    done: (resp) => resolve(resp),
                    error: (err) => reject(err instanceof Error ? err : new Error(String(err)))
                }
            );
        });

        log.timing('StreamHelper', `Iteracja ${i + 1} model call`, iterStart);

        // Accumulate usage
        if (response?.usage) {
            totalUsage.prompt_tokens += response.usage.prompt_tokens || 0;
            totalUsage.completion_tokens += response.usage.completion_tokens || 0;
        }

        // Extract tool calls and content from response
        const message = response?.choices?.[0]?.message;
        const toolCalls = message?.tool_calls || [];
        const content = message?.content || '';

        // No tool calls → check if minIterations met, then return text response
        if (toolCalls.length === 0) {
            if (i < minIterations - 1) {
                // Nie osiągnięto min_iterations — wymuś kontynuację
                log.debug('StreamHelper', `Iteracja ${i + 1}: brak tool calls, ale minIterations=${minIterations} — wymuszam kontynuację`);
                currentMessages.push({ role: 'assistant', content: content || null });
                currentMessages.push({
                    role: 'user',
                    content: 'Jeszcze nie skończyłeś. Użyj dostępnych narzędzi żeby zebrać więcej danych. Masz jeszcze budżet iteracji.'
                });
                continue;
            }
            log.debug('StreamHelper', `Iteracja ${i + 1}: brak tool calls, zwracam tekst (${content.length} znaków)`);
            log.timing('StreamHelper', 'Cała pętla tool-calling', loopStart);
            log.groupEnd();
            return { finalText: content, toolsUsed, toolCallDetails, usage: totalUsage };
        }

        log.debug('StreamHelper', `Iteracja ${i + 1}: ${toolCalls.length} tool call(s):`, toolCalls.map(tc => tc.function?.name || tc.name));

        // Add assistant message with tool calls to conversation
        currentMessages.push({
            role: 'assistant',
            content: content || null,
            tool_calls: toolCalls
        });

        // Execute tool calls in parallel (Promise.all preserves order)
        for (const tc of toolCalls) {
            toolsUsed.push(tc.function?.name || tc.name);
        }

        const toolResults = await Promise.all(toolCalls.map(async (tc) => {
            const toolName = tc.function?.name || tc.name;
            const toolArgs = tc.function?.arguments || tc.arguments;
            log.debug('StreamHelper', `Wykonuję tool (parallel): ${toolName}`);
            try {
                const result = await executeToolCall({
                    id: tc.id,
                    name: toolName,
                    arguments: toolArgs
                });
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                log.debug('StreamHelper', `Tool ${toolName} OK: ${resultStr.length} znaków`);
                let parsedArgs = toolArgs;
                try { if (typeof toolArgs === 'string') parsedArgs = JSON.parse(toolArgs); } catch {}
                return { tc, toolName, parsedArgs, resultStr, isError: false };
            } catch (toolError) {
                log.warn('StreamHelper', `Tool ${toolName} ERROR: ${toolError.message}`);
                return {
                    tc, toolName, parsedArgs: toolArgs,
                    resultStr: `Error: ${toolError.message || toolError}`,
                    isError: true, errorMsg: toolError.message,
                };
            }
        }));

        // Add results to messages in order (OpenAI API requirement)
        for (const r of toolResults) {
            toolCallDetails.push({
                name: r.toolName,
                args: r.parsedArgs,
                resultPreview: r.resultStr.slice(0, 500),
                ...(r.isError && { error: true }),
            });
            currentMessages.push({
                role: 'tool',
                tool_call_id: r.tc.id,
                content: r.resultStr
            });
        }
    }

    // Max iterations reached — do one final call WITHOUT tools so model can summarize
    log.warn('StreamHelper', `Max iteracji (${maxIterations}) osiągnięty! Tools used: ${toolsUsed.join(', ')}`);
    // Add explicit instruction to respond with text only (prevents XML tool hallucination)
    currentMessages.push({
        role: 'user',
        content: 'Limit narzędzi osiągnięty. Podsumuj TEKSTEM co znalazłeś do tej pory. NIE wywołuj żadnych narzędzi, odpowiedz zwykłym tekstem.'
    });

    try {
        const finalResponse = await new Promise((resolve, reject) => {
            chatModel.stream(
                { messages: currentMessages }, // no tools → model must respond with text
                {
                    chunk: () => {},
                    done: (resp) => resolve(resp),
                    error: (err) => reject(err instanceof Error ? err : new Error(String(err)))
                }
            );
        });

        let finalText = finalResponse?.choices?.[0]?.message?.content || '';

        // Accumulate final response usage
        if (finalResponse?.usage) {
            totalUsage.prompt_tokens += finalResponse.usage.prompt_tokens || 0;
            totalUsage.completion_tokens += finalResponse.usage.completion_tokens || 0;
        }

        // Strip any hallucinated XML tool calls (cheap models sometimes emit these)
        finalText = finalText.replace(/<\|?DSML\|?[^>]*>[\s\S]*?<\/?\|?DSML\|?[^>]*>/g, '').trim();
        finalText = finalText.replace(/<function_calls?>[\s\S]*?<\/function_calls?>/g, '').trim();
        finalText = finalText.replace(/<invoke[\s\S]*?<\/antml:invoke>/g, '').trim();

        log.timing('StreamHelper', 'Cała pętla tool-calling (z max iterations)', loopStart);
        log.groupEnd();
        return { finalText: finalText || '(Minion: osiągnięto limit iteracji narzędzi)', toolsUsed, toolCallDetails, usage: totalUsage };
    } catch {
        log.groupEnd();
        return { finalText: '(Minion: osiągnięto limit iteracji narzędzi)', toolsUsed, toolCallDetails, usage: totalUsage };
    }
}
