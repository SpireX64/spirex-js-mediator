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

export declare function mediatorRequest<
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

export declare function mediatorHandler<Result, Payload>(
    requestType: TMediatorRequestType<Result, Payload>,
    delegate: TMediatorRequestHandlerDelegate<Result, Payload>,
): TMediatorRequestHandler<Result, Payload>;

// ==============================
// MEDIATOR
// ==============================

export interface IMediator {
    send<T>(
        request: TMediatorRequest<T, any>,
        abortSignal?: AbortSignal,
    ): Promise<T>;
}

export interface IMediatorBuilder {
    add(handler: TMediatorRequestHandler<any, any>): this;
    has(handler: TMediatorRequestHandler<any, any>): boolean;
    build(): IMediator;
}

export function mediatorBuilder(): IMediatorBuilder;
