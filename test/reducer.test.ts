import { reduceToolCalls, ZodFunctionReducer, FunctionReducerError } from "../src";
import { z } from "zod";
import { InvalidFunctionName } from "../src/utils/parse";

jest.mock("../src/utils/logging", () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe("Function Reducers", () => {
  const testSchema = z.object({
    incrementBy: z.number(),
  });

  const testFunction = {
    name: "increment",
    description: "Increment state value",
    schema: testSchema,
  };

  const testReducer = (
    prevState: number,
    functionName: string,
    args: { incrementBy: number },
  ): number => {
    if (functionName === "increment") {
      return prevState + args.incrementBy;
    }
    return prevState;
  };

  const functionReducer: ZodFunctionReducer<number> = {
    functions: [testFunction],
    reducer: testReducer,
  };

  describe("reduceToolCalls", () => {
    it("updates state correctly based on tool calls", async () => {
      const toolCalls = [
        {
          id: "1",
          type: "function" as const,
          function: {
            name: "increment",
            arguments: JSON.stringify({ incrementBy: 5 }),
          },
        },
        {
          id: "2",
          type: "function" as const,
          function: {
            name: "increment",
            arguments: JSON.stringify({ incrementBy: 3 }),
          },
        },
      ];

      const newState = await reduceToolCalls(0, functionReducer, toolCalls);
      expect(newState).toBe(8);
    });

    it("returns the previous state for undefined tool calls", async () => {
      const newState = await reduceToolCalls(10, functionReducer, undefined);
      expect(newState).toBe(10);
    });

    it("throws an error for an invalid tool call", async () => {
      const invalidToolCalls = [
        {
          id: "1",
          type: "function" as const,
          function: {
            name: "nonExistentFunction",
            arguments: JSON.stringify({}),
          },
        },
      ];

      await expect(reduceToolCalls(0, functionReducer, invalidToolCalls)).rejects.toThrow(
        InvalidFunctionName,
      );
    });
  });
});
