const $Kind = Symbol();
const $Type = Symbol();

function runMicrotask(fn) {
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
    const eventListenersMap = new Map();

    function send(request, abortSignal) {
        if (typeof request != "object" || request[$Kind] != "r")
            throw new Error(
                "Invalid request object. Requests must be created using mediator request type.",
            );
        var requestType = request[$Type];
        var handler = handlers.find((it) => it.type === requestType);
        if (!handler) throw new Error("Handler not found for the request.");
        return runMicrotask(() =>
            handler.handle({
                abortSignal,
                mediator: this,
                payload: request.payload,
            }),
        );
    }

    function publish(event) {
        if (typeof event != "object" || event[$Kind] != "e")
            throw new Error(
                "Invalid event object. Events must be created using mediator event type.",
            );
        var type = event[$Type];
        var listeners = eventListenersMap.get(type);
        if (!listeners || listeners.size == 0) return;

        var context = Object.freeze({
            type,
            payload: event.payload,
        });

        for (var listener of listeners) {
            listener(context);
        }
    }

    function on(eventType, listener) {
        if (typeof listener != "function")
            throw new Error("Invalid event listener. Expected a function.");
        var listeners = eventListenersMap.get(eventType);
        if (!listeners)
            eventListenersMap.set(eventType, (listeners = new Set()));

        listeners.add(listener);

        return () => {
            listeners.delete(listener);
            if (listeners.size == 0) eventListenersMap.delete(eventType);
        };
    }

    function once(eventType, listener) {
        var dispose = on(eventType, (context) => {
            dispose();
            listener(context);
        });
        return dispose;
    }

    return Object.freeze({ send, publish, on, once });
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
