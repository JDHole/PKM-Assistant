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