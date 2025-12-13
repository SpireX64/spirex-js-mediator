/// <reference path="./index.d.ts" />

var $Kind = Symbol();
var $Type = Symbol();

var kRequest = "request";
var kEvent = "event";

var runMicrotask = (fn) => Promise.resolve().then(fn);

var define = (k) =>
    function type(payload) {
        return Object.freeze({ [$Kind]: k, [$Type]: type, payload });
    };

export var defineRequest = () => define(kRequest);
export var defineEvent = () => define(kEvent);
export var createHandler = (type, handle) => Object.freeze({ type, handle });

function createMediator(handlers, onEventError) {
    const eventListenersMap = new Map();

    function send(request, abortSignal) {
        if (typeof request != "object" || request[$Kind] != kRequest)
            throw new TypeError(
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
        if (typeof event != "object" || event[$Kind] != kEvent)
            throw new TypeError(
                "Invalid event object. Events must be created using mediator event type.",
            );
        var type = event[$Type];
        var listeners = eventListenersMap.get(type);
        if (!listeners || listeners.size == 0) return;

        var mediator = this;
        var context = Object.freeze({
            type,
            payload: event.payload,
            mediator,
        });

        listeners.forEach((listener) => {
            runMicrotask(() => {
                try {
                    listener(context);
                } catch (e) {
                    onEventError && onEventError(e, context);
                }
            });
        });
    }

    var on = (eventType, listener) => {
        if (typeof listener != "function")
            throw new TypeError("Invalid event listener. Expected a function.");
        var listeners = eventListenersMap.get(eventType);
        if (!listeners)
            eventListenersMap.set(eventType, (listeners = new Set()));

        listeners.add(listener);

        return () => {
            var wasDisposed = listeners.delete(listener);
            if (listeners.size == 0) eventListenersMap.delete(eventType);
            return wasDisposed;
        };
    };

    var once = (eventType, listener) => {
        var dispose = on(eventType, (context) => {
            // Call dispose first, otherwise it won't work
            // if the listener throws an error.
            dispose() && listener(context);
        });
        return dispose;
    };

    return Object.freeze({ send, publish, on, once });
}

export function mediatorBuilder() {
    var handlers = [];
    var eventErrorHandler = null;

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

    function onEventError(fn) {
        if (typeof fn != "function")
            throw new TypeError("Invalid error handler. Expected a function.");
        eventErrorHandler = fn;
        return this;
    }

    function build() {
        return createMediator([...handlers], eventErrorHandler);
    }

    return Object.freeze({ add, has, build, onEventError });
}
