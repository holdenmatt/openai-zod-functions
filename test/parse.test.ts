import {
  findFunction,
  parseArguments,
  InvalidFunctionName,
  InvalidFunctionArguments,
} from "../src/utils/parse";
import { z } from "zod";

jest.mock("../src/utils/logging", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("Function Parsing", () => {
  const testSchema = z.object({
    param1: z.string(),
    param2: z.number(),
  });

  const functions = [
    {
      name: "testFunction",
      description: "A test function",
      schema: testSchema,
    },
  ];

  describe("findFunction", () => {
    it("finds the correct function definition", () => {
      const func = findFunction("testFunction", functions);
      expect(func).toEqual(functions[0]);
    });

    it("throws an error for a non-existent function name", () => {
      expect(() => findFunction("nonExistentFunction", functions)).toThrow(
        InvalidFunctionName,
      );
    });
  });

  describe("parseArguments", () => {
    it("correctly parses and validates function arguments", () => {
      const args = JSON.stringify({ param1: "value1", param2: 42 });
      const parsedArgs = parseArguments("testFunction", args, testSchema);
      expect(parsedArgs).toEqual({ param1: "value1", param2: 42 });
    });

    it("throws an error for invalid function arguments", () => {
      const invalidArgs = JSON.stringify({ param1: "value1", param2: "notANumber" });
      expect(() => parseArguments("testFunction", invalidArgs, testSchema)).toThrow(
        InvalidFunctionArguments,
      );
    });
  });
});
