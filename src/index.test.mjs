import { describe, test, expect } from "vitest";
import { mediatorRequest } from "./index";

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
        })
    });
});
