// @ts-nocheck
/**
 * Tests for the AI Citations page
 * app/dashboard/competitive-intelligence/citations/page.tsx
 */

import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/supabase/queries", () => ({
  getClients: jest.fn(),
  getAiCitations: jest.fn(),
}));

jest.mock("@/components/competitive/citation-tracker", () => ({
  CitationTracker: ({ citations }: any) => (
    <div data-testid="citation-tracker" data-count={citations.length}>CitationTracker</div>
  ),
}));

jest.mock("@/components/competitive/citation-trend-chart", () => ({
  CitationTrendChart: ({ citations }: any) => (
    <div data-testid="citation-trend-chart" data-count={citations.length}>CitationTrendChart</div>
  ),
}));

jest.mock("@/app/dashboard/competitive-intelligence/client-selector", () => ({
  ClientSelector: ({ selectedClientId }: any) => (
    <div data-testid="client-selector" data-selected={selectedClientId}>ClientSelector</div>
  ),
}));

jest.mock("@/app/dashboard/competitive-intelligence/citations/sync-button", () => ({
  SyncButton: ({ clientId }: any) => (
    <button data-testid="sync-button" data-client-id={clientId}>Sync LLMrefs</button>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

jest.mock("lucide-react", () => ({
  Target: () => <svg data-testid="target-icon" />,
}));

import CitationsPage from "@/app/dashboard/competitive-intelligence/citations/page";
import { getClients, getAiCitations } from "@/lib/supabase/queries";

// ── Fixtures ───────────────────────────────────────────────

const MOCK_CLIENTS = [
  { id: "client-1", name: "Acme Corp", domain: "acme.com" },
  { id: "client-2", name: "Beta Inc", domain: "beta.com" },
];

function createCitation(overrides = {}) {
  return {
    id: "cit-1",
    client_id: "client-1",
    platform: "ChatGPT",
    query: "content marketing",
    cited: true,
    share_of_voice: 0.35,
    citation_url: "https://example.com",
    citation_context: null,
    tracked_at: "2026-03-01T00:00:00Z",
    data: {},
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("CitationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAiCitations as jest.Mock).mockResolvedValue([]);
  });

  const makeSearchParams = (clientId?: string) => Promise.resolve({ clientId });

  it("renders empty state when no clients exist", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: [] });

    const page = await CitationsPage({ searchParams: makeSearchParams() });
    render(page);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No clients yet")).toBeInTheDocument();
  });

  it("renders the AI Citations heading", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });

    const page = await CitationsPage({ searchParams: makeSearchParams() });
    render(page);

    expect(screen.getByText("AI Citations")).toBeInTheDocument();
  });

  it("renders ClientSelector when clients exist", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByTestId("client-selector")).toBeInTheDocument();
  });

  it("renders SyncButton with the selected clientId", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    const syncBtn = screen.getByTestId("sync-button");
    expect(syncBtn).toHaveAttribute("data-client-id", "client-1");
  });

  it("uses the first client when no clientId is in searchParams", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });

    const page = await CitationsPage({ searchParams: makeSearchParams() });
    render(page);

    expect(getAiCitations).toHaveBeenCalledWith("client-1");
  });

  it("uses the first client when provided clientId is not in the clients list", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });

    const page = await CitationsPage({ searchParams: makeSearchParams("unknown-client") });
    render(page);

    expect(getAiCitations).toHaveBeenCalledWith("client-1");
  });

  it("renders CitationTracker and CitationTrendChart", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByTestId("citation-tracker")).toBeInTheDocument();
    expect(screen.getByTestId("citation-trend-chart")).toBeInTheDocument();
  });

  it("renders total citations count", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ cited: true }),
      createCitation({ id: "cit-2", cited: false }),
      createCitation({ id: "cit-3", cited: true }),
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByText("Total Citations")).toBeInTheDocument();
    // 2 out of 3 citations are cited = count should be 2
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders platforms tracked and shows platform badges", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ platform: "ChatGPT" }),
      createCitation({ id: "cit-2", platform: "Perplexity" }),
      createCitation({ id: "cit-3", platform: "ChatGPT" }), // duplicate
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByText("Platforms Tracked")).toBeInTheDocument();
    // Platform badges appear in both the summary section and the table
    expect(screen.getAllByText("ChatGPT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Perplexity").length).toBeGreaterThan(0);
  });

  it("renders em dash for avg SOV when there are no citations", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the Recent Citations table when citations exist", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ query: "brand building", platform: "Gemini" }),
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByText("Recent Citations")).toBeInTheDocument();
    expect(screen.getByText("brand building")).toBeInTheDocument();
  });

  it("renders platform badges in the citations table", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ platform: "Gemini" }),
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    // "Gemini" appears in both the platforms badge list and the table — use getAllByText
    const geminiElements = screen.getAllByText("Gemini");
    expect(geminiElements.length).toBeGreaterThan(0);
  });

  it("renders Yes badge for cited citations", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ cited: true }),
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders No badge for non-cited citations", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ cited: false }),
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders em dash for null share_of_voice in table", async () => {
    (getClients as jest.Mock).mockResolvedValue({ data: MOCK_CLIENTS });
    (getAiCitations as jest.Mock).mockResolvedValue([
      createCitation({ share_of_voice: null }),
    ]);

    const page = await CitationsPage({ searchParams: makeSearchParams("client-1") });
    render(page);

    // Multiple em dashes may exist (avg SOV stat + table); at least one should be present
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
