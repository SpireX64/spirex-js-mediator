import { describe, test, expect, vi } from "vitest";
import { mediatorRequest, mediatorHandler, mediatorBuilder } from "./index";

describe("@spirex/mediator", () => {
    describe("Request", () => {
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

        test("WHEN: Build mediator", () => {
            // Arrange -----
            var builder = mediatorBuilder();

            // Act ---------
            var mediator = builder.build();

            // Assert ------
            expect(mediator).toBeInstanceOf(Object);
        });
    });
});
