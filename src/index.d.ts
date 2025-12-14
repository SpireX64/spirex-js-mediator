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
 * Defines a new mediator request type.
 *
 * @template Result The type of the expected result when the request is handled.
 * @template Payload The type of data required to handle the request (optional).
 * @returns A function that generates a request with the specified payload.
 *
 * @example
 * const CreateTask = defineRequest<Task, { desc: string }>();
 * let createTaskRequest = CreateTask({ desc: "Make coffee" });
 */
export declare function defineRequest<
    Result,
    Payload = undefined,
>(): TMediatorRequestType<Result, Payload>;

/**
 * Provides context for a mediator request handler.
 * @template Payload The type of the request payload.
 */
export type IMediatorRequestContext<Payload> = Readonly<{
    /** The data passed with the request. */
    payload: Payload;
    /** Reference to the mediator that published the event, allowing sending requests or publishing other events. */
    mediator: IMediator;
    /** Signal Optional AbortSignal to cancel the request */
    abortSignal?: AbortSignal;
}>;

/**
 * Delegate function type for handling a mediator request.
 *
 * @template Result The type of the result returned by the handler.
 * @template Payload The type of data passed to the handler.
 * @param context The context object containing payload, mediator, and optional abort signal.
 * @returns Either a Result or a Promise of Result.
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
 * @returns A TMediatorRequestHandler object.
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
 * Represents a factory function for creating a mediator event.
 * @template Payload The type of data carried by the event (optional).
 */
export type TMediatorEventType<Payload = undefined> = Payload extends undefined
    ? () => TMediatorEvent
    : (payload: Payload) => TMediatorEvent<Payload>;

/**
 * Define a new mediator event type.
 *
 * @template Payload The type of data carried by the event (optional).
 * @returns A function that generates a event instance with the specified payload.
 *
 * @example
 * const OnNewMessage = defineEvent<Message>();
 * let newMessageEvent = OnNewMessage(msg);
 */
export declare function defineEvent<
    Payload = undefined,
>(): TMediatorEventType<Payload>;

/**
 * Provides context for a mediator event listener.
 * @template Payload The type of the event payload.
 */
export type TMediatorEventContext<Payload> = Readonly<{
    /** The event type that triggered the listener. */
    type: TMediatorEventType<Payload>;
    /** The data passed with the event. */
    payload: Payload;
    /** Reference to the mediator that published the event, allowing sending requests or publishing other events. */
    mediator: IMediator;
}>;

/**
 * Function type for handling mediator events.
 *
 * @template Payload The type of data passed with the event.
 * @param context The context object containing event type, payload, and mediator.
 * @returns Optionally returns a Promise<void> if the listener is asynchronous.
 */
export type TMediatorEventListener<Payload> = (
    context: TMediatorEventContext<Payload>,
) => void | Promise<void>;

/** Calling this function unsubscribes the listener from the event. */
export type TMediatorEventListenerDispose = () => void;

/**
 * Function type for handling errors thrown by event listeners.
 *
 * @param error The error object thrown by the listener.
 * @param context The event context where the error occurred.
 * @returns Optionally returns a Promise<void> if error handling is asynchronous.
 */
export type TMediatorEventErrorHandler = (
    error: unknown,
    context: TMediatorEventContext<unknown>,
) => void | Promise<void>;

// ==========================================================================================
// MEDIATOR
// ==========================================================================================

/** Interface representing the Mediator instance */
export interface IMediator {
    /**
     * Sends a request to the corresponding handler and returns a Promise of the result.
     *
     * @template T The type of the expected result.
     * @param request The request object created via a request factory.
     * @param abortSignal Optional AbortSignal to cancel the request.
     * @returns A Promise resolving to the handler's result.
     */
    send<T>(
        request: TMediatorRequest<T, any>,
        abortSignal?: AbortSignal,
    ): Promise<T>;

    /**
     * Publishes an event to all subscribed listeners.
     *
     * @template T The type of payload in the event.
     * @param event The event instance.
     */
    publish<T>(event: TMediatorEvent<T>): void;

    /**
     * Subscribes a listener to a specific event type.
     *
     * @template T The type of payload in the event.
     * @param eventType The event type to listen for.
     * @param listener Function that will be called whenever the event is published.
     * @returns A function that can be called to unsubscribe the listener.
     */
    on<T>(
        eventType: TMediatorEventType<T>,
        listener: TMediatorEventListener<T>,
    ): TMediatorEventListenerDispose;

    /**
     * Subscribes a listener to a specific event type that will be called only once.
     *
     * @template T The type of payload in the event.
     * @param eventType The event type to listen for.
     * @param listener Function that will be called once when the event is published.
     * @returns A function that can be called to unsubscribe the listener (if needed before it fires).
     */
    once<T>(
        eventType: TMediatorEventType<T>,
        listener: TMediatorEventListener<T>,
    ): TMediatorEventListenerDispose;
}

/** Interface representing the Mediator builder */
export interface IMediatorBuilder {
    /**
     * Registers one or multiple request handlers in the mediator.
     *
     * @param handler A single handler or an array of handlers to register.
     * @returns The builder instance for chaining.
     */
    registerHandler(
        handler:
            | TMediatorRequestHandler<any, any>
            | readonly TMediatorRequestHandler<any, any>[],
    ): this;

    /**
     * Sets a global error handler for events.
     *
     * @param errorHandler Function that will be called when an event listener throws an error.
     * @returns The builder instance for chaining.
     */
    onEventError(errorHandler: TMediatorEventErrorHandler): this;

    /** Builds and returns the final Mediator instance */
    build(): IMediator;
}

/** Creates a new Mediator builder instance */
export function mediatorBuilder(): IMediatorBuilder;
