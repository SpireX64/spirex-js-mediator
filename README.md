# SpireX's Mediator for JS/TS Projects

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fmediator?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fmediator?style=for-the-badge)](https://www.npmjs.com/package/@spirex/mediator)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-js-mediator?style=for-the-badge)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-js-mediator?token=VXQZK5WDSY&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-js-mediator)

`@spirex/mediator` is a lightweight mediator for JavaScript and TypeScript that simplifies event-driven architecture, CQRS, and decoupled application design.

The library focuses on decoupling application layers by removing direct dependencies between senders and receivers.
Instead of calling services or modules directly, application parts communicate through requests and events handled by the mediator.

This approach helps to:
- reduce tight coupling between modules
- make application flow easier to reason about
- simplify refactoring and feature evolution
- improve testability of business logic

## Installation
You can install the package using any popular package manager.

```sh
# NPM
npm install @spirex/mediator
# YARN
yarn add @spirex/mediator
```

### Requirements & compatibility
The library has **zero runtime dependencies**.

It relies on the following built-in JavaScript features: `Promise`, `Map`, `Set`.

These APIs are available in all modern JavaScript environments (ES2015+). If you need to support very old runtimes (for example, legacy browsers), you may need to provide appropriate polyfills.

### Module formats
The package supports multiple module systems out of the box:

- ES Modules (ESM) – modern standard for JavaScript modules using `import` and `export`.
- CommonJS (CJS) – Node.js module system using require and module.exports.
- UMD (Universal Module Definition) – works in both browsers and Node.js, compatible with AMD and global scripts.

This makes it usable in modern bundlers, Node.js environments, and browser-based setups.

### TypeScript support
Although the library is written in pure JavaScript, it is fully and strictly typed.

- All public APIs are covered by TypeScript type definitions;
- No additional setup is required;
- Works seamlessly in both JS and TS projects.

## Quick Start
This example demonstrates the core concepts of the mediator:
- how to create a mediator with **`createMediator()`**;
- how to define requests and events;
- how to handle requests using pure, stateless handlers;
- how to publish and subscribe to events.

```ts
import {
    createMediator,
    createHandler,
    defineRequest,
    defineEvent,
} from "@spirex/mediator";

type Task = {
    id: number;
    status: "todo" | "work" | "done";
    priority: number;
    summary: string;
};

// Define request with payload type (optional `name` improves error messages)
const CreateTask = defineRequest<Task, { summary: string; priority: number }>({
    name: "CreateTask",
});

// Define event to notify about new tasks
const TaskCreated = defineEvent<Task>();

const CreateTaskHandler = createHandler(
    CreateTask,
    async ({ payload, mediator }) => {
        const task: Task = {
            id: generateId(),
            status: "todo",
            priority: payload.priority,
            summary: payload.summary,
        };
        await repo.saveTask(task);

        mediator.publish(TaskCreated(task));
        return task;
    },
);

const mediator = createMediator();
mediator.registerHandler(CreateTaskHandler);

const dispose = mediator.on(TaskCreated, ({ payload: task }) => {
    console.log("New task:", task.summary);
});

const newTask = await mediator.send(
    CreateTask({ summary: "Make profile screen", priority: 5 }),
);
```

### Creating a mediator

Import **`createMediator`** from `@spirex/mediator` and call it to get a ready-to-use instance:

```ts
import { createMediator } from "@spirex/mediator";

const mediator = createMediator();
```

## Working with the Mediator

The mediator is responsible for delivering messages inside the application.

There are two types of messages:
- **Events** — notifications about something that already happened
- **Requests** — messages that expect a single result

They serve different purposes and are handled differently.

### Mediator Events

#### What is an Event?
An event represents a fact that has already happened in the system.

Events are used only for notification.
They **do not return results** and do not affect the execution flow of the sender.

Typical examples: "user authorized", "task created", "payment completed", "connection lost".

#### Defining an Event
An event defines the shape of its payload.
```ts
import { defineEvent } from "@spirex/mediator";

const UserAuthorized = defineEvent<{ userId: string }>();
```

You may pass options for a display **`name`** (used in tooling and consistency with requests) and **`stateful`** (see **Stateful events** below):

```ts
const ThemeChanged = defineEvent<{ theme: string }>({
    name: "ThemeChanged",
    stateful: true,
});
```

If an event does not carry any data, the payload type can be omitted:
```ts
const AppStarted = defineEvent();
```

#### Publishing an Event
Events are published through the mediator:
```ts
mediator.publish(UserAuthorized({ userId: "123" }));
```

Important characteristics:
- `publish` returns immediately (void); it does not require `await`;
- listeners run in **microtasks** (scheduled after the current synchronous work);
- events do not need to be registered in the mediator beforehand.

#### Subscribing to an Event
You can subscribe to an event using `on` method:
```ts
const dispose = mediator.on(UserAuthorized, ({ payload, mediator }) => {
    console.log("Authorized:", payload.userId);
});
```
To unsubscribe, call the returned function: `dispose()`. It returns a boolean indicating whether a listener was removed.

You can also subscribe only once:
```ts
mediator.once(AppStarted, () => {
    console.log("Application started");
});
```

#### Access to the Mediator inside Event Listeners
Every event listener receives a reference to the mediator instance. This allows listeners to trigger side effects in a controlled way:
- send requests;
- publish more specific events;
- coordinate application behavior without tight coupling.

```ts
mediator.on(UserAuthorized, async ({ payload, mediator }) => {
    // Load additional data after authorization
    const profile = await mediator.send(
        LoadUserProfile({ userId: payload.userId }),
    );
    userStore.setProfile(profile)

    // Notify that the profile is ready
    mediator.publish(UserProfileReady(profile));
});
```

Because listeners have access to the mediator:
- events can remain simple and declarative;
- complex flows can be built by composition, not branching logic;
- features can evolve independently without modifying the event source.

#### Forwarding another event or request
A listener may **return** another event or request instance. The mediator will **`publish`** or **`send`** it for you. The same behavior applies to **`on`** and **`once`**. This is a shortcut for triggering follow-up messages, not a data transformation pipeline.

```ts
mediator.on(OrderPlaced, ({ payload }) =>
    PaymentRequired(mapToPaymentPayload(payload)),
);
```

#### Stateful events
Pass **`{ stateful: true }`** to **`defineEvent`**. Keeps the last published event for **replay to new subscribers** that event type. When a new subscriber is added with **`on()`**, they are invoked **synchronously** with that payload (same shape as a normal publish). Use **`clearState(eventType)`** to drop the stored payload. **`once()`** does **not** replay stored state; it only runs on the next **`publish`**.

#### Inspecting and clearing listeners
- **`getEventListenersCount(eventType)`** — number of listeners for an event type.
- **`disposeEventListeners(eventType)`** — remove all listeners for that type. Stored stateful payload is **not** cleared; call **`clearState`** if needed.

#### Event Listeners Execution Model
- Event listeners can be synchronous or asynchronous;
- Each listener is scheduled in its own **microtask** when the event is published.

This helps ensure that:
- an error in one listener **does not** affect others;
- an error **does not** propagate back to the event source.

Use **`setEventHandler(handler)`** to observe listener errors (including **`Promise`** rejections from async listeners before forwarding). Errors during **synchronous stateful replay** on subscribe are **not** passed to this handler (see stateful section above).


### Mediator Requests

#### What is a Request?
A request represents an **explicit operation that produces a result**.

Unlike events, which only notify that something happened, a request is used when the caller expects a concrete value and wants to continue execution based on that value.
Requests model actions such as creating entities, loading data, performing calculations, or interacting with external systems.

From the caller’s perspective, sending a request is very similar to calling a function.
The key difference is that the caller does not know who handles the request or how it is handled.

#### Defining a Request 
A request definition describes two things:
- the type of the result it produces;
- the type of data required to execute it.

```ts
import { defineRequest } from "@spirex/mediator";

// defineRequest<Result, Payload>()
const CreateUser = defineRequest<User, {
    name: string;
    email: string;
}>();
```

If no payload is required, the payload type can be omitted:
```ts
const GetCurrentUser = defineRequest<User | null>();
```

Optional factory options include a **`name`** string (defaults such as `requestUnnamed` appear in error messages if omitted):

```ts
const CreateUser = defineRequest<User, { name: string; email: string }>({
    name: "CreateUser",
});
```

The returned value is a **request type**, not the request itself.
Calling it creates a request instance that can be sent through the mediator.

#### Handling a Request
Every request must have exactly one handler.

A handler defines how the request is executed and how the result is produced.
It is created by binding a request type to a handling function.

```ts
import { createHandler } from "@spirex/mediator";

const CreateUserHandler = createHandler(
    CreateUser,
    async ({ payload, mediator, abortSignal }) => {
        const user = await repo.createUser(payload);
        return user;
    }
);
```

The handler function receives a context object.
This context contains the request payload, a reference to the mediator, and an optional `AbortSignal`.

Because the mediator reference is available, a handler can:
- publish events;
- send other requests;
- coordinate more complex flows.

Handlers are expected to be stateless.
Any required dependencies should be provided externally, for example via factories or dependency injection.

#### Registering Handlers
Register handlers on the mediator instance. **`registerHandler`** accepts one handler or an array of handlers.

```ts
const mediator = createMediator();
mediator.registerHandler(CreateUserHandler);
```

**Only one** handler may exist per **request type**. Registering a second handler for the same type **throws an error**.

#### Sending a Request
A request is executed by sending it through the mediator:

```ts
const user = await mediator.send(
    CreateUser({ 
        name: "Admin",
        email: "admin@example.com",
    }),
);
```

Sending a request **always returns a `Promise`**, even if the handler itself is synchronous.
This guarantees a consistent execution model and avoids ambiguity at the call site.

If the handler throws an error or rejects, the error is propagated back to the sender.
This makes request errors part of normal business logic and allows them to be handled explicitly by the caller.

#### Cancelling a Request with `AbortSignal`
When sending a request, you can optionally provide an `AbortSignal`.

```ts
const controller = new AbortController();

await mediator.send(
    DeleteUser({ withName: "Admin" }),
    controller.signal,
);
```

The provided signal is passed to the request handler through the execution context.
```ts
const DeleteUser = defineRequest<boolean, { id: string }>();

const DeleteUserHandler = createHandler(
    DeleteUser,
    async ({ payload, abortSignal }) => {
        if (abortSignal?.aborted) return false;
        return repo.deleteUserById(payload.id, { signal: abortSignal });
    },
);
```

This allows the handler to react to cancellation and stop execution if the operation has not yet completed.
Because `AbortSignal` is a standard API, it can be used to cancel HTTP requests, timeouts, or any other abortable operation.

If a request handler sends other requests using the same signal, cancellation naturally propagates through the entire execution chain.

This is especially useful when a request represents a complex operation composed of multiple steps.
By aborting the root request, the whole chain can be interrupted consistently, without leaving the system in a partially completed state.

Cancellation is cooperative.
It is the handler’s responsibility to observe the signal and decide how to react, including rolling back changes if necessary.

## Best Practices
This section contains general recommendations that help keep mediator-based code clear, predictable, and easy to evolve.

### Naming Requests and Events
Requests should be named as **explicit actions** and usually start with a verb.

Good examples:
`CreateUser`, `UpdateProfile`, `LoadBooks`, `GetBookById`.

Events should describe something that **already happened** and are typically named in past tense.

Good examples:
`UserCreated`, `ProfileUpdated`, `BooksLoaded`, `PaymentFailed`.

Clear naming makes message intent obvious without looking at the handler implementation.

### Commands & Queries (CQRS)

The library allows you to define Commands and Queries, which are special types of Requests. This aligns well with the CQRS (Command Query Responsibility Segregation) pattern, where:
- Commands — represent operations that change data (e.g., creating or updating a resource).
- Queries — safe operations that read data without modifying it (e.g., fetching a list of users).

You can reflect this either in naming:

```ts
export const CreateUserCommand =
    defineRequest<User, { name: string }>()

export const CreateTaskCommand =
    defineRequest<Task, { summary: string, priority: number}>()

export const FindUserPurchasesQuery = 
    defineRequest<readonly Purchase[], { userId: number }>()

export const LoadRemoteConfigQuery =
    defineRequest<RemoteConfig>()
```

### Grouping Definitions
Requests and events are usually grouped by feature, not by type.

Instead of collecting all requests or all events in a single file, keep them close to the domain they belong to.

```ts
// FILE: user/contracts.ts
export const UserCommand = {
    create: defineRequest<...>(),
    update: defineRequest<...>(),
    delete: defineRequest<...>(),
};
// mediator.send(UserCommand.create({ name: "Admin" }))

export const UserQuery = {
    getById: defineRequest<...>(),
    find: defineRequest<...>(),
}
// mediator.send(UserQuery.find({ group: 'vip' }))

export const UserEvent = {
    created: defineEvent<User>(),
    updated: defineEvent<User>(),
}
// mediator.publish(UserEvent.updated(user))
```
This reduces cognitive load and helps features evolve independently.

### Stateless Handlers
Request handlers should be **stateless functions**.

They should not store data internally or rely on shared mutable state.
Any required dependencies (repositories, gateways, services) should be provided externally, typically via factories or dependency injection.

### Exceptions in Handlers & Listeners
Errors thrown inside request handlers are considered part of business logic.

They propagate back to the sender and should be handled where the request is sent.
This makes failures explicit and keeps error handling predictable.

Event listener errors, on the other hand, are isolated from the publisher and should be handled via **`setEventHandler`** on the mediator (see **Event Listeners Execution Model** above).

## Changelog

Release notes and migration hints for older package versions live under [`changelog/`](changelog/)

