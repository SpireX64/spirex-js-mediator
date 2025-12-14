// =========================
// REQUESTS
// =========================

export type TMediatorRequest<Result, Payload = undefined> = Readonly<{
    [Symbol.species]?: Result;
    payload: Payload;
}>;

export type TMediatorRequestType<
    Result,
    Payload = undefined,
> = Payload extends undefined
    ? () => TMediatorRequest<Result>
    : (payload: Payload) => TMediatorRequest<Result, Payload>;

export declare function defineRequest<
    Result,
    Payload = undefined,
>(): TMediatorRequestType<Result, Payload>;

export type IMediatorRequestContext<Payload> = Readonly<{
    payload: Payload;
    mediator: IMediator;
    abortSignal?: AbortSignal;
}>;

export type TMediatorRequestHandlerDelegate<Result, Payload> = (
    context: IMediatorRequestContext<Payload>,
) => Result | Promise<Result>;

export type TMediatorRequestHandler<Result, Payload> = Readonly<{
    type: TMediatorRequestType<Result, Payload>;
    handle: TMediatorRequestHandlerDelegate<Result, Payload>;
}>;

export declare function createHandler<Result, Payload>(
    requestType: TMediatorRequestType<Result, Payload>,
    delegate: TMediatorRequestHandlerDelegate<Result, Payload>,
): TMediatorRequestHandler<Result, Payload>;

// ==============================
// EVENTS
// ==============================

export type TMediatorEvent<Payload = undefined> = Readonly<{
    payload: Payload;
}>;

export type TMediatorEventType<Payload = undefined> = Payload extends undefined
    ? () => TMediatorEvent
    : (payload: Payload) => TMediatorEvent<Payload>;

export declare function defineEvent<
    Payload = undefined,
>(): TMediatorEventType<Payload>;

export type TMediatorEventContext<Payload> = Readonly<{
    type: TMediatorEventType<Payload>;
    payload: Payload;
    mediator: IMediator;
}>;

export type TMediatorEventListener<Payload> = (
    context: TMediatorEventContext<Payload>,
) => void | Promise<void>;

export type TMediatorEventListenerDispose = () => void;

export type TMediatorEventErrorHandler = (
    error: unknown,
    context: TMediatorEventContext<unknown>,
) => void | Promise<void>;

// ==============================
// MEDIATOR
// ==============================

export interface IMediator {
    send<T>(
        request: TMediatorRequest<T, any>,
        abortSignal?: AbortSignal,
    ): Promise<T>;

    publish<T>(event: TMediatorEvent<T>): void;
    on<T>(
        eventType: TMediatorEventType<T>,
        listener: TMediatorEventListener<T>,
    ): TMediatorEventListenerDispose;
    once<T>(
        eventType: TMediatorEventType<T>,
        listener: TMediatorEventListener<T>,
    ): TMediatorEventListenerDispose;
}

export interface IMediatorBuilder {
    registerHandler(
        handler:
            | TMediatorRequestHandler<any, any>
            | readonly TMediatorRequestHandler<any, any>[],
    ): this;
    onEventError(errorHandler: TMediatorEventErrorHandler): this;
    build(): IMediator;
}

export function mediatorBuilder(): IMediatorBuilder;
