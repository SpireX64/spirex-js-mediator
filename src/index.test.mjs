import { describe, test, expect, vi } from "vitest";
import {
    defineRequest,
    createHandler,
    defineEvent,
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

describe("@spirex/mediator", () => {
    describe("Request definition", () => {
        test("WHEN: Define request type", () => {
            // Act ---------
            var reqType = defineRequest();

            // Assert ------
            expect(reqType).toBeDefined();
            expect(reqType).toBeInstanceOf(Function);
        });

        test("WHEN: Create request", () => {
            // Arrange -----
            var reqType = defineRequest();

            // Act ---------
            var req = reqType();

            // Assert ------
            expect(req).toBeDefined();
            expect(req).toBeInstanceOf(Object);
            expect(req).is.frozen;
            expect(req.payload).is.undefined;
        });

        test("WHEN: Create request with object payload", () => {
            // Arrange -----
            var reqType = defineRequest();
            var payload = { value: 42 };

            // Act ---------
            var req = reqType(payload);

            // Assert ------
            expect(req).toBeDefined();
            expect(req).toBeInstanceOf(Object);
            expect(req).is.frozen;
            expect(req.payload).toBe(payload);
        });

        test("WHEN: Create request with primitive payload", () => {
            // Arrange -----
            var reqType = defineRequest();
            var payload = 42;

            // Act --------
            var req = reqType(payload);

            // Assert ----
            expect(req).toBeDefined(req);
            expect(req).toBeInstanceOf(Object);
            expect(req).is.frozen;
            expect(payload).toBe(payload);
        });
    });

    describe("Request Handler", () => {
        test("WHEN: Define request handler", () => {
            // Arrange -------
            var reqType = defineRequest();
            var delegate = vi.fn();

            // Act -----------
            var handler = createHandler(reqType, delegate);

            // Assert --------
            expect(handler).toBeInstanceOf(Object);
            expect(handler).is.frozen;
            expect(handler.type).toBe(reqType);
            expect(handler.handle).toBe(delegate);
            expect(delegate).not.toHaveBeenCalled();
        });
    });

    describe("Event definition", () => {
        test("WHEN: Define event type", () => {
            // Act ---------
            var eventType = defineEvent();

            // Assert ------
            expect(eventType).toBeInstanceOf(Function);
        });

        test("WHEN: Create event instance", () => {
            // Arrange ------
            var eventType = defineEvent();

            // Act ----------
            var ev = eventType();

            // Assert ------
            expect(ev).toBeInstanceOf(Object);
            expect(ev).is.frozen;
            expect(ev.payload).is.undefined;
        });

        test("WHEN: Create event instance with payload", () => {
            // Arrange ------
            var payload = 42;
            var eventType = defineEvent();

            // Act ----------
            var ev = eventType(payload);

            // Assert -------
            expect(ev).toBeInstanceOf(Object);
            expect(ev).is.frozen;
            expect(ev.payload).toBe(payload);
        });
    });

    describe("Mediator Builder", () => {
        test("WHEN: Create builder instance", () => {
            // Act ---------
            var builder = mediatorBuilder();

            // Assert ------
            expect(builder).toBeInstanceOf(Object);
            expect(builder).is.frozen;
        });

        test("WHEN: Add request handler", () => {
            // Arrange ---------
            var delegate = vi.fn();
            var reqType = defineRequest();
            var handler = createHandler(reqType, delegate);
            var builder = mediatorBuilder();

            // Act -------------
            var builderRef = builder.registerHandler(handler);

            // Assert ----------
            expect(builderRef).toBe(builderRef);
            expect(delegate).not.toHaveBeenCalled();
        });

        test("WHEN: Add many handlers as list", () => {
            var reqTypeA = defineRequest();
            var handlerA = createHandler(reqTypeA, vi.fn());
            var reqTypeB = defineRequest();
            var handlerB = createHandler(reqTypeB, vi.fn());

            var builder = mediatorBuilder();

            // Act -------------
            var builderRef = builder.registerHandler([
                handlerA,
                handlerB,
            ]);

            // Assert ----------
            expect(builderRef).toBe(builderRef);
            expect(handlerA.handle).not.toHaveBeenCalled();
            expect(handlerB.handle).not.toHaveBeenCalled();
        })

        test("WHEN: Build mediator", () => {
            // Arrange -----
            var builder = mediatorBuilder();

            // Act ---------
            var mediator = builder.build();

            // Assert ------
            expect(mediator).toBeInstanceOf(Object);
        });
    });

    describe("Mediator", () => {
        describe("Requests", () => {
            test("WHEN: send request", async () => {
                // Arrange ------
                var createTask = defineRequest();

                var payload = "foo";
                var delegate = vi.fn(({ payload }) => ({ value: payload }));
                var createTaskHandler = createHandler(createTask, delegate);

                var mediator = mediatorBuilder().registerHandler(createTaskHandler).build();

                var req = createTask(payload);

                // Act ----------
                var result = await mediator.send(req);

                // Assert -------
                expect(delegate).toHaveBeenCalledWith(
                    expect.objectContaining({ payload, mediator }),
                );
                expect(result.value).toBe(payload);
            });

            test("WHEN: send unsupported request", async () => {
                // Arrange -----
                var reqType = defineRequest();
                var mediator = mediatorBuilder().build();

                // Act ---------
                var err = await catchErrorAsync(() => mediator.send(reqType()));

                // Assert ------
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toEqual(
                    "Handler not found for the request.",
                );
            });

            test("WHEN: send non-request value", async () => {
                // Arrange -------
                var mediator = mediatorBuilder().build();

                // Act -----------
                var err = await catchErrorAsync(() =>
                    mediator.send({ foo: 42 }),
                );

                // Assert --------
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toBe(
                    "Invalid request object. Requests must be created using mediator request type.",
                );
            });

            test("WHEN: send request, but Mediator has many handlers", async () => {
                // Arrange --------
                var reqTypeA = defineRequest();
                var reqADelegate = vi.fn(({ payload }) => payload);
                var reqHandlerA = createHandler(reqTypeA, reqADelegate);

                var reqTypeB = defineRequest();
                var reqBDelegate = vi.fn(({ payload }) => payload);
                var reqHandlerB = createHandler(reqTypeB, reqBDelegate);

                var payload = 42;

                var mediator = mediatorBuilder()
                    .registerHandler(reqHandlerA)
                    .registerHandler(reqHandlerB)
                    .build();

                // Act ------------
                var result = await mediator.send(reqTypeB(payload));

                // Assert ---------
                expect(reqADelegate).not.toHaveBeenCalled();
                expect(reqBDelegate).toHaveBeenCalledWith(
                    expect.objectContaining({ payload, mediator }),
                );
                expect(result).toBe(payload);
            });

            test("WHEN: send request from handler", async () => {
                // Arrange -------
                var expectedResult = 42;

                var requestA = defineRequest();
                var delegateA = vi.fn(() => expectedResult);
                var handlerA = createHandler(requestA, delegateA);

                var requestB = defineRequest();
                var delegateB = vi.fn(({ mediator }) =>
                    mediator.send(requestA()),
                );
                var handlerB = createHandler(requestB, delegateB);

                var mediator = mediatorBuilder()
                    .registerHandler(handlerA)
                    .registerHandler(handlerB)
                    .build();

                // Act -----------
                var result = await mediator.send(requestB());

                // Assert --------
                expect(result).toBe(expectedResult);
                expect(delegateA).toHaveBeenCalled();
                expect(delegateB).toHaveBeenCalled();
            });

            test("WHEN: Abort request by signal", async () => {
                // Arrange ----------
                var abortedResult = "aborted";

                var purchaseRequest = defineRequest();
                var purchaseRequestHandler = createHandler(
                    purchaseRequest,
                    ({ abortSignal }) =>
                        abortSignal.aborted ? abortedResult : "purchased",
                );

                var mediator = mediatorBuilder()
                    .registerHandler(purchaseRequestHandler)
                    .build();

                var abortCtrl = new AbortController();

                // Act ---------
                var promise = mediator.send(
                    purchaseRequest(),
                    abortCtrl.signal,
                );

                abortCtrl.abort();

                var result = await promise;

                // Assert ------
                expect(result).toBe(abortedResult);
            });
        });

        describe("Events", () => {
            test("WHEN: Add event listener", () => {
                // Arrange ------
                var eventType = defineEvent();
                var mediator = mediatorBuilder().build();
                var listener = vi.fn();

                // Act ----------
                var dispose = mediator.on(eventType, listener);

                // Assert -------
                expect(listener).not.toHaveBeenCalled();
                expect(dispose).toBeInstanceOf(Function);
            });

            test("WHEN: Publish event", async () => {
                // Arrange ------
                var eventType = defineEvent();
                var payload = 42;
                var mediator = mediatorBuilder().build();

                var listener = vi.fn();
                mediator.on(eventType, listener);

                // Act ----------
                mediator.publish(eventType(42));

                // Wait for microtask completion
                await Promise.resolve();

                // Assert -------
                expect(listener).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        payload,
                        mediator,
                    }),
                );
            });

            test("WHEN: Publish event without listeners", () => {
                // Arrange --------
                var eventType = defineEvent();
                var anotherEventType = defineEvent();
                var mediator = mediatorBuilder().build();

                var listener = vi.fn();
                mediator.on(anotherEventType, listener);

                // Act ------------
                var error = catchError(() => {
                    mediator.publish(eventType());
                });

                // Assert ---------
                expect(error).is.undefined;
                expect(listener).not.toHaveBeenCalled();
            });

            test("WHEN: Publish with many listeners", async () => {
                // Arrange --------
                var eventType = defineEvent();
                var payload = "foo";

                var mediator = mediatorBuilder().build();

                var listenerA = vi.fn();
                mediator.on(eventType, listenerA);

                var listenerB = vi.fn();
                mediator.on(eventType, listenerB);

                // Act ------------
                mediator.publish(eventType(payload));

                // Wait for microtask completion
                await Promise.resolve();

                // Assert ---------
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
                // Arrange --------
                var eventType = defineEvent();
                var payloadA = "foo";
                var payloadB = "bar";

                var mediator = mediatorBuilder().build();

                var listener = vi.fn();
                mediator.once(eventType, listener);

                // Act ------------
                mediator.publish(eventType(payloadA));
                mediator.publish(eventType(payloadB));

                // Wait for microtask completion
                await Promise.resolve();

                // Assert ---------
                expect(listener).toHaveBeenCalledExactlyOnceWith(
                    expect.objectContaining({
                        type: eventType,
                        payload: payloadA,
                        mediator,
                    }),
                );
            });

            test("WHEN: Dispose listener", async () => {
                // Arrange -------
                var eventType = defineEvent();
                var payload = 42;
                var mediator = mediatorBuilder().build();

                var listener = vi.fn();
                var disposeEvent = mediator.on(eventType, listener);

                var anotherListener = vi.fn();
                mediator.on(eventType, anotherListener);

                // Act -----------
                disposeEvent();
                mediator.publish(eventType(payload));

                // Wait for microtask completion
                await Promise.resolve();

                // Assert --------
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
                // Arrange -------
                var mediator = mediatorBuilder().build();

                // Act -----------
                var error = catchError(() => mediator.publish({ foo: 42 }));

                // Assert --------
                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    "Invalid event object. Events must be created using mediator event type.",
                );
            });

            test("WHEN: pass non-function value as event listener", () => {
                // Arrange --------
                var eventType = defineEvent();
                var mediator = mediatorBuilder().build();

                // Act ------------
                var error = catchError(() => mediator.on(eventType, 42));

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    "Invalid event listener. Expected a function.",
                );
            });

            test("WHEN: Listener throws error", async () => {
                // Arrange ---------
                var eventType = defineEvent();
                var mediator = mediatorBuilder().build();

                mediator.on(eventType, () => {
                    throw new Error("Test Error");
                });

                var listener = vi.fn();
                mediator.on(eventType, listener);

                // Act -------------
                var error = catchError(() => mediator.publish(eventType()));

                // Wait for microtask completion
                await Promise.resolve();

                // Assert ----------
                expect(error).is.undefined;
                expect(listener).toHaveBeenCalled();
            });

            test("WHEN: Catch listener error", async () => {
                // Arrange ---------
                var payload = 42;
                var eventType = defineEvent();
                var eventErrorHandler = vi.fn();

                var mediator = mediatorBuilder()
                    .onEventError(eventErrorHandler)
                    .build();
                var expectedError = new Error("Test Error");

                mediator.on(eventType, () => {
                    throw expectedError;
                });

                // Act -------------
                mediator.publish(eventType(payload));

                // Wait for microtask completion
                await Promise.resolve();

                // Assert ----------
                expect(eventErrorHandler).toHaveBeenCalledWith(
                    expectedError,
                    expect.objectContaining({
                        type: eventType,
                        mediator,
                        payload,
                    }),
                );
            });

            test("WHEN: Pass non-function value as error handler", () => {
                // Arrange --------
                var builder = mediatorBuilder();

                // Act ------------
                var error = catchError(() => {
                    builder.onEventError({ foo: "bar" });
                });

                // Assert ---------
                expect(error).toBeInstanceOf(TypeError);
                expect(error.message).toEqual(
                    "Invalid error handler. Expected a function.",
                );
            });
        });
    });
});
