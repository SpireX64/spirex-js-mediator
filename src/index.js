/// <reference path="./index.d.ts" />

var $Kind = Symbol();
var $Type = Symbol();

var kRequest = "request";
var kEvent = "event";

var runMicrotask = (fn) => Promise.resolve().then(fn);

var define = (k, opt) => {
    function type(payload) {
        return Object.freeze({ [$Kind]: k, [$Type]: type, payload });
    }
    if (opt) {
        for (var key in opt) {
            if (key !== "name") type[key] = opt[key];
        }
    }
    Object.defineProperty(type, "name", {
        value: opt?.name || k + "Unnamed",
        configurable: true,
    });
    return type;
};

export var defineRequest = (opt) => define(kRequest, opt);
export var defineEvent = (opt) => define(kEvent, opt);
export var createHandler = (type, handle) => Object.freeze({ type, handle });

export function createMediator() {
    var handlersMap = new Map();
    var eventStateMap = new Map();
    var eventListenersMap = new Map();
    var onEventError;

    function registerHandler(handlerOrHandlers) {
        (Array.isArray(handlerOrHandlers)
            ? handlerOrHandlers
            : [handlerOrHandlers]
        ).forEach((handler) => {
            if (handlersMap.has(handler.type))
                throw new Error(
                    `Handler for the request "${handler.type.name}" already registered.`,
                );
            handlersMap.set(handler.type, handler);
        });
    }

    function setEventHandler(fn) {
        if (typeof fn != "function")
            throw new TypeError("Invalid error handler. Expected a function.");
        onEventError = fn;
    }

    function send(request, abortSignal) {
        if (typeof request != "object" || request[$Kind] != kRequest)
            throw new TypeError(
                "Invalid request object. Requests must be created using mediator request type.",
            );
        var handler = handlersMap.get(request[$Type]);
        if (!handler)
            throw new Error(
                `Handler not found for the request "${request[$Type].name}".`,
            );
        var mediator = this;
        return runMicrotask(() =>
            handler.handle({
                abortSignal,
                mediator,
                payload: request.payload,
            }),
        );
    }

    function publish(event) {
        if (typeof event != "object" || event[$Kind] != kEvent)
            throw new TypeError(
                "Invalid event object. Events must be created using mediator event type.",
            );
        var type = event[$Type];
        if (type.stateful) eventStateMap.set(type, event.payload);

        var listeners = eventListenersMap.get(type);
        if (!listeners || listeners.size == 0) return;

        var mediator = this;
        var context = Object.freeze({
            type,
            payload: event.payload,
            mediator,
        });

        function forward(payload) {
            if (typeof payload === "object") {
                switch (payload[$Kind]) {
                    case kRequest:
                        return mediator.send(payload);
                    case kEvent:
                        return mediator.publish(payload);
                }
            }
            return payload;
        }

        listeners.forEach((listener) => {
            runMicrotask(() => {
                try {
                    var next = listener(context);
                    if (next instanceof Promise) {
                        next.then(forward, (e) => {
                            onEventError && onEventError(e, context);
                        });
                    } else {
                        forward(next);
                    }
                } catch (e) {
                    onEventError && onEventError(e, context);
                }
            });
        });
    }

    function getEventListenersCount(eventType) {
        return eventListenersMap.get(eventType)?.size || 0;
    }

    function disposeEventListeners(eventType) {
        return eventListenersMap.delete(eventType);
    }

    function clearState(eventType) {
        return eventStateMap.delete(eventType);
    }

    function on(eventType, listener, ignoreState = false) {
        if (typeof listener != "function")
            throw new TypeError("Invalid event listener. Expected a function.");
        var listeners = eventListenersMap.get(eventType);
        if (!listeners)
            eventListenersMap.set(eventType, (listeners = new Set()));

        listeners.add(listener);

        if (eventType.stateful && !ignoreState) {
            var state = eventStateMap.get(eventType);
            if (state)
                listener({ type: eventType, payload: state, mediator: this });
        }

        return () => {
            var wasDisposed = listeners.delete(listener);
            if (listeners.size == 0) eventListenersMap.delete(eventType);
            return wasDisposed;
        };
    }

    function once(eventType, listener) {
        var dispose = this.on(
            eventType,
            (context) => {
                // Unsubscribe first so a throw in listener does not leave a stale subscription.
                if (!dispose()) return;
                return listener(context);
            },
            true,
        );
        return dispose;
    }

    var inst = {
        clearState,
        registerHandler,
        setEventHandler,
        getEventListenersCount,
        disposeEventListeners,
    };
    inst.on = on.bind(inst);
    inst.once = once.bind(inst);
    inst.send = send.bind(inst);
    inst.publish = publish.bind(inst);
    inst.build = () => inst;
    return Object.freeze(inst);
}

/** @deprecated (since 1.1.0) */
export var mediatorBuilder = createMediator;
