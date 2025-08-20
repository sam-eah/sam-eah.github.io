---
title: 'Type-safe actions in typescript with zod and async support'
description: ''
pubDate: 'Aug 20 2025'
heroImage: '/type-safe-actions.PNG'
---

When building applications with multiple actions—API endpoints, commands, or business logic functions—it's crucial to have:

* **Type safety** for input parameters and return values
* **Runtime validation** to prevent invalid inputs
* **Support for both sync and async actions**

In this article, we’ll show a pattern using **TypeScript** and **Zod** that achieves all three.

---

## Step 1: define action types

We start by defining **actions with input** and **actions without input**:

```ts
import { z } from "zod";

// With input
type ActionWithInput<T extends z.ZodTypeAny, R> = {
  input: T;
  action: (params: z.infer<T>) => R;
};

// Without input
type ActionWithoutInput<R> = {
  action: () => R;
};
```

* `ActionWithInput` enforces a Zod schema, allowing TypeScript to infer the exact shape of `params`.
* `ActionWithoutInput` is for actions that require no input.

---

## Step 2: create the generic action helper

Next, we define a **unified `createAction` helper**. This ensures TypeScript correctly infers both input and output types:

```ts
// Generic helper that enforces the connection
function createAction<T extends z.ZodTypeAny, R>(config: {
  input: T;
  action: (params: z.infer<T>) => R;
}): ActionWithInput<T, R>;
function createAction<R>(config: { action: () => R }): ActionWithoutInput<R>;
function createAction(config: any): any {
  return config;
}
```

This overload-based approach allows TypeScript to infer `params` for input actions, while keeping input-less actions simple.

---

## Step 3: organize actions in a record

For a clean API, we can group actions using `createActions`:

```ts
// Create a record of actions
function createActions<
  T extends Record<string, ActionWithInput<any, any> | ActionWithoutInput<any>>,
>(actions: T): T {
  return actions;
}
```

This ensures that **all actions maintain their type safety** and allows TypeScript to provide accurate type hints for each one.

---

## Step 4: usage example

Here’s how you can define both sync and async actions:

```ts
import { db } from "./db/client.js";
import { items } from "./db/schema.js";

const actions = createActions({
  hello: createAction({
    input: z.object({ hello: z.string() }),
    action: (params) => {
      // ✅ TypeScript knows params is { hello: string }
      return params.hello.length;
    },
  }),
  ping: createAction({
    action: async () => db.select().from(items),
  }),
});

// ✅ Calls
actions.hello.action({ hello: "world" }); // number
const ping = await actions.ping.action(); // query result
```

---

## Step 5: add runtime validation

To make inputs **validated at runtime**, we can update `createAction`:

```ts
function createAction<T extends z.ZodTypeAny, R>(config: {
  input: T;
  action: (params: z.infer<T>) => R | Promise<R>;
}): ActionWithInput<T, R | Promise<R>>;
function createAction<R>(config: { action: () => R | Promise<R> }): ActionWithoutInput<R>;
function createAction(config: any): any {
  if ("input" in config) {
    const { input, action } = config;
    return {
      action: (params: any) => {
        const validated = input.parse(params); // ✅ runtime validation
        return action(validated);             // supports sync or async
      },
    };
  }
  return {
    action: () => config.action(),           // supports sync or async
  };
}
```

Now, any invalid input will immediately throw a **Zod validation error**, while TypeScript continues to infer the correct types for IDE hints.

---

## Why this pattern works well

1. **Type-safe inputs**: `params` are inferred from the Zod schema.
2. **Runtime validation**: Invalid inputs throw before executing the action.
3. **Sync & async ready**: Works for both types of actions.
4. **IDE friendly**: Each action shows the correct return type in the editor.
5. **Unified API**: No separate helpers for sync/async actions.


This pattern provides **robust type safety**, **runtime protection**, and **flexible async support**, making it ideal for modern TypeScript projects.
