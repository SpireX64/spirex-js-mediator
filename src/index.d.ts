export type TMediatorRequest<Result, Payload = undefined> = Readonly<{
    [Symbol.species]?: Result
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
}>

export type TMediatorRequestHandlerDelegate<Result, Payload> =
    (context: IMediatorRequestContext<Payload>) => Result | Promise<Result>

export type TMediatorRequestHandler<Result, Payload> = Readonly<{
    type: TMediatorRequestType<Result, Payload>;
    handle: TMediatorRequestHandlerDelegate<Result, Payload>;
}>

export declare function mediatorHandler<Result, Payload>(
    requestType: TMediatorRequestType<Result, Payload>,
    delegate: TMediatorRequestHandlerDelegate<Result, Payload>,
): TMediatorRequestHandler<Result, Payload>;
