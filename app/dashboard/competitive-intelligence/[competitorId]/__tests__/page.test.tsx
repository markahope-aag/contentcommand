// @ts-nocheck
/**
 * Tests for the competitor detail page
 * app/dashboard/competitive-intelligence/[competitorId]/page.tsx
 */

import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/queries", () => ({
  getKeywordGaps: jest.fn(),
  getCompetitiveMetricsHistory: jest.fn(),
  getCompetitiveAnalysis: jest.fn(),
}));

jest.mock("@/components/competitive/domain-comparison", () => ({
  DomainComparison: ({ clientDomain, competitor }: any) => (
    <div data-testid="domain-comparison">{clientDomain} vs {competitor.domain}</div>
  ),
}));

jest.mock("@/components/competitive/keyword-gap-table", () => ({
  KeywordGapTable: ({ gaps, title }: any) => (
    <div data-testid="keyword-gap-table" data-count={gaps.length}>{title}</div>
  ),
}));

jest.mock("@/components/competitive/competitive-trend-chart", () => ({
  CompetitiveTrendChart: ({ title }: any) => (
    <div data-testid="competitive-trend-chart">{title}</div>
  ),
}));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

import CompetitorDetailPage from "@/app/dashboard/competitive-intelligence/[competitorId]/page";
import { createClient } from "@/lib/supabase/server";
import {
  getKeywordGaps,
  getCompetitiveMetricsHistory,
  getCompetitiveAnalysis,
} from "@/lib/supabase/queries";

// ── Fixtures ───────────────────────────────────────────────

const MOCK_COMPETITOR = {
  id: "comp-1",
  client_id: "client-1",
  name: "Rival Corp",
  domain: "rival.com",
  competitive_strength: 75,
  created_at: "2026-01-01T00:00:00Z",
};

const MOCK_CLIENT = {
  id: "client-1",
  name: "Acme Corp",
  domain: "acme.com",
};

function buildSupabaseClient(competitorData: any, clientData: any) {
  const competitorChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: competitorData }),
  };
  const clientChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: clientData }),
  };
  return {
    from: jest.fn((table: string) => {
      if (table === "competitors") return competitorChain;
      if (table === "clients") return clientChain;
      return competitorChain;
    }),
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("CompetitorDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getKeywordGaps as jest.Mock).mockResolvedValue([]);
    (getCompetitiveMetricsHistory as jest.Mock).mockResolvedValue([]);
    (getCompetitiveAnalysis as jest.Mock).mockResolvedValue([]);
  });

  const makeParams = (competitorId: string) => Promise.resolve({ competitorId });
  const makeSearchParams = (clientId?: string) => Promise.resolve({ clientId });

  it("renders competitor name as heading", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, MOCK_CLIENT)
    );

    const page = await CompetitorDetailPage({
      params: makeParams("comp-1"),
      searchParams: makeSearchParams("client-1"),
    });
    render(page);

    expect(screen.getByText("Rival Corp")).toBeInTheDocument();
  });

  it("calls notFound when competitor does not exist", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(null, MOCK_CLIENT)
    );

    await expect(
      CompetitorDetailPage({
        params: makeParams("comp-missing"),
        searchParams: makeSearchParams(),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when client does not exist", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, null)
    );

    await expect(
      CompetitorDetailPage({
        params: makeParams("comp-1"),
        searchParams: makeSearchParams(),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders DomainComparison component", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, MOCK_CLIENT)
    );

    const page = await CompetitorDetailPage({
      params: makeParams("comp-1"),
      searchParams: makeSearchParams("client-1"),
    });
    render(page);

    expect(screen.getByTestId("domain-comparison")).toBeInTheDocument();
  });

  it("renders KeywordGapTable with gap count", async () => {
    const gaps = [
      { keyword: "seo tools", competitor_position: 5, client_position: null, search_volume: 5000, difficulty: 40, competitor_domain: "rival.com", competitor_id: "comp-1" },
    ];
    (getKeywordGaps as jest.Mock).mockResolvedValue(gaps);
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, MOCK_CLIENT)
    );

    const page = await CompetitorDetailPage({
      params: makeParams("comp-1"),
      searchParams: makeSearchParams("client-1"),
    });
    render(page);

    const table = screen.getByTestId("keyword-gap-table");
    expect(table).toHaveAttribute("data-count", "1");
  });

  it("uses competitor.client_id when no clientId in searchParams", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, MOCK_CLIENT)
    );

    const page = await CompetitorDetailPage({
      params: makeParams("comp-1"),
      searchParams: makeSearchParams(undefined),
    });
    render(page);

    expect(screen.getByTestId("domain-comparison")).toBeInTheDocument();
  });

  it("renders Back link to competitive intelligence page", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, MOCK_CLIENT)
    );

    const page = await CompetitorDetailPage({
      params: makeParams("comp-1"),
      searchParams: makeSearchParams("client-1"),
    });
    render(page);

    const backLink = screen.getByText(/Back/);
    expect(backLink.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/competitive-intelligence?clientId=client-1"
    );
  });

  it("renders competitor strength score", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseClient(MOCK_COMPETITOR, MOCK_CLIENT)
    );

    const page = await CompetitorDetailPage({
      params: makeParams("comp-1"),
      searchParams: makeSearchParams("client-1"),
    });
    render(page);

    expect(screen.getByText(/75\/100/)).toBeInTheDocument();
  });
});
