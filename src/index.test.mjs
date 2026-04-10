import { describe, test, expect, vi } from "vitest";
import {
    defineRequest,
    createHandler,
    defineEvent,
    createMediator,
    mediatorBuilder,
} from "./index";

function catchError(fn) {
    try {
        return void fn();
    } catch (e) {
        return e;
    }
}

async function catchErrorAsync(fn) {
    try {
        return void (await fn());
    } catch (e) {
        return e;
    }
}

/** Drain a few microtask turns (nested publish / promise rejection paths). */
async function flushMicrotasks(times) {
    for (var i = 0; i < times; i++) await Promise.resolve();
}

describe("@spirex/mediator", () => {
    describe("Request definition", () => {
        test("WHEN: Define request type", () => {
            var reqType = defineRequest();

            expect(reqType).toBeDefined();
            expect(reqType).toBeInstanceOf(Function);
            expect(reqType.name).toBe("requestUnnamed");
        });

        test("WHEN: Define request with custom name", () => {
            var reqType = defineRequest({ name: "MyRequest" });

            expect(reqType.name).toBe("MyRequest");
        });

        test("WHEN: Create request", () => {
            var reqType = defineRequest();

            var req = reqType();

            expect(req).toBeDefined();
            expect(req).toBeInstanceOf(Object);
            expect(req).is.frozen;
            expect(req.payload).is.undefined;
        });

        test("WHEN: Create request with object payload", () => {
            var reqType = defineRequest();
            var payload = { value: 42 };

            var req = reqType(payload);

            expect(req).toBeDefined();
            expect(req).toBeInstanceOf(Object);
            expect(req).is.frozen;
            expect(req.payload).toBe(payload);
        });

        test("WHEN: Create request with primitive payload", () => {
            var reqType = defineRequest();
            var payload = 42;

            var req = reqType(payload);

            expect(req).toBeDefined(req);
            expect(req).toBeInstanceOf(Object);
            expect(req).is.frozen;
            expect(req.payload).toBe(payload);
        });
    });

    describe("Request Handler", () => {
        test("WHEN: Define request handler", () => {
            var reqType = defineRequest();
            var delegate = vi.fn();

            var handler = createHandler(reqType, delegate);

            expect(handler).toBeInstanceOf(Object);
            expect(handler).is.frozen;
            expect(handler.type).toBe(reqType);
            expect(handler.handle).toBe(delegate);
            expect(delegate).not.toHaveBeenCalled();
        });
    });

    describe("Event definition", () => {
        test("WHEN: Define event type", () => {
            var eventType = defineEvent();

            expect(eventType).toBeInstanceOf(Function);
            expect(eventType.name).toBe("eventUnnamed");
        });

        test("WHEN: Define replayLast event", () => {
            var eventType = defineEvent({ replayLast: true });

            expect(eventType.replayLast).toBe(true);
        });

        test("WHEN: Create event instance", () => {
            var eventType = defineEvent();

            var ev = eventType();

            expect(ev).toBeInstanceOf(Object);
            expect(ev).is.frozen;
            expect(ev.payload).is.undefined;
        });

        test("WHEN: Create event instance with payload", () => {
            var payload = 42;
            var eventType = defineEvent();

            var ev = eventType(payload);

            expect(ev).toBeInstanceOf(Object);
            expect(ev).is.frozen;
            expect(ev.payload).toBe(payload);
        });
    });

    describe("createMediator and mediatorBuilder", () => {
        test("WHEN: createMediator returns frozen instance with API", () => {
            var m = createMediator();

            expect(m).is.frozen;
            expect(typeof m.send).toBe("function");
            expect(typeof m.publish).toBe("function");
            expect(typeof m.on).toBe("function");
            expect(typeof m.once).toBe("function");
            expect(typeof m.registerHandler).toBe("function");
            expect(typeof m.setEventHandler).toBe("function");
            expect(typeof m.clearReplay).toBe("function");
            expect(typeof m.getEventListenersCount).toBe("function");
            expect(typeof m.disposeEventListeners).toBe("function");
            expect(typeof m.build).toBe("function");
        });

        test("WHEN: mediatorBuilder is alias of createMediator", () => {
            expect(mediatorBuilder).toBe(createMediator);
        });

        test("WHEN: build returns same instance", () => {
            var m = createMediator();

            expect(m.build()).toBe(m);
        });
    });

    describe("Mediator", () => {
        describe("Requests", () => {
            test("WHEN: send request", async () => {
                var createTask = defineRequest();

                var payload = "foo";
                var delegate = vi.fn(({ payload }) => ({ value: payload }));
                var createTaskHandler = createHandler(createTask, delegate);

                var mediator = createMediator();
                mediator.registerHandler(createTaskHandler);

                var req = createTask(payload);

                var result = await mediator.send(req);

                expect(delegate).toHaveBeenCalledWith(
                    expect.objectContaining({ payload, mediator }),
                );
                expect(result.value).toBe(payload);
            });

            test("WHEN: send unsupported request", async () => {
                var reqType = defineRequest();
                var mediator = createMediator();

                var err = await catchErrorAsync(() => mediator.send(reqType()));

                expect(err).toBeInstanceOf(Error);
                expect(err.message).toEqual(
                    'Handler not found for the request "requestUnnamed".',
                );
            });

            test("WHEN: send unsupported request with custom type name", async () => {
                var reqType = defineRequest({ name: "NamedReq" });
                var mediator = createMediator();

                var err = await catchErrorAsync(() => mediator.send(reqType()));

                expect(err.message).toEqual(
                    'Handler not found for the request "NamedReq".',
                );
            });

            test("WHEN: send non-request value", async () => {
                var mediator = createMediator();

                var err = await catchErrorAsync(() =>
                    mediator.send({ foo: 42 }),
                );

                expect(err).toBeInstanceOf(Error);
                expect(err.message).toBe(
                    "Invalid request object. Requests must be created using mediator request type.",
                );
            });

            test("WHEN: duplicate registerHandler throws", () => {
                var reqType = defineRequest();
                var h = createHandler(reqType, () => {});
                var mediator = createMediator();
                mediator.registerHandler(h);

                var err = catchError(() => mediator.registerHandler(h));

                expect(err).toBeInstanceOf(Error);
                expect(err.message).toBe(
                    'Handler for the request "requestUnnamed" already registered.',
                );
            });

            test("WHEN: duplicate in batch throws", () => {
                var reqType = defineRequest();
                var h = createHandler(reqType, () => {});
                var mediator = createMediator();

                var err = catchError(() =>
                    mediator.registerHandler([h, h]),
                );

                expect(err).toBeInstanceOf(Error);
            });

            test("WHEN: send request, but Mediator has many handlers", async () => {
                var reqTypeA = defineRequest();
                var reqADelegate = vi.fn(({ payload }) => payload);
                var reqHandlerA = createHandler(reqTypeA, reqADelegate);

                var reqTypeB = defineRequest();
                var reqBDelegate = vi.fn(({ payload }) => payload);
                var reqHandlerB = createHandler(reqTypeB, reqBDelegate);

                var payload = 42;

                var mediator = createMediator();
                mediator.registerHandler(reqHandlerA);
                mediator.registerHandler(reqHandlerB);

                var result = await mediator.send(reqTypeB(payload));

                expect(reqADelegate).not.toHaveBeenCalled();
                expect(reqBDelegate).toHaveBeenCalledWith(
                    expect.objectContaining({ payload, mediator }),
                );
                expect(result).toBe(payload);
            });

            test("WHEN: send request from handler", async () => {
                var expectedResult = 42;

                var requestA = defineRequest();
                var delegateA = vi.fn(() => expectedResult);
                var handlerA = createHandler(requestA, delegateA);

                var requestB = defineRequest();
                var delegateB = vi.fn(({ mediator }) =>
                    mediator.send(requestA()),
                );
                var handlerB = createHandler(requestB, delegateB);

                var mediator = createMediator();
                mediator.registerHandler(handlerA);
                mediator.registerHandler(handlerB);

                var result = await mediator.send(requestB());

                expect(result).toBe(expectedResult);
                expect(delegateA).toHaveBeenCalled();
                expect(delegateB).toHaveBeenCalled();
            });

            test("WHEN: Abort request by signal", async () => {
                var abortedResult = "aborted";

                var purchaseRequest = defineRequest();
                var purchaseRequestHandler = createHandler(
                    purchaseRequest,
                    ({ abortSignal }) =>
                        abortSignal.aborted ? abortedResult : "purchased",
                );

                var mediator = createMediator();
                mediator.registerHandler(purchaseRequestHandler);

                var abortCtrl = new AbortController();

                var promise = mediator.send(
                    purchaseRequest(),
                    abortCtrl.signal,
                );

                abortCtrl.abort();

                var result = await promise;

                expect(result).toBe(abortedResult);
            });
        });

        describe("Events", () => {
            test("WHEN: Add event listener", () => {
                var eventType = defineEvent();
                var mediator = createMediator();
                var listener = vi.fn();

                var dispose = mediator.on(eventType, listener);

                expect(listener).not.toHaveBeenCalled();
                expect(dispose).toBeInstanceOf(Function);
            });

            test("WHEN: Publish event", async () => {
                var eventType = defineEvent();
                var payload = 42;
                var mediator = createMediator();

                var listener = vi.fn();
                mediator.on(eventType, listener);

                mediator.publish(eventType(42));

                await Promise.resolve();

                expect(listener).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        payload,
                        mediator,
                    }),
                );
            });

            test("WHEN: Publish event without listeners", () => {
                var eventType = defineEvent();
                var anotherEventType = defineEvent();
                var mediator = createMediator();

                var listener = vi.fn();
                mediator.on(anotherEventType, listener);

                var error = catchError(() => {
                    mediator.publish(eventType());
                });

                expect(error).is.undefined;
                expect(listener).not.toHaveBeenCalled();
            });

            test("WHEN: Publish with many listeners", async () => {
                var eventType = defineEvent();
                var payload = "foo";

                var mediator = createMediator();

                var listenerA = vi.fn();
                mediator.on(eventType, listenerA);

                var listenerB = vi.fn();
                mediator.on(eventType, listenerB);

                mediator.publish(eventType(payload));

                await Promise.resolve();

                expect(listenerA).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        payload,
                        mediator,
                    }),
                );
                expect(listenerB).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        payload,
                        mediator,
                    }),
                );
            });

            test("WHEN: Subscribe for one event", async () => {
                var eventType = defineEvent();
                var payloadA = "foo";
                var payloadB = "bar";

                var mediator = createMediator();

                var listener = vi.fn();
                mediator.once(eventType, listener);

                mediator.publish(eventType(payloadA));
                mediator.publish(eventType(payloadB));

                await Promise.resolve();

                expect(listener).toHaveBeenCalledExactlyOnceWith(
                    expect.objectContaining({
                        type: eventType,
                        payload: payloadA,
                        mediator,
                    }),
                );
            });

            test("WHEN: once ignores replayLast replay", () => {
                var eventType = defineEvent({ replayLast: true });
                var mediator = createMediator();

                mediator.publish(eventType("first"));

                var listener = vi.fn();
                mediator.once(eventType, listener);

                expect(listener).not.toHaveBeenCalled();
            });

            test("WHEN: replayLast replay on on()", () => {
                var eventType = defineEvent({ replayLast: true });
                var mediator = createMediator();

                mediator.publish(eventType("state"));

                var listener = vi.fn();
                mediator.on(eventType, listener);

                expect(listener).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        payload: "state",
                        mediator,
                    }),
                );
            });

            test("WHEN: clearReplay removes stored payload", () => {
                var eventType = defineEvent({ replayLast: true });
                var mediator = createMediator();

                mediator.publish(eventType("x"));
                expect(mediator.clearReplay(eventType)).toBe(true);

                var listener = vi.fn();
                mediator.on(eventType, listener);

                expect(listener).not.toHaveBeenCalled();
            });

            test("WHEN: getEventListenersCount and disposeEventListeners", () => {
                var eventType = defineEvent();
                var mediator = createMediator();

                expect(mediator.getEventListenersCount(eventType)).toBe(0);

                var l1 = vi.fn();
                var l2 = vi.fn();
                mediator.on(eventType, l1);
                mediator.on(eventType, l2);

                expect(mediator.getEventListenersCount(eventType)).toBe(2);

                expect(mediator.disposeEventListeners(eventType)).toBe(true);
                expect(mediator.getEventListenersCount(eventType)).toBe(0);

                expect(mediator.disposeEventListeners(eventType)).toBe(false);
            });

            test("WHEN: listener returns plain object does not forward", async () => {
                var eventType = defineEvent();
                var mediator = createMediator();

                mediator.on(eventType, () => ({}));

                var error = catchError(() => mediator.publish(eventType()));

                await flushMicrotasks(2);

                expect(error).is.undefined;
            });

            test("WHEN: forward request instance synchronously from listener", async () => {
                var Ev = defineEvent();
                var Req = defineRequest();
                var delegate = vi.fn(() => "sync-req");
                var mediator = createMediator();
                mediator.registerHandler(createHandler(Req, delegate));

                mediator.on(Ev, () => Req());

                mediator.publish(Ev());

                await flushMicrotasks(3);

                expect(delegate).toHaveBeenCalled();
            });

            test("WHEN: forward event from listener", async () => {
                var A = defineEvent();
                var B = defineEvent();
                var mediator = createMediator();

                var bListener = vi.fn();
                mediator.on(B, bListener);

                mediator.on(A, () => B("fwd"));

                mediator.publish(A());

                await flushMicrotasks(3);

                expect(bListener).toHaveBeenCalledWith(
                    expect.objectContaining({ payload: "fwd", mediator }),
                );
            });

            test("WHEN: forward request from listener", async () => {
                var Ev = defineEvent();
                var Req = defineRequest();
                var delegate = vi.fn(() => "done");

                var mediator = createMediator();
                mediator.registerHandler(createHandler(Req, delegate));

                mediator.on(Ev, ({ mediator: m }) => m.send(Req()));

                mediator.publish(Ev());

                await Promise.resolve();
                await Promise.resolve();

                expect(delegate).toHaveBeenCalled();
            });

            test("WHEN: once forwards return value like on", async () => {
                var A = defineEvent();
                var B = defineEvent();
                var mediator = createMediator();

                var bListener = vi.fn();
                mediator.on(B, bListener);

                mediator.once(A, () => B("via-once"));

                mediator.publish(A());

                await flushMicrotasks(3);

                expect(bListener).toHaveBeenCalledWith(
                    expect.objectContaining({
                        payload: "via-once",
                        mediator,
                    }),
                );
            });

            test("WHEN: Listener throws error", async () => {
                var eventType = defineEvent();
                var mediator = createMediator();

                mediator.on(eventType, () => {
                    throw new Error("Test Error");
                });

                var listener = vi.fn();
                mediator.on(eventType, listener);

                var error = catchError(() => mediator.publish(eventType()));

                await Promise.resolve();

                expect(error).is.undefined;
                expect(listener).toHaveBeenCalled();
            });

            test("WHEN: Catch listener error via setEventHandler", async () => {
                var payload = 42;
                var eventType = defineEvent();
                var eventErrorHandler = vi.fn();

                var mediator = createMediator();
                mediator.setEventHandler(eventErrorHandler);
                var expectedError = new Error("Test Error");

                mediator.on(eventType, () => {
                    throw expectedError;
                });

                mediator.publish(eventType(payload));

                await Promise.resolve();

                expect(eventErrorHandler).toHaveBeenCalledWith(
                    expectedError,
                    expect.objectContaining({
                        type: eventType,
                        mediator,
                        payload,
                    }),
                );
            });

            test("WHEN: Catch async listener rejection via setEventHandler", async () => {
                var eventType = defineEvent();
                var eventErrorHandler = vi.fn();
                var mediator = createMediator();
                mediator.setEventHandler(eventErrorHandler);

                var err = new Error("async fail");
                mediator.on(eventType, () => Promise.reject(err));

                mediator.publish(eventType());

                await flushMicrotasks(4);

                expect(eventErrorHandler).toHaveBeenCalledWith(
                    err,
                    expect.objectContaining({ type: eventType, mediator }),
                );
            });

            test("WHEN: Pass non-function value as error handler", () => {
                var mediator = createMediator();

                var error = catchError(() => {
                    mediator.setEventHandler({ foo: "bar" });
                });

                expect(error).toBeInstanceOf(TypeError);
                expect(error.message).toEqual(
                    "Invalid error handler. Expected a function.",
                );
            });

            test("WHEN: Dispose listener", async () => {
                var eventType = defineEvent();
                var payload = 42;
                var mediator = createMediator();

                var listener = vi.fn();
                var disposeEvent = mediator.on(eventType, listener);

                var anotherListener = vi.fn();
                mediator.on(eventType, anotherListener);

                expect(disposeEvent()).toBe(true);

                mediator.publish(eventType(payload));

                await Promise.resolve();

                expect(listener).not.toHaveBeenCalled();
                expect(anotherListener).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        payload,
                        mediator,
                    }),
                );
            });

            test("WHEN: pass invalid event object", () => {
                var mediator = createMediator();

                var error = catchError(() => mediator.publish({ foo: 42 }));

                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    "Invalid event object. Events must be created using mediator event type.",
                );
            });

            test("WHEN: pass non-function value as event listener", () => {
                var eventType = defineEvent();
                var mediator = createMediator();

                var error = catchError(() => mediator.on(eventType, 42));

                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    "Invalid event listener. Expected a function.",
                );
            });
        });
    });
});
