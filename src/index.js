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
    var handlers = new Set();

    function add(handler) {
        handlers.add(handler);
        return this;
    }

    function has(handler) {
        return handlers.has(handler);
    }

    function build() {
        return {};
    }

    return Object.freeze({ add, has, build });
}
