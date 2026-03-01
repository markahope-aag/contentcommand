// @ts-nocheck
/**
 * Tests for competitive intelligence chart and comparison components:
 * - CitationTracker
 * - CitationTrendChart
 * - CompetitiveTrendChart
 * - DomainComparison
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

import { CitationTracker } from "@/components/competitive/citation-tracker";
import { CitationTrendChart } from "@/components/competitive/citation-trend-chart";
import { CompetitiveTrendChart } from "@/components/competitive/competitive-trend-chart";
import { DomainComparison } from "@/components/competitive/domain-comparison";

// ── Test data factories ────────────────────────────────────

function createCitation(overrides = {}) {
  return {
    id: "cit-1",
    client_id: "client-1",
    platform: "ChatGPT",
    query: "content marketing",
    cited: true,
    share_of_voice: 0.35,
    citation_url: "https://example.com",
    citation_context: "Great example",
    tracked_at: "2026-03-01T00:00:00Z",
    data: {},
    ...overrides,
  } as any;
}

function createMetricsHistory(overrides = {}) {
  return {
    id: "hist-1",
    client_id: "client-1",
    metric_type: "organic_traffic",
    metric_value: 10000,
    recorded_at: "2026-03-01T00:00:00Z",
    ...overrides,
  } as any;
}

function createCompetitor(overrides = {}) {
  return {
    id: "comp-1",
    client_id: "client-1",
    name: "Rival Co",
    domain: "rival.com",
    strength_score: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as any;
}

// ── CitationTracker ────────────────────────────────────────

describe("CitationTracker", () => {
  it("renders empty state when no citations are provided", () => {
    render(<CitationTracker citations={[]} />);
    expect(screen.getByText(/No citation data available/)).toBeInTheDocument();
  });

  it("renders the card title", () => {
    render(<CitationTracker citations={[]} />);
    expect(screen.getByText("Share of Voice by Platform")).toBeInTheDocument();
  });

  it("renders a bar chart when citations are provided", () => {
    const citations = [
      createCitation({ platform: "ChatGPT", cited: true, share_of_voice: 0.4 }),
      createCitation({ platform: "Perplexity", cited: false, share_of_voice: 0.2 }),
    ];
    render(<CitationTracker citations={citations} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("renders the chart title when data is present", () => {
    render(<CitationTracker citations={[createCitation()]} />);
    expect(screen.getByText("Share of Voice by Platform")).toBeInTheDocument();
  });

  it("aggregates citations from the same platform", () => {
    // Two citations from the same platform — should not throw
    const citations = [
      createCitation({ platform: "ChatGPT", cited: true, share_of_voice: 0.3 }),
      createCitation({ platform: "ChatGPT", cited: false, share_of_voice: 0.1 }),
    ];
    render(<CitationTracker citations={citations} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("handles citations with null share_of_voice", () => {
    const citations = [createCitation({ share_of_voice: null })];
    render(<CitationTracker citations={citations} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});

// ── CitationTrendChart ─────────────────────────────────────

describe("CitationTrendChart", () => {
  it("renders empty state when no citations are provided", () => {
    render(<CitationTrendChart citations={[]} />);
    expect(screen.getByText(/No citation trend data available/)).toBeInTheDocument();
  });

  it("renders the Citation Trends title", () => {
    render(<CitationTrendChart citations={[]} />);
    expect(screen.getByText("Citation Trends")).toBeInTheDocument();
  });

  it("renders a line chart when citations are provided", () => {
    const citations = [
      createCitation({ tracked_at: "2026-02-28T00:00:00Z" }),
      createCitation({ tracked_at: "2026-03-01T00:00:00Z" }),
    ];
    render(<CitationTrendChart citations={citations} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("groups multiple citations on the same date without error", () => {
    const citations = [
      createCitation({ tracked_at: "2026-03-01T08:00:00Z", cited: true }),
      createCitation({ tracked_at: "2026-03-01T20:00:00Z", cited: false }),
    ];
    render(<CitationTrendChart citations={citations} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("handles citations with null share_of_voice gracefully", () => {
    const citations = [createCitation({ share_of_voice: null, tracked_at: "2026-03-01T00:00:00Z" })];
    render(<CitationTrendChart citations={citations} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});

// ── CompetitiveTrendChart ──────────────────────────────────

describe("CompetitiveTrendChart", () => {
  it("renders empty state when data array is empty", () => {
    render(<CompetitiveTrendChart data={[]} />);
    expect(screen.getByText(/No trend data available yet/)).toBeInTheDocument();
  });

  it("renders default title 'Trends' when not provided", () => {
    render(<CompetitiveTrendChart data={[]} />);
    expect(screen.getByText("Trends")).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(<CompetitiveTrendChart data={[]} title="Organic Traffic Trends" />);
    expect(screen.getByText("Organic Traffic Trends")).toBeInTheDocument();
  });

  it("renders a line chart when data is provided", () => {
    const data = [
      createMetricsHistory({ recorded_at: "2026-02-28T00:00:00Z", metric_value: 9000 }),
      createMetricsHistory({ recorded_at: "2026-03-01T00:00:00Z", metric_value: 10000 }),
    ];
    render(<CompetitiveTrendChart data={data} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("uses metricLabel prop for chart labeling", () => {
    const data = [createMetricsHistory()];
    // Just verify it renders without error with custom metricLabel
    render(<CompetitiveTrendChart data={data} metricLabel="Traffic" />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});

// ── DomainComparison ───────────────────────────────────────

describe("DomainComparison", () => {
  const clientMetrics = {
    organic_traffic: 15000,
    organic_keywords: 500,
    backlinks: 1200,
    domain_rank: 45,
  };

  const competitorMetrics = {
    organic_traffic: 10000,
    organic_keywords: 300,
    backlinks: 800,
    domain_rank: 38,
  };

  it("renders Domain Comparison heading", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor()}
      />
    );
    expect(screen.getByText("Domain Comparison")).toBeInTheDocument();
  });

  it("renders the client domain", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor({ domain: "rival.com" })}
      />
    );
    expect(screen.getByText("acme.com")).toBeInTheDocument();
  });

  it("renders the competitor domain", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor({ domain: "rival.com" })}
      />
    );
    expect(screen.getByText("rival.com")).toBeInTheDocument();
  });

  it("renders 'vs' between domains", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor()}
      />
    );
    expect(screen.getByText("vs")).toBeInTheDocument();
  });

  it("renders metric row labels", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor()}
        competitorMetrics={competitorMetrics}
      />
    );
    expect(screen.getByText("Organic Traffic")).toBeInTheDocument();
    expect(screen.getByText("Keywords")).toBeInTheDocument();
    expect(screen.getByText("Backlinks")).toBeInTheDocument();
    expect(screen.getByText("Domain Rank")).toBeInTheDocument();
  });

  it("renders formatted metric values", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor()}
        competitorMetrics={competitorMetrics}
      />
    );
    expect(screen.getByText("15,000")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });

  it("renders em dash for zero metric values", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={{ organic_traffic: 0 }}
        competitor={createCompetitor()}
      />
    );
    // At least one em dash should be rendered for the zero value
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders without competitor metrics (optional prop)", () => {
    render(
      <DomainComparison
        clientDomain="acme.com"
        clientMetrics={clientMetrics}
        competitor={createCompetitor()}
      />
    );
    expect(screen.getByText("Domain Comparison")).toBeInTheDocument();
  });
});
