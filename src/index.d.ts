export type TMediatorRequest<Result, Payload = undefined> = Readonly<{
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
