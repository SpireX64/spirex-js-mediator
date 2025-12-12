const $Request = Symbol();

export function mediatorRequest() {
    return function request(payload) {
        return Object.freeze({ [$Request]: request, payload });
    };
}
