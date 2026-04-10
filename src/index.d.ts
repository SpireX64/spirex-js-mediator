/**
 * Generic options for mediator entities
 * @since 1.1.0
 */
export type TMediatorGenericOptions = {
    /** Optional display name */
    name?: string;
};

// =====================================================================================
// REQUESTS
// =====================================================================================

/**
 * Represents a mediator request object.
 * @template Result The type of the expected result when the request is handled.
 * @template Payload The type of data required to handle the request (optional).
 */
export type TMediatorRequest<Result, Payload = undefined> = Readonly<{
    [Symbol.species]?: Result;
    payload: Payload;
}>;

/**
 * Represents a factory function for creating a mediator request.
 *
 * @template Result The type of the expected result when the request is handled.
 * @template Payload The type of data required to handle the request (optional).
 */
export type TMediatorRequestType<
    Result,
    Payload = undefined,
> = Payload extends undefined
    ? () => TMediatorRequest<Result>
    : (payload: Payload) => TMediatorRequest<Result, Payload>;

/** 
 * Options for mediator request type definition
 * @since 1.1.0
 */
export type TMediatorRequestOptions = TMediatorGenericOptions;

/**
 * Defines a new mediator request type (a factory for request instances).
 *
 * Each request type may have at most one handler registered per mediator; a second
 * {@link IMediator.registerHandler} for the same type throws.
 *
 * @template Result The type of the expected result when the request is handled.
 * @template Payload The type of data required to handle the request (optional).
 * @param opt Optional settings; {@link TMediatorGenericOptions.name} identifies the type in errors.
 * @returns A function that creates frozen request objects for use with {@link IMediator.send}.
 *
 * @example
 * const CreateTask = defineRequest<Task, { desc: string }>();
 * let createTaskRequest = CreateTask({ desc: "Make coffee" });
 */
export declare function defineRequest<
    Result,
    Payload = undefined,
>(opt?: TMediatorRequestOptions): TMediatorRequestType<Result, Payload>;

/**
 * Provides context for a mediator request handler.
 * @template Payload The type of the request payload.
 */
export type IMediatorRequestContext<Payload> = Readonly<{
    /** The data passed with the request. */
    payload: Payload;
    /** The mediator handling this request (for sending further requests or publishing events). */
    mediator: IMediator;
    /** Optional `AbortSignal` to cancel the request. */
    abortSignal?: AbortSignal;
}>;

/**
 * Delegate function type for handling a mediator request.
 *
 * @template Result The type of the result returned by the handler.
 * @template Payload The type of data passed to the handler.
 * @param context The context object containing payload, mediator, and optional abort signal.
 * @returns Either a `Result` or a `Promise` of `Result`.
 */
export type TMediatorRequestHandlerDelegate<Result, Payload> = (
    context: IMediatorRequestContext<Payload>,
) => Result | Promise<Result>;

/**
 * Represents a mediator request handler.
 * @template Result The type of the result returned by the handler.
 * @template Payload The type of data accepted by the handler.
 */
export type TMediatorRequestHandler<Result, Payload> = Readonly<{
    /** The request type that this handler can handle. */
    type: TMediatorRequestType<Result, Payload>;
    /** The delegate function that processes the request. */
    handle: TMediatorRequestHandlerDelegate<Result, Payload>;
}>;

/**
 * Creates a mediator request handler for a specific request type.
 *
 * @template Result The type of the result returned by the handler.
 * @template Payload The type of data accepted by the handler.
 * @param requestType The mediator request type that this handler will process.
 * @param delegate The function that handles the request.
 * @returns A frozen {@link TMediatorRequestHandler} object.
 */
export declare function createHandler<Result, Payload>(
    requestType: TMediatorRequestType<Result, Payload>,
    delegate: TMediatorRequestHandlerDelegate<Result, Payload>,
): TMediatorRequestHandler<Result, Payload>;

// ==========================================================================================
// EVENTS
// ==========================================================================================

/**
 * Represents a mediator event object.
 * @template Payload The type of data carried by the event (optional).
 */
