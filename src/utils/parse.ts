import { z } from "zod";
import { fromZodError } from "zod-validation-error";

import { ZodFunctionDef } from "../function";
import { HttpError } from "./errors";
import { logger } from "./logging";

/**
 * A function call used a non-existent name.
 */
export class InvalidFunctionName extends HttpError {
  constructor(name: string) {
    const message = `Function not found: ${name}`;
    super(message, 500);
  }
}

/**
 * An OpenAI function call had invalid arguments.
 */
export class InvalidFunctionArguments extends HttpError {
  constructor(name: string, args: string, zodError: z.ZodError) {
    const validationError = fromZodError(zodError).message;
    const message = `Invalid ${name} function args: ${validationError}`;
    const source = "OpenAI";

    logger.error(`${message} (${args})`);
    super(message, 500, source);
  }
}

/**
 * Find a function by name and return it.
 *
 * Throws InvalidFunctionName if no function with that name is found.
 */
export function findFunction(name: string, functions: ZodFunctionDef[]): ZodFunctionDef {
  const func = functions.find((f) => f.name === name);
  if (!func) {
    throw new InvalidFunctionName(name);
  }
  return func;
}

/**
 * Parse a function call's arguments string using a Zod schema.
 *
 * Returns the parsed/typed output if valid.
 * Otherwise throws an InvalidFunctionArguments error.
 */
export function parseArguments<Parameters>(
  name: string,
  args: string,
  schema: z.ZodType<Parameters, any, any>,
): Parameters {
  // Parse the arguments string to JSON (should be guaranteed)
  const parameters = JSON.parse(args);

  // Then validate against the schema (not guaranteed, can hallucinate)
  const result = schema.safeParse(parameters);

  if (!result.success) {
    throw new InvalidFunctionArguments(name, args, result.error);
  }

  return result.data;
}
