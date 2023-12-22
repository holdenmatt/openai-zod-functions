import { ChatCompletion } from "openai/resources";

import { logger } from "./logging";

/**
 * Assert that a ChatCompletion response contains a single tool_call.
 * Throw an error if it doesn't.
 */
export function assertSingleToolCall(
  completion: ChatCompletion,
  label?: string
): void {
  const prefix = label ? `Unexpected (${label})` : "Unexpected";

  if (completion.choices.length !== 1) {
    throw new Error(`${prefix}: got ${completion.choices.length} choices`);
  }

  const { tool_calls } = completion.choices[0].message;
  if (tool_calls === undefined) {
    throw new Error(`${prefix}: no tool_calls for ${label}`);
  }

  if (tool_calls.length !== 1) {
    logger.error(
      `${prefix}: Multiple tool calls for ${label}: ${JSON.stringify(
        tool_calls,
        null,
        2
      )}`
    );
    throw new Error(`${prefix}: got ${tool_calls.length} tool_calls`);
  }
}
