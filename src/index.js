const $Kind = Symbol();
const $Type = Symbol();

function microtask(fn) {
    return Promise.resolve().then(fn);
}

export function mediatorRequest() {
    return function Request(payload) {
        return Object.freeze({ [$Kind]: "r", [$Type]: Request, payload });
    };
}

export function mediatorEvent() {
    return function Event(payload) {
        return Object.freeze({ [$Kind]: "e", [$Type]: Event, payload });
    };
}

export function mediatorHandler(type, handle) {
    return Object.freeze({ type, handle });
}

function createMediator(handlers) {
    function send(request, abortSignal) {
        var requestType = request[$Type];
        var handler = handlers.find((it) => it.type === requestType);
        if (!handler) throw new Error("Handler not found for the request.");
        return microtask(() =>
            handler.handle({
                abortSignal,
                mediator: this,
                payload: request.payload,
            }),
        );
    }

    return Object.freeze({ send });
}

export function mediatorBuilder() {
    var handlers = [];

    function add(handler) {
        if (handlers.some((it) => it.type === handler.type)) {
            throw new Error(
                "Another handler for request is already registered",
            );
        }
        handlers.push(handler);
        return this;
    }

    function has(handler) {
        return handlers.includes(handler);
    }

    function build() {
        return createMediator([...handlers]);
    }

    return Object.freeze({ add, has, build });
}
