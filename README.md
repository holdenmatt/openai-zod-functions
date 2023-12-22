# openai-zod-functions

OpenAI Function Calling in Typescript using Zod.

Warning: This library isn't 100% stable yet, and APIs may change.
Feel free to fork/copy code if helpful.

## What is this?

OpenAI [Function Calling](https://platform.openai.com/docs/guides/function-calling),
released in June 2023, is one of the most exciting parts of LLM APIs.

This library makes it easier to use Function Calling in TypeScript
using [Zod](https://zod.dev/) to define functions instead of JSON-Schema.

It handles:
- Defining functions with Zod
- Converting Zod to JSON Schema (the format OpenAI uses)
- Using Zod to parse, validate, and type function call arguments

It also provides two optional higher-level patterns:
- A ZodFunctionHandler combines a function definition with its corresponding handler
- A ZodFunctionReducer can facilitate more complex state updates via function calls

## Why Zod?

Because it's great!

It's very expressive for validation, and plays very well with Typescript (unlike JSON-Schema).

It's also much more succinct. The example below is only 43% the length of the
equivalent JSON-Schema from the OpenAI [cookbook](https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models).

## Philosophy

This library's scope is deliberately narrow (focused only on function calling).

It's NOT an API wrapper, and should be compatible with any method of calling OpenAI,
including their
[API](https://platform.openai.com/docs/api-reference),
Vercel's [AI SDK](https://sdk.vercel.ai/docs),
or [LangChain](https://js.langchain.com/).

It aims to handle common function calling patterns, while remaining flexible.
Function calling can be used in many different ways, and we don't force any approach on you.

## Zod Functions

The simplest approach just uses [Zod](https://zod.dev/) for function definitions,
and leaves all other behavior up to you.

For example:
```
import { ZodFunctionDef, toTool } from "openai-zod-functions";

// Define functions using Zod
const functions: ZodFunctionDef[] = [
  {
    name: "get_current_weather",
    description: "Get the current weather",
    schema: z.object({
      location: z.string().describe("The city and state, e.g. San Francisco, CA"),
      format: z
        .enum(["celsius", "fahrenheit"])
        .describe("The temperature unit to use. Infer this from the users location.")
    })
  }
];

const messages = [
  {"role": "user", "content": "What's the weather in Boulder?"}
]

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages,

  // Convert ZodFunctions for OpenAI
  tools: functions.map(toTool),
});
```

## Parsing arguments

OpenAI completions return function call "arguments" as a string, and unfortunately models can
hallucinate arguments that don't match the schema.

This can be solved by using the same Zod function schema to parse/validate output.

For example, continuing the example above:
```
import { parseArguments } from "openai-zod-functions";

const functions: ZodFunctionDef[] = ...

const completion = await openai.chat.completions.create({
  ...
});

const { message } = completion.choices[0];
if (message.tool_calls) {
  const func = message.tool_calls[0].function;
  if (func.name === "get_current_weather") {
    const weatherFunction = functions[0];
    const { location, format } = parseArguments(func.name, func.args, weatherFunction.schema);

    // location/format are now typed, and validated against our schema.
    // Do something (e.g. call a weather API)
    ...
  }
}
```

If arguments don't match the schema, an exception will be thrown so you can decide what to do.
For example, you may want to retry, or display an error or suggestions to users.

## Function Handlers

The pattern I typically use is to colocate my function definitions with the
handlers they should call.

For that, your can use `createFunctionHandler`, which handles argument parsing
and type inference from your schema. It's more opinionated than the more manual
approach above.

For example:
```
const functions = [
  createFunctionHandler({
    name: "get_current_weather",
    description: "Get the current weather",
    schema: z.object({
      ...
    }),

    /**
     * This handler gets called with parsed/validated arguments typed by your schema.
     *
     * You can perform any (async) computation, and return any value you want.
     * Or just return args unchanged if you want to use tool output directly.
     */
    handler: async (args) => {
      const { location, format } = args;
      const temperature = await fetch("https://weather-api.xyz", {
        method: "POST",
        body: JSON.stringify({
          location,
          format
        })
      });

      return {
        temperature
      };
    }
  })
];

const completion = await openai.chat.completions.create({
  ...
});

const { message } = completion.choices[0];
const toolOutputs = await handleToolCalls(functions, message.tool_calls);
const { temperature } = toolOutputs[0];
...
```

## 👋 Say hello

If you find this useful or have suggestions, file an issue, start a discussion, or
you can find me [here](https://twitter.com/holdenmatt).

## Advanced: ZodFunctionReducer

(This section is WIP, and you probably don't need it.)

A ZodFunctionReducer is a more advanced alternative to ZodFunctionHandlers.
In most cases, it's simpler to use function handlers as described above.

However, I've found a function reducer can be useful when:
- Function calling logic gets more complex,
- You want to organize all state updates in one place,
- You're using function calls to **modify an object's state**, NOT as part of a chat conversation.

For example, I use this pattern for [ChartPilot](chartpilot.com), where LLM function calling
is used as a "fuzzy command palette" to update the state of a chart.

[v0.dev](https://v0.dev/) is another nice example (not affiliated with me) where an LLM
is used to modify the state of an object (a user interface), not as a chat interface.

The "function reducer" pattern here was inspired by Elm/Redux "reducers" or React's
[`useReducer`](https://react.dev/reference/react/useReducer) hook, where a user action triggers a
state update using a reducer function of the form `(prevState, action) => newState`.

Here, user actions are replaced with LLM function calls.

Here's a simplified example, showing how a ZodFunctionReducer could be used to modify
a chart's state via OpenAI function calls based on a user prompt:

```
import { ZodFunctionReducer, reduceToolCall } from "openai-zod-functions";

// Model our application state within a domain we want to use AI to manipulate.

const ChartTypeEnum = z.enum(["Line", "Bar", "Point"]).describe("Type of chart");
type ChartType = z.infer<typeof ChartTypeEnum>;

const AppearanceEnum = z.enum(["Light", "Dark"]).describe("Render chart in light or dark mode?");
type Appearance = z.infer<typeof AppearanceEnum>;

type State = {
  type: ChartType;
  appearance: Appearance;
  ...
};

// Define functions and their corresponding logic to update state

const functionReducer: ZodFunctionReducer<State> = {
  functions: [
    {
      name: "change_chart_type",
      description: "Modify the chart's type",
      schema: z.object({
        type: ChartTypeEnum
      })
    },
    {
      name: "change_appearance",
      description: "Toggle light/dark mode",
      schema: z.object({
        appearance: AppearanceEnum
      })
    },
    (...other functions...)
  ],
  reducer: (prev: State, name: string, args) => {
    switch (name) {
      case "change_chart_type":
        const { type } = args;
        return {
          ...prev,
          type
        };
      case "change_appearance":
        const { appearance } = args;
        return {
          ...prev,
          appearance
        };
      (etc...)
    }
  }
};

// Initial chart state
let state: State = {
  type: "Line",
  appearance: "Light"
}

// Call the LLM to trigger function calls
const prompt = "change to bar chart and dark mode";
const completion = await openai.chat.completions.create({...});
const { message } = completion.choices[0];

// Use function calls to update application state, via our reducer function.
state = await reduceToolCalls(state, functionReducer, message.tool_calls);
```

## Open questions

- How can we improve typing over arrays of functions with different Parameters/Output types?
