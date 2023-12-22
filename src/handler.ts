import { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import { z } from "zod";

import { ZodFunctionDef } from "./function";
import { HttpError } from "./utils/errors";
import { logger } from "./utils/logging";
import { InvalidFunctionName, parseArguments } from "./utils/parse";

/**
 * A function handler threw an error.
 */
export class FunctionHandlerError extends HttpError {
  constructor(name: string, err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    super(`Error calling function ${name}: ${message}`, 500);
  }
}

/**
 * A ZodFunctionHandler combines a Zod function definition with a function call handler.
 *
 * The handler takes the parsed/typed function parameters as arguments,
 * and can perform any (async) computation and/or return an arbitrary output.
 */
export type ZodFunctionHandler<Parameters, Output> =
  ZodFunctionDef<Parameters> & {
    handler: (parameters: Parameters) => Promise<Output>;
  };

/**
 * Create a ZodFunctionHandler.
 *
 * You can also create one directly, but this convenience function
 * infers type parameters automatically from the schema/handler types.
 */
export function createFunctionHandler<
  Schema extends z.ZodType<any, any, any>,
  Output
>({
  name,
  description,
  schema,
  handler,
}: {
  name: string;
  description: string;
  schema: Schema;
  handler: (parameters: z.infer<Schema>) => Promise<Output>;
}): ZodFunctionHandler<z.infer<Schema>, Output> {
  return { name, description, schema, handler };
}

/**
 * Find a handler by name and return it.
 *
 * Throws InvalidFunctionName if no function with that name is found.
 */
function findHandler<Parameters, Output>(
  name: string,
  handlers: ZodFunctionHandler<Parameters, Output>[]
): ZodFunctionHandler<Parameters, Output> {
  const handler = handlers.find((h) => h.name === name);
  if (!handler) {
    throw new InvalidFunctionName(name);
  }
  return handler;
}

/**
 * Handle a tool call by picking the corresponding function handler.
 *
 * Returns the handler output if successful.
 * Throws an error if the name isn't found, arguments are invalid, or the handler throws.
 */
async function handleSingleToolCall<Output>(
  handlers: ZodFunctionHandler<any, Output>[],
  toolCall: ChatCompletionMessageToolCall
): Promise<Output> {
  const { name } = toolCall.function;

  const handler = findHandler(name, handlers);

  const parameters = parseArguments(
    toolCall.function.name,
    toolCall.function.arguments,
    handler.schema
  );

  try {
    logger.info("Calling function: ", name);
    const output = await handler.handler(parameters);
    logger.info("Tool handler output: ", output);
    return output;
  } catch (err) {
    throw new FunctionHandlerError(name, err);
  }
}

/**
 * Handle zero or more tool calls, using zero or more ZodFunctionHandlers.
 *
 * Returns the array of corresponding tool output if successful.
 * Throws an error if any tool name isn't found, any arguments are invalid, or any handler throws.
 */
export async function handleToolCalls<Output>(
  handlers: ZodFunctionHandler<any, Output>[],
  toolCalls: ChatCompletionMessageToolCall[] | undefined
): Promise<Output[]> {
  if (toolCalls === undefined) {
    return [];
  }

  const toolOutputs = await Promise.all(
    toolCalls.map((toolCall) => handleSingleToolCall(handlers, toolCall))
  );

  return toolOutputs;
}
