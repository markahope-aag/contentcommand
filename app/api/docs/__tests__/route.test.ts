/**
 * @jest-environment node
 */
import { GET } from "../route";

// Mock fs
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

// Mock path
jest.mock("path", () => ({
  join: jest.fn(),
}));

describe("GET /api/docs", () => {
  const mockReadFileSync = require("fs").readFileSync as jest.Mock;
  const mockJoin = require("path").join as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoin.mockReturnValue("/mock/path/to/openapi.yaml");
  });

  it("should return OpenAPI specification", async () => {
    const mockOpenApiSpec = `
openapi: 3.0.3
info:
  title: Content Command API
  version: 1.0.0
paths: {}
`;
    mockReadFileSync.mockReturnValue(mockOpenApiSpec);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/yaml");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    
    const text = await response.text();
    expect(text).toBe(mockOpenApiSpec);
    
    expect(mockJoin).toHaveBeenCalledWith(process.cwd(), "docs/api/openapi.yaml");
    expect(mockReadFileSync).toHaveBeenCalledWith("/mock/path/to/openapi.yaml", "utf-8");
  });

  it("should return 404 when OpenAPI file not found", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const response = await GET();

    expect(response.status).toBe(404);
    
    const json = await response.json();
    expect(json).toEqual({
      error: "OpenAPI specification not found",
    });
  });

  it("should handle file read errors gracefully", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const response = await GET();

    expect(response.status).toBe(404);
    
    const json = await response.json();
    expect(json).toEqual({
      error: "OpenAPI specification not found",
    });
  });
});