import { ChatCompletionMessageToolCall } from "openai/resources";

import { ZodFunctionDef } from "./function";
import { HttpError } from "./utils/errors";
import { logger } from "./utils/logging";
import { findFunction, parseArguments } from "./utils/parse";

type FunctionReducer<State, Parameters = any> = (
  prevState: State,
  functionName: string,
  args: Parameters
) => State;

/**
 * A reducer function threw an error.
 */
export class FunctionReducerError extends HttpError {
  constructor(name: string, err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    super(`Error calling reducer ${name}: ${message}`, 500);
  }
}

/**
 * A ZodFunctionReducer is a more advanced alternative to ZodFunctionHandlers.
 *
 * It can be useful when:
 * - You are using function calls to modify an object's state (such as the state of a chart), not in a chat messages context
 * - You have many functions and want to organize state updates in one place
 *
 * This pattern is inspired by "reducers" in Elm/Redux/React, replacing "actions" with LLM function calls.
 * For example, see: https://react.dev/reference/react/useReducer
 */
export type ZodFunctionReducer<State> = {
  functions: ZodFunctionDef<any>[];
  reducer: FunctionReducer<State>;
};

/**
 * Handle tool calls by updating state using a reducer function.
 *
 * Returns the new state if successful.
 * Throws an error if a tool name isn't found, arguments are invalid, or a reducer throws.
 */
export async function reduceToolCalls<State>(
  prevState: State,
  functionReducer: ZodFunctionReducer<State>,
  toolCalls: ChatCompletionMessageToolCall[] | undefined
): Promise<State> {
  if (toolCalls === undefined) {
    return prevState;
  }

  let state = prevState;

  toolCalls.forEach((toolCall) => {
    const { name } = toolCall.function;
    const func = findFunction(name, functionReducer.functions);

    const parameters = parseArguments(
      name,
      toolCall.function.arguments,
      func.schema
    );

    try {
      logger.info("Calling reducer: ", name);
      state = functionReducer.reducer(state, name, parameters);
      logger.info("New state: ", state);
    } catch (err) {
      throw new FunctionReducerError(name, err);
    }
  });

  return state;
}
