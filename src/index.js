const $Request = Symbol();

export function mediatorRequest() {
    return function request(payload) {
        return Object.freeze({ [$Request]: request, payload });
    };
}

export function mediatorHandler(type, handle) {
    return Object.freeze({ type, handle });
}

export function mediatorBuilder() {
    function build() {
        return {};
    }
    return Object.freeze({ build });
}