export type TMediatorEvent<Payload = undefined> = Readonly<{
    payload: Payload;
}>;

/** 
 * Options for mediator event type definition
 * @since 1.1.0
 */
export type TMediatorEventOptions = TMediatorGenericOptions & {
    /**
     * When `true`, the last published payload is replayed to new `on()` subscribers.
     */
    replayLast?: boolean;
};

/**
 * Represents a factory function for creating a mediator event.
 * @template Payload The type of data carried by the event (optional).
 */
export type TMediatorEventType<Payload = undefined> = Payload extends undefined
    ? () => TMediatorEvent
    : (payload: Payload) => TMediatorEvent<Payload>;

/**
 * Defines a new mediator event type (a factory for event instances).
 *
 * @template Payload The type of data carried by the event (optional).
 * @param opt Optional settings: {@link TMediatorGenericOptions.name} and {@link TMediatorEventOptions.replayLast}.
 * @returns A function that creates frozen event objects for use with {@link IMediator.publish}.
 *
 * @example
 * const OnNewMessage = defineEvent<Message>();
 * let newMessageEvent = OnNewMessage(msg);
 */
export declare function defineEvent<Payload = undefined>(
    opt?: TMediatorEventOptions,
): TMediatorEventType<Payload>;

/**
 * Provides context for a mediator event listener.
 * @template Payload The type of the event payload.
 */
export type TMediatorEventContext<Payload> = Readonly<{
    /** The event type that triggered the listener. */
    type: TMediatorEventType<Payload>;
    /** The data passed with the event. */
    payload: Payload;
    /** The mediator that published the event (for sending requests or publishing further events). */
    mediator: IMediator;
}>;

/**
 * Function type for handling mediator events.
 *
 * If the listener returns another event or request instance (created with {@link defineEvent} /
 * {@link defineRequest}), the mediator forwards it: events are {@link IMediator.publish | published},
 * requests are {@link IMediator.send | sent}. The same applies when a `Promise` resolves to such a value.
 * @template Payload The type of data passed with the event.
 * @param context The context object containing event type, payload, and mediator.
 */
export type TMediatorEventListener<Payload> = (
    context: TMediatorEventContext<Payload>,
) =>
    | void
    | undefined
    | Promise<void>
    | TMediatorEventType<any>
    | TMediatorRequestType<any, any>
    | Promise<TMediatorEventType<any>>
    | Promise<TMediatorRequestType<any, any>>;

/** Calling this function unsubscribes the listener from the event. Returns whether a listener was removed. */
export type TMediatorEventListenerDispose = () => boolean;

/**
 * Function type for handling errors thrown by event listeners during {@link IMediator.publish}.
 * Does not receive errors from synchronous {@link IMediator.on} replay for {@link TMediatorEventOptions.replayLast | replayLast} events (see {@link TMediatorEventOptions});
 * those are not wrapped by the mediator.
 *
 * @param error The error thrown by the listener.
 * @param context The event context where the error occurred.
 */
export type TMediatorEventErrorHandler = (
    error: unknown,
    context: TMediatorEventContext<unknown>,
) => void | Promise<void>;

// ==========================================================================================
// MEDIATOR
// ==========================================================================================

/** Mediator instance: registers request handlers, sends requests, and publishes events. */
export interface IMediator {
    /**
     * Dispatches a request to its registered handler. Execution is scheduled as a microtask.
     *
     * @template T The expected result type.
     * @param request A request instance from a {@link defineRequest} factory.
     * @param abortSignal Optional cancellation signal passed to the handler.
     * @returns A promise of the handler result, or rejection if there is no handler or the handler throws.
     * @throws {TypeError} If `request` is not a valid mediator request object.
     * @throws {Error} If no handler was registered for this request type (message includes the type {@link TMediatorGenericOptions.name | name}).
     */
    send<T>(
        request: TMediatorRequest<T, any>,
        abortSignal?: AbortSignal,
    ): Promise<T>;

