/**
 * Stream Helper - wraps SmartChatModel's .stream() as a Promise
 * Used by memory subsystem (extraction, summarization, consolidation).
 *
 * Problem: SmartChatModel has ONLY .stream() (callback-based).
 * Solution: Wrap it so callers can do: const text = await streamToComplete(model, msgs)
 */

/**
 * Call a SmartChatModel in non-streaming mode.
 * @param {Object} chatModel - SmartChatModel instance with .stream()
 * @param {Array} messages - Array of { role, content } messages
 * @returns {Promise<string>} Full response text
 */
export function streamToComplete(chatModel, messages) {
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
                    resolve(content);
                },
                error: (err) => {
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
 * @returns {Promise<{ finalText: string, toolsUsed: string[] }>}
 */
export async function streamToCompleteWithTools(chatModel, messages, tools, executeToolCall, options = {}) {
    const maxIterations = options.maxIterations || 3;
    const toolsUsed = [];
    let currentMessages = [...messages];

    for (let i = 0; i < maxIterations; i++) {
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

        // Extract tool calls and content from response
        const message = response?.choices?.[0]?.message;
        const toolCalls = message?.tool_calls || [];
        const content = message?.content || '';

        // No tool calls → return text response
        if (toolCalls.length === 0) {
            return { finalText: content, toolsUsed };
        }

        // Add assistant message with tool calls to conversation
        currentMessages.push({
            role: 'assistant',
            content: content || null,
            tool_calls: toolCalls
        });

        // Execute each tool call and add results
        for (const tc of toolCalls) {
            const toolName = tc.function?.name || tc.name;
            const toolArgs = tc.function?.arguments || tc.arguments;
            toolsUsed.push(toolName);

            try {
                const result = await executeToolCall({
                    id: tc.id,
                    name: toolName,
                    arguments: toolArgs
                });

                currentMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: typeof result === 'string' ? result : JSON.stringify(result)
                });
            } catch (toolError) {
                currentMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: `Error: ${toolError.message || toolError}`
                });
            }
        }
    }

    // Max iterations reached — do one final call WITHOUT tools so model can summarize
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

        // Strip any hallucinated XML tool calls (cheap models sometimes emit these)
        finalText = finalText.replace(/<\|?DSML\|?[^>]*>[\s\S]*?<\/?\|?DSML\|?[^>]*>/g, '').trim();
        finalText = finalText.replace(/<function_calls?>[\s\S]*?<\/function_calls?>/g, '').trim();
        finalText = finalText.replace(/<invoke[\s\S]*?<\/antml:invoke>/g, '').trim();

        return { finalText: finalText || '(Minion: osiągnięto limit iteracji narzędzi)', toolsUsed };
    } catch {
        return { finalText: '(Minion: osiągnięto limit iteracji narzędzi)', toolsUsed };
    }
}