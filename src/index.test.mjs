import { describe, test, expect, vi } from "vitest";
import { mediatorRequest, mediatorHandler, mediatorBuilder } from "./index";

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
            var reqType = mediatorRequest();

            // Assert ------
            expect(reqType).toBeDefined();
            expect(reqType).toBeInstanceOf(Function);
        });

        test("WHEN: Create request", () => {
            // Arrange -----
            var reqType = mediatorRequest();

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
            var reqType = mediatorRequest();
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
            var reqType = mediatorRequest();
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
            var reqType = mediatorRequest();
            var delegate = vi.fn();

            // Act -----------
            var handler = mediatorHandler(reqType, delegate);

            // Assert --------
            expect(handler).toBeInstanceOf(Object);
            expect(handler).is.frozen;
            expect(handler.type).toBe(reqType);
            expect(handler.handle).toBe(delegate);
            expect(delegate).not.toHaveBeenCalled();
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

        test("WHEN: Check handler was not added", () => {
            // Arrange ------------
            var reqType = mediatorRequest();
            var handler = mediatorHandler(reqType);
            var builder = mediatorBuilder();

            // Act & Assert -----
            expect(builder.has(handler)).is.false;
        });

        test("WHEN: Add request handler", () => {
            // Arrange ---------
            var delegate = vi.fn();
            var reqType = mediatorRequest();
            var handler = mediatorHandler(reqType, delegate);
            var builder = mediatorBuilder();

            // Act -------------
            var builderRef = builder.add(handler);

            // Assert ----------
            expect(builderRef).toBe(builderRef);
            expect(builder.has(handler)).is.true;
            expect(delegate).not.toHaveBeenCalled();
        });

        test("WHEN: Add another handler for same request", () => {
            // Arrange -----
            var reqType = mediatorRequest();
            var delegateA = vi.fn();
            var handlerA = mediatorHandler(reqType, delegateA);
            var delegateB = vi.fn();
            var handlerB = mediatorHandler(reqType, delegateB);

            var builder = mediatorBuilder().add(handlerA);

            // Act ---------
            var error = catchError(() => {
                builder.add(handlerB);
            });

            // Assert ------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe(
                "Another handler for request is already registered",
            );
            expect(builder.has(handlerA)).is.true;
            expect(builder.has(handlerB)).is.false;
        });

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
                var createTask = mediatorRequest();

                var payload = "foo";
                var delegate = vi.fn(({ payload }) => ({ value: payload }));
                var createTaskHandler = mediatorHandler(createTask, delegate);

                var mediator = mediatorBuilder().add(createTaskHandler).build();

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
                var reqType = mediatorRequest();
                var mediator = mediatorBuilder().build();

                // Act ---------
                var err = await catchErrorAsync(() => mediator.send(reqType));

                // Assert ------
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toBe("Handler not found for the request.");
            });

            test("WHEN: send request, but Mediator has many handlers", async () => {
                // Arrange --------
                var reqTypeA = mediatorRequest();
                var reqADelegate = vi.fn(({ payload }) => payload);
                var reqHandlerA = mediatorHandler(reqTypeA, reqADelegate);

                var reqTypeB = mediatorRequest();
                var reqBDelegate = vi.fn(({ payload }) => payload);
                var reqHandlerB = mediatorHandler(reqTypeB, reqBDelegate);

                var payload = 42;

                var mediator = mediatorBuilder()
                    .add(reqHandlerA)
                    .add(reqHandlerB)
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
        });
    });
});
