const $Type = Symbol();

function microtask(fn) {
    return Promise.resolve().then(fn);
}

export function mediatorRequest() {
    return function request(payload) {
        return Object.freeze({ [$Type]: request, payload });
    };
}

export function mediatorHandler(type, handle) {
    return Object.freeze({ type, handle });
}

function createMediator(handlers) {
    function findHandler(request) {
        var requestType = request[$Type];
        for (var handler of handlers) {
            if (handler.type == requestType) return handler;
        }
        throw new Error("Handler not found for the request.");
    }

    function send(request) {
        var handler = findHandler(request);
        return microtask(() =>
            handler.handle({
                payload: request.payload,
            }),
        );
    }

    return { send };
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
        return createMediator(handlers);
    }

    return Object.freeze({ add, has, build });
}
