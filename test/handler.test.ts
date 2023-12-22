import {
  FunctionHandlerError,
  createFunctionHandler,
  findHandler,
  handleSingleToolCall,
  handleToolCalls,
} from "../src/handler";
import { z } from "zod";
import { InvalidFunctionName } from "../src/utils/parse";

jest.mock("../src/utils/logging", () => ({
  logger: {
    info: jest.fn(),
  },
}));

const testSchema = z.object({
  param1: z.string(),
  param2: z.number(),
});

const testHandler = jest.fn(async ({ param1, param2 }) => {
  return `Processed ${param1} and ${param2}`;
});

const testFunction = createFunctionHandler({
  name: "testFunction",
  description: "A test function",
  schema: testSchema,
  handler: testHandler,
});

const testFunction2 = createFunctionHandler({
  name: "testFunction2",
  description: "A second test function",
  schema: testSchema,
  handler: testHandler,
});

describe("Function Handlers", () => {
  const handlers = [testFunction, testFunction2];

  describe("createFunctionHandler", () => {
    it("creates a function handler", () => {
      expect(testFunction.name).toBe("testFunction");
      expect(testFunction.description).toBe("A test function");
      expect(testFunction.schema).toEqual(testSchema);
      expect(testFunction.handler).toBeDefined();
    });
  });

  describe("findHandler", () => {
    it("finds the correct handler", () => {
      const handler = findHandler("testFunction", handlers);
      expect(handler).toEqual(testFunction);

      const handler2 = findHandler("testFunction2", handlers);
      expect(handler2).toEqual(testFunction2);
    });

    it("throws an error for an invalid function name", () => {
      expect(() => findHandler("nonExistentFunction", handlers)).toThrow();
    });
  });

  describe("handleSingleToolCall", () => {
    it("handles a single tool call", async () => {
      const toolCall = {
        id: "1",
        type: "function" as const,
        function: {
          name: "testFunction",
          arguments: JSON.stringify({ param1: "value1", param2: 42 }),
        },
      };

      const result = await handleSingleToolCall(handlers, toolCall);
      expect(result).toBe("Processed value1 and 42");
      expect(testHandler).toHaveBeenCalledWith({ param1: "value1", param2: 42 });
    });

    it("throws an error for an invalid tool call", async () => {
      const invalidToolCall = {
        id: "1",
        type: "function" as const,
        function: {
          name: "nonExistentFunction",
          arguments: JSON.stringify({}),
        },
      };

      await expect(handleSingleToolCall(handlers, invalidToolCall)).rejects.toThrow(
        InvalidFunctionName,
      );
    });

    it("throws an error if the handler throws", async () => {
      const badFunction = createFunctionHandler({
        name: "testFunction",
        description: "A test function",
        schema: testSchema,
        handler: async ({ param1, param2 }) => {
          throw new Error("handler failed");
          return `Processed ${param1} and ${param2}`;
        },
      });

      const toolCall = {
        id: "1",
        type: "function" as const,
        function: {
          name: "testFunction",
          arguments: JSON.stringify({ param1: "value1", param2: 42 }),
        },
      };

      await expect(handleSingleToolCall([badFunction], toolCall)).rejects.toThrow(
        FunctionHandlerError,
      );
    });
  });

  describe("handleToolCalls", () => {
    it("handles multiple tool calls", async () => {
      const toolCalls = [
        {
          id: "1",
          type: "function" as const,
          function: {
            name: "testFunction",
            arguments: JSON.stringify({ param1: "value1", param2: 42 }),
          },
        },
        {
          id: "2",
          type: "function" as const,
          function: {
            name: "testFunction2",
            arguments: JSON.stringify({ param1: "value2", param2: 24 }),
          },
        },
      ];

      const results = await handleToolCalls(handlers, toolCalls);
      expect(results).toEqual(["Processed value1 and 42", "Processed value2 and 24"]);
    });

    it("returns an empty array for undefined tool calls", async () => {
      const results = await handleToolCalls(handlers, undefined);
      expect(results).toEqual([]);
    });
  });
});
