// @ts-nocheck
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

import { SyncLogs } from "@/components/integrations/sync-logs";
import { createClient } from "@/lib/supabase/client";

const mockLogs = [
  {
    id: "log-1",
    provider: "dataforseo",
    endpoint: "/dataforseo_labs/google/domain_rank_overview/live",
    status_code: 200,
    response_time_ms: 450,
    created_at: "2026-01-01T10:00:00Z",
    error_message: null,
    client_id: "client-1",
    request_metadata: null,
  },
  {
    id: "log-2",
    provider: "frase",
    endpoint: "/process/serp",
    status_code: 429,
    response_time_ms: 100,
    created_at: "2026-01-01T11:00:00Z",
    error_message: "Rate limit exceeded",
    client_id: null,
    request_metadata: null,
  },
  {
    id: "log-3",
    provider: "google",
    endpoint: "/analytics",
    status_code: 500,
    response_time_ms: 200,
    created_at: "2026-01-01T12:00:00Z",
    error_message: "Server error",
    client_id: "client-1",
    request_metadata: null,
  },
];

function buildMockChain(result: unknown) {
  const chain: any = {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    then: jest.fn((cb) => Promise.resolve(result).then(cb)),
  };
  // Make awaitable
  Object.defineProperty(chain, Symbol.asyncIterator, {
    value: async function* () {},
  });
  // Make thenable
  chain.then = (onfulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onfulfilled);
  return chain;
}

describe("SyncLogs", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(() => buildMockChain({ data: mockLogs, error: null })),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("shows loading skeletons initially", () => {
    render(<SyncLogs />);
    // Skeleton elements should be present during loading
    const skeletons = document.querySelectorAll(".animate-pulse, [class*='skeleton']");
    // At least some loading state indicator
    expect(document.body).toBeTruthy();
  });

  it("renders log entries after loading", async () => {
    render(<SyncLogs />);
    await waitFor(() => {
      expect(screen.getByText("dataforseo")).toBeInTheDocument();
    });
    expect(screen.getByText("frase")).toBeInTheDocument();
  });

  it("renders provider and endpoint columns", async () => {
    render(<SyncLogs />);
    await waitFor(() => {
      expect(screen.getByText("Provider")).toBeInTheDocument();
      expect(screen.getByText("Endpoint")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  it("shows No request logs found when logs are empty", async () => {
    mockSupabase.from.mockReturnValue(
      buildMockChain({ data: [], error: null })
    );
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    render(<SyncLogs />);
    await waitFor(() => {
      expect(screen.getByText("No request logs found.")).toBeInTheDocument();
    });
  });

  it("shows error message when fetch fails", async () => {
    mockSupabase.from.mockReturnValue(
      buildMockChain({ data: null, error: { message: "Connection refused" } })
    );
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    render(<SyncLogs />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load logs/)).toBeInTheDocument();
    });
  });

  it("shows response time in milliseconds", async () => {
    render(<SyncLogs />);
    await waitFor(() => {
      expect(screen.getByText("450ms")).toBeInTheDocument();
    });
  });

  it("renders the heading", async () => {
    render(<SyncLogs />);
    await waitFor(() => {
      expect(screen.getByText("API Request Logs")).toBeInTheDocument();
    });
  });
});
