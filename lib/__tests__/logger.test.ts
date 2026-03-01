// @ts-nocheck
import { logger } from "@/lib/logger";

describe("logger", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("logger.error", () => {
    it("logs to console.error with level=error", () => {
      logger.error("something failed");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.level).toBe("error");
      expect(output.message).toBe("something failed");
    });

    it("includes timestamp in output", () => {
      logger.error("test");
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.timestamp).toBeDefined();
      expect(new Date(output.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("includes context fields in output", () => {
      logger.error("test", { userId: "123", action: "login" });
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.userId).toBe("123");
      expect(output.action).toBe("login");
    });

    it("extracts errorMessage and errorStack from Error objects in context", () => {
      const err = new Error("db connection failed");
      logger.error("database error", { error: err, requestId: "abc" });
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.errorMessage).toBe("db connection failed");
      expect(output.errorStack).toContain("db connection failed");
      expect(output.requestId).toBe("abc");
    });

    it("does not include error key itself when Error is provided", () => {
      const err = new Error("test");
      logger.error("test", { error: err });
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.error).toBeUndefined();
    });

    it("handles context with non-Error error value", () => {
      logger.error("test", { error: "plain string error" });
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.error).toBe("plain string error");
    });
  });

  describe("logger.warn", () => {
    it("logs to console.warn with level=warn", () => {
      logger.warn("rate limit approaching");
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(output.level).toBe("warn");
      expect(output.message).toBe("rate limit approaching");
    });

    it("includes context when provided", () => {
      logger.warn("limit warning", { remaining: 10 });
      const output = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(output.remaining).toBe(10);
    });

    it("works without context", () => {
      logger.warn("simple warning");
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("logger.info", () => {
    it("logs to console.log with level=info", () => {
      logger.info("request completed");
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe("info");
      expect(output.message).toBe("request completed");
    });

    it("includes context fields", () => {
      logger.info("user authenticated", { userId: "u-1", provider: "google" });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.userId).toBe("u-1");
      expect(output.provider).toBe("google");
    });

    it("outputs valid JSON", () => {
      logger.info("test message", { nested: { key: "value" } });
      expect(() => JSON.parse(consoleLogSpy.mock.calls[0][0])).not.toThrow();
    });
  });
});
