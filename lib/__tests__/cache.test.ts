// @ts-nocheck
// Mock the redis module before any imports to prevent ESM issues
jest.mock("@/lib/integrations/redis", () => ({
  getCached: jest.fn(),
  setCache: jest.fn(),
  getRedis: jest.fn(),
}));

import { withCache, invalidateCache } from "@/lib/cache";
import { getCached, setCache, getRedis } from "@/lib/integrations/redis";

describe("withCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns cached value when cache hit occurs", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce({ data: "cached" });

    const fetcher = jest.fn().mockResolvedValue({ data: "fresh" });
    const result = await withCache("my-key", fetcher, 300);

    expect(result).toEqual({ data: "cached" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls fetcher on cache miss and returns fresh data", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (setCache as jest.Mock).mockResolvedValueOnce(undefined);

    const fetcher = jest.fn().mockResolvedValue({ data: "fresh" });
    const result = await withCache("my-key", fetcher, 300);

    expect(result).toEqual({ data: "fresh" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("stores fresh data in cache after fetcher call", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (setCache as jest.Mock).mockResolvedValueOnce(undefined);

    const fetcher = jest.fn().mockResolvedValue({ data: "fresh" });
    await withCache("my-key", fetcher, 600);

    // setCache is fire-and-forget but still called
    expect(setCache).toHaveBeenCalledWith("my-key", { data: "fresh" }, 600);
  });

  it("falls through to fetcher when Redis is down", async () => {
    (getCached as jest.Mock).mockRejectedValueOnce(new Error("Redis connection refused"));
    (setCache as jest.Mock).mockRejectedValueOnce(new Error("Redis connection refused"));

    const fetcher = jest.fn().mockResolvedValue({ data: "fresh" });
    const result = await withCache("my-key", fetcher, 300);

    expect(result).toEqual({ data: "fresh" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not throw when setCache fails", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (setCache as jest.Mock).mockRejectedValueOnce(new Error("set failed"));

    const fetcher = jest.fn().mockResolvedValue("result");
    await expect(withCache("key", fetcher, 60)).resolves.toBe("result");
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes a single exact key", async () => {
    const mockDel = jest.fn().mockResolvedValue(1);
    (getRedis as jest.Mock).mockReturnValue({ del: mockDel, keys: jest.fn() });

    await invalidateCache("cc:briefs:all");
    expect(mockDel).toHaveBeenCalledWith("cc:briefs:all");
  });

  it("deletes multiple exact keys", async () => {
    const mockDel = jest.fn().mockResolvedValue(2);
    (getRedis as jest.Mock).mockReturnValue({ del: mockDel, keys: jest.fn() });

    await invalidateCache("cc:briefs:all", "cc:content-queue:all");
    expect(mockDel).toHaveBeenCalledWith("cc:briefs:all", "cc:content-queue:all");
  });

  it("expands wildcard keys using redis.keys", async () => {
    const mockKeys = jest.fn().mockResolvedValue(["cc:pipeline:1", "cc:pipeline:2"]);
    const mockDel = jest.fn().mockResolvedValue(2);
    (getRedis as jest.Mock).mockReturnValue({ del: mockDel, keys: mockKeys });

    await invalidateCache("cc:pipeline:*");
    expect(mockKeys).toHaveBeenCalledWith("cc:pipeline:*");
    expect(mockDel).toHaveBeenCalledWith("cc:pipeline:1", "cc:pipeline:2");
  });

  it("does not call del when no keys found after wildcard expansion", async () => {
    const mockKeys = jest.fn().mockResolvedValue([]);
    const mockDel = jest.fn();
    (getRedis as jest.Mock).mockReturnValue({ del: mockDel, keys: mockKeys });

    await invalidateCache("cc:missing:*");
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("silently ignores Redis errors", async () => {
    (getRedis as jest.Mock).mockImplementation(() => {
      throw new Error("Redis unavailable");
    });

    await expect(invalidateCache("cc:briefs:all")).resolves.toBeUndefined();
  });
});
