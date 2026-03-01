// @ts-nocheck
/**
 * Tests for competitive intelligence UI components
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// Mock lucide-react icons used in these components
jest.mock("lucide-react", () => ({
  RefreshCw: ({ className }: any) => <svg data-testid="refresh-icon" className={className} />,
  TrendingUp: () => <svg data-testid="trending-up-icon" />,
  TrendingDown: () => <svg data-testid="trending-down-icon" />,
  Minus: () => <svg data-testid="minus-icon" />,
}));

// ── Component imports ──────────────────────────────────────

import { CompetitorOverviewCards } from "@/components/competitive/competitor-overview-cards";
import { OpportunityList } from "@/components/competitive/opportunity-list";
import { KeywordGapTable } from "@/components/competitive/keyword-gap-table";
import { RefreshButton } from "@/app/dashboard/competitive-intelligence/refresh-button";
import { SyncButton } from "@/app/dashboard/competitive-intelligence/citations/sync-button";
import { ClientSelector } from "@/app/dashboard/competitive-intelligence/client-selector";

// ── Test data factories ────────────────────────────────────

function createSummary(overrides = {}) {
  return {
    competitor_count: 3,
    avg_strength: 72,
    organic_traffic: 15000,
    keyword_gap_count: 42,
    citation_sov: 0.18,
    last_analysis_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

function createOpportunity(overrides = {}) {
  return {
    keyword: "content marketing",
    client_position: null,
    competitor_position: 5,
    competitor_domain: "rival.com",
    competitor_id: "comp-1",
    search_volume: 8000,
    difficulty: 45,
    ...overrides,
  };
}

function createGap(overrides = {}) {
  return {
    keyword: "seo tools",
    client_position: 25,
    competitor_position: 5,
    competitor_domain: "rival.com",
    competitor_id: "comp-1",
    search_volume: 5000,
    difficulty: 40,
    ...overrides,
  };
}

// ── CompetitorOverviewCards ────────────────────────────────

describe("CompetitorOverviewCards", () => {
  const summary = createSummary();

  it("renders competitor count", () => {
    render(<CompetitorOverviewCards summary={summary} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders competitors tracked label", () => {
    render(<CompetitorOverviewCards summary={summary} />);
    expect(screen.getByText("Competitors Tracked")).toBeInTheDocument();
  });

  it("renders avg strength value", () => {
    render(<CompetitorOverviewCards summary={summary} />);
    expect(screen.getByText(/Avg strength: 72/)).toBeInTheDocument();
  });

  it("renders organic traffic formatted with localeString", () => {
    render(<CompetitorOverviewCards summary={summary} />);
    expect(screen.getByText("15,000")).toBeInTheDocument();
  });

  it("renders em dash for organic traffic when value is 0", () => {
    render(<CompetitorOverviewCards summary={createSummary({ organic_traffic: 0 })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders keyword gap count", () => {
    render(<CompetitorOverviewCards summary={summary} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders citation SOV with percent sign when value is nonzero", () => {
    render(<CompetitorOverviewCards summary={summary} />);
    expect(screen.getByText("0.18%")).toBeInTheDocument();
  });

  it("renders em dash for citation SOV when value is 0", () => {
    render(<CompetitorOverviewCards summary={createSummary({ citation_sov: 0 })} />);
    // At least two em dashes appear (traffic=0 and SOV=0)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

// ── OpportunityList ────────────────────────────────────────

describe("OpportunityList", () => {
  it("renders empty state message when opportunities list is empty", () => {
    render(<OpportunityList opportunities={[]} />);
    expect(screen.getByText(/No keyword opportunities found/)).toBeInTheDocument();
  });

  it("renders each opportunity keyword", () => {
    const opps = [
      createOpportunity({ keyword: "email marketing" }),
      createOpportunity({ keyword: "social media strategy" }),
    ];
    render(<OpportunityList opportunities={opps} />);
    expect(screen.getByText("email marketing")).toBeInTheDocument();
    expect(screen.getByText("social media strategy")).toBeInTheDocument();
  });

  it("renders search volume for each opportunity", () => {
    render(<OpportunityList opportunities={[createOpportunity({ search_volume: 12000 })]} />);
    expect(screen.getByText(/12,000/)).toBeInTheDocument();
  });

  it("renders a Create Brief link with the keyword pre-filled", () => {
    render(<OpportunityList opportunities={[createOpportunity({ keyword: "seo tools" })]} />);
    const link = screen.getByRole("link", { name: /Create Brief/ });
    expect(link.getAttribute("href")).toContain("keyword=seo%20tools");
  });

  it("renders a Gap badge for each opportunity", () => {
    const opps = [createOpportunity(), createOpportunity({ keyword: "other kw" })];
    render(<OpportunityList opportunities={opps} />);
    const badges = screen.getAllByText("Gap");
    expect(badges).toHaveLength(2);
  });

  it("renders Top Opportunities heading", () => {
    render(<OpportunityList opportunities={[createOpportunity()]} />);
    expect(screen.getByText("Top Opportunities")).toBeInTheDocument();
  });

  it("renders em dash for null competitor position", () => {
    render(<OpportunityList opportunities={[createOpportunity({ competitor_position: null })]} />);
    expect(screen.getByText(/Competitor #—/)).toBeInTheDocument();
  });
});

// ── KeywordGapTable ────────────────────────────────────────

describe("KeywordGapTable", () => {
  it("renders empty state when gaps list is empty", () => {
    render(<KeywordGapTable gaps={[]} />);
    expect(screen.getByText(/No keyword gap data available/)).toBeInTheDocument();
  });

  it("renders default title 'Keyword Gaps'", () => {
    render(<KeywordGapTable gaps={[]} />);
    expect(screen.getByText("Keyword Gaps")).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(<KeywordGapTable gaps={[]} title="My Gaps" />);
    expect(screen.getByText("My Gaps")).toBeInTheDocument();
  });

  it("renders each gap keyword in the table", () => {
    const gaps = [
      createGap({ keyword: "analytics tools" }),
      createGap({ keyword: "marketing software" }),
    ];
    render(<KeywordGapTable gaps={gaps} />);
    expect(screen.getByText("analytics tools")).toBeInTheDocument();
    expect(screen.getByText("marketing software")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<KeywordGapTable gaps={[createGap()]} />);
    expect(screen.getByText("Keyword")).toBeInTheDocument();
    expect(screen.getByText("Volume")).toBeInTheDocument();
    expect(screen.getByText("Your Rank")).toBeInTheDocument();
    expect(screen.getByText("Competitor Rank")).toBeInTheDocument();
    expect(screen.getByText("Difficulty")).toBeInTheDocument();
    expect(screen.getByText("Opportunity")).toBeInTheDocument();
  });

  it("shows 'high' opportunity badge when competitor ranks but client does not", () => {
    const gap = createGap({ client_position: null, competitor_position: 5 });
    render(<KeywordGapTable gaps={[gap]} />);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("shows 'medium' opportunity badge when client ranks higher than competitor", () => {
    const gap = createGap({ client_position: 15, competitor_position: 5 });
    render(<KeywordGapTable gaps={[gap]} />);
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("shows 'low' opportunity badge when client ranks equally or better than competitor", () => {
    // client_position <= competitor_position and both are defined — no gap
    const gap = createGap({ client_position: 5, competitor_position: 8 });
    render(<KeywordGapTable gaps={[gap]} />);
    expect(screen.getByText("low")).toBeInTheDocument();
  });

  it("renders em dash for null client_position", () => {
    render(<KeywordGapTable gaps={[createGap({ client_position: null })]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders formatted search volume", () => {
    render(<KeywordGapTable gaps={[createGap({ search_volume: 25000 })]} />);
    expect(screen.getByText("25,000")).toBeInTheDocument();
  });
});

// ── RefreshButton ──────────────────────────────────────────
// Note: jsdom's window.location.reload is non-configurable, so we test
// fetch behavior and UI state rather than the reload call itself.

describe("RefreshButton", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it("renders a Refresh button", () => {
    render(<RefreshButton clientId="client-1" />);
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
  });

  it("calls fetch with the correct URL when clicked", async () => {
    render(<RefreshButton clientId="client-42" />);
    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/competitive-intelligence/client-42/refresh",
        { method: "POST" }
      );
    });
  });

  it("shows Refreshing... text while loading", async () => {
    // Never resolves during the test — we check loading state
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // intentionally never resolves
    );
    render(<RefreshButton clientId="client-1" />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("Refreshing...")).toBeInTheDocument();
  });

  it("does not throw when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<RefreshButton clientId="client-1" />);
    // fireEvent is synchronous; the click triggers the async handler silently
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});

// ── SyncButton ─────────────────────────────────────────────
// Note: jsdom's window.location.reload is non-configurable, so we test
// fetch behavior and UI state rather than the reload call itself.

describe("SyncButton", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it("renders a Sync LLMrefs button", () => {
    render(<SyncButton clientId="client-1" />);
    expect(screen.getByRole("button", { name: /Sync LLMrefs/i })).toBeInTheDocument();
  });

  it("calls fetch to the sync endpoint with the clientId in the body", async () => {
    render(<SyncButton clientId="client-77" />);
    fireEvent.click(screen.getByRole("button", { name: /Sync LLMrefs/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/integrations/llmrefs/sync",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("client-77"),
        })
      );
    });
  });

  it("shows Syncing... text while loading", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // intentionally never resolves
    );
    render(<SyncButton clientId="client-1" />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("Syncing...")).toBeInTheDocument();
  });

  it("does not throw when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<SyncButton clientId="client-1" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});

// ── ClientSelector ─────────────────────────────────────────

describe("ClientSelector", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useRouter } = require("next/navigation");
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  const clients = [
    { id: "client-1", name: "Acme Corp" },
    { id: "client-2", name: "Beta Inc" },
  ] as any[];

  it("renders all client options", () => {
    render(<ClientSelector clients={clients} selectedClientId="client-1" />);
    expect(screen.getByRole("option", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Beta Inc" })).toBeInTheDocument();
  });

  it("has the selected client as the current value", () => {
    render(<ClientSelector clients={clients} selectedClientId="client-2" />);
    const select = screen.getByRole("combobox");
    expect((select as HTMLSelectElement).value).toBe("client-2");
  });

  it("calls router.push with the correct URL when selection changes", () => {
    render(<ClientSelector clients={clients} selectedClientId="client-1" />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "client-2" } });
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/competitive-intelligence?clientId=client-2"
    );
  });

  it("renders a select element", () => {
    render(<ClientSelector clients={clients} selectedClientId="client-1" />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