    /**
     * Publishes an event to all current listeners. Each listener runs in a microtask.
     *
     * If a listener returns (or resolves to) another event or request, it is forwarded automatically.
     *
     * @template T Payload type of the event.
     * @param event An event instance from a {@link defineEvent} factory.
     * @throws {TypeError} If `event` is not a valid mediator event object.
     */
    publish<T>(event: TMediatorEvent<T>): void;

    /**
     * Clears stored payload for a {@link TMediatorEventOptions.replayLast | replayLast} event type (see {@link defineEvent}).
     * Subsequent subscribers will not receive a replay until the event is published again.
     *
     * @param eventType The event factory returned by {@link defineEvent}.
     * @returns Whether a stored payload existed and was removed.
     */
    clearReplay(eventType: TMediatorEventType<any>): boolean;

    /**
     * Subscribes a listener to an event type.
     *
     * For event types with **`replayLast`**, if a payload was previously published, the listener is invoked **synchronously**
     * with that payload (same shape as publish). Errors thrown during this replay are not passed to {@link IMediator.setEventHandler}.
     *
     * @template T Payload type.
     * @param eventType Event factory from {@link defineEvent}.
     * @param listener Called on each publish; return value may forward another event or request.
     * @returns Unsubscribe function (returns whether the listener was present).
     */
    on<T>(
        eventType: TMediatorEventType<T>,
        listener: TMediatorEventListener<T>,
    ): TMediatorEventListenerDispose;

    /**
     * Subscribes a listener that runs at most once.
     * Does not receive {@link TMediatorEventOptions.replayLast | replayLast} replay on subscribe; only the next publish fires.
     * @template T Payload type.
     * @param eventType Event factory from {@link defineEvent}.
     * @param listener Called on each publish; return value may forward another event or request.
     * @returns Unsubscribe function (returns whether the listener was present).
     */
    once<T>(
        eventType: TMediatorEventType<T>,
        listener: TMediatorEventListener<T>,
    ): TMediatorEventListenerDispose;

    /**
     * Returns the number of listeners registered for this event type.
     * @param eventType The event factory.
     * @returns The number of listeners registered for this event type.
     * @since 1.1.0
     */
    getEventListenersCount(eventType: TMediatorEventType<any>): number;

    /**
     * Removes all listeners for this event type. Does **not** clear stored payload for {@link TMediatorEventOptions.replayLast | replayLast};
     * use {@link clearReplay} for that.
     *
     * @param eventType The event factory.
     * @returns Whether there were any listeners to remove.
     * @since 1.1.0
     */
    disposeEventListeners(eventType: TMediatorEventType<any>): boolean;

    /**
     * Sets the handler invoked when a listener throws during {@link publish} (microtask path), or when an async
     * listener's promise rejects before a resolved forward value is produced.
     *
     * @param errorHandler Receives the error and the event context.
     * @since 1.1.0
     */
    setEventHandler(errorHandler: TMediatorEventErrorHandler): void;

    /**
     * Registers one or more request handlers. Registering twice for the same request type throws.
     *
     * @param handler A single handler or an array of handlers.
     * @since 1.1.0
     */
    registerHandler(
        handler:
            | TMediatorRequestHandler<any, any>
            | readonly TMediatorRequestHandler<any, any>[],
    ): void;

    /**
     * @deprecated Since 1.1.0 — {@link createMediator} already returns a usable mediator. Prefer using the instance directly.
     * @returns The same mediator instance (`this`).
     */
    build(): IMediator;
}

/**
 * Creates a mediator instance. No separate “build” step is required.
 */
export function createMediator(): IMediator;

/**
 * @deprecated Since 1.1.0 — use {@link createMediator} instead. This alias exists for backward compatibility.
 */
export interface IMediatorBuilder extends IMediator {
    /** @deprecated Use the mediator directly; same as {@link IMediator.build}. */
    build(): IMediator;
}

/**
 * @deprecated Since 1.1.0 — alias of {@link createMediator}.
 */
export function mediatorBuilder(): IMediatorBuilder;
