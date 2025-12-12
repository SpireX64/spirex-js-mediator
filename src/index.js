const $Request = Symbol();

export function mediatorRequest() {
    return function request(payload) {
        return Object.freeze({ [$Request]: request, payload });
    };
}

export function mediatorHandler(type, handle) {
    return Object.freeze({ type, handle })
}