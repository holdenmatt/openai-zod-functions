import { ZodFunctionDef } from "../dist";
import { toJsonSchema, toTool } from "../src";
import { z } from "zod";

const func: ZodFunctionDef = {
  name: "get_current_weather",
  description: "Get the current weather",
  schema: z.object({
    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
    format: z
      .enum(["celsius", "fahrenheit"])
      .describe("The temperature unit to use. Infer this from the users location."),
  }),
};

describe("toJsonSchema", () => {
  it("converts a simple Zod schema to JSON Schema", () => {
    const jsonSchema = toJsonSchema(func);
    console.log(jsonSchema);

    expect(jsonSchema.name).toBe("get_current_weather");
    expect(jsonSchema.description).toBe("Get the current weather");
    expect(jsonSchema.parameters).toBeDefined();
    expect(jsonSchema.parameters.type).toBe("object");
    expect(jsonSchema.parameters.properties.location).toBe({
      type: "string",
      description: "The city and state, e.g. San Francisco, CA",
    });
    expect(jsonSchema.parameters.properties.format).toBe({
      type: "string",
      enum: ["celsius", "fahrenheit"],
      description: "The temperature unit to use. Infer this from the users location.",
    });
    expect(jsonSchema.parameters.properties.request).toBe(["location", "format"]);
  });
});

describe("toTool", () => {
  it("converts a Zod schema to OpenAI tool format", () => {
    const tool = toTool(func);

    expect(tool.type).toBe("function");
    expect(tool.function).toBeDefined();
    expect(tool.function.parameters?.type).toBe("object");
  });
});
