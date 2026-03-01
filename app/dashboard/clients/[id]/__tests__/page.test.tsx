// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("@/lib/supabase/queries", () => ({
  getClient: jest.fn(),
  getCompetitors: jest.fn(),
  getAllContentBriefs: jest.fn(),
  getContentQueue: jest.fn(),
}));

jest.mock("@/components/clients/competitor-actions", () => ({
  CompetitorActions: ({ clientId }: { clientId: string }) => (
    <div data-testid="competitor-actions" data-client-id={clientId}>Add Competitor</div>
  ),
}));

import ClientDetailPage from "@/app/dashboard/clients/[id]/page";
import { getClient, getCompetitors, getAllContentBriefs, getContentQueue } from "@/lib/supabase/queries";

const mockClient = {
  id: "client-1",
  name: "Acme Corp",
  domain: "acme.com",
  industry: "Technology",
  target_keywords: ["seo", "content marketing"],
  brand_voice: "Professional",
  created_at: "2024-01-01T00:00:00Z",
};

const mockParams = Promise.resolve({ id: "client-1" });

describe("ClientDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCompetitors as jest.Mock).mockResolvedValue({ data: [], count: 0 });
    (getAllContentBriefs as jest.Mock).mockResolvedValue({ data: [], count: 0 });
    (getContentQueue as jest.Mock).mockResolvedValue({ data: [], count: 0 });
  });

  it("renders client name as heading", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders client domain", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    expect(screen.getByText("acme.com")).toBeInTheDocument();
  });

  it("renders Edit Client link", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    const editLink = screen.getByRole("link", { name: /edit client/i });
    expect(editLink).toHaveAttribute("href", "/dashboard/clients/client-1/edit");
  });

  it("calls notFound when client does not exist", async () => {
    (getClient as jest.Mock).mockResolvedValue(null);
    const { notFound } = await import("next/navigation");

    await expect(ClientDetailPage({ params: mockParams })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders competitor actions component", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    expect(screen.getByTestId("competitor-actions")).toBeInTheDocument();
  });

  it("renders empty state when no competitors exist", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    expect(screen.getByText(/no competitors/i)).toBeInTheDocument();
  });

  it("renders competitors table when competitors exist", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    (getCompetitors as jest.Mock).mockResolvedValue({
      data: [{ id: "comp-1", name: "Rival Corp", domain: "rival.com", competitive_strength: "high" }],
      count: 1,
    });
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    expect(screen.getByText("Rival Corp")).toBeInTheDocument();
  });

  it("renders target keywords from client data", async () => {
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    const page = await ClientDetailPage({ params: mockParams });
    render(page);
    expect(screen.getByText("seo")).toBeInTheDocument();
    expect(screen.getByText("content marketing")).toBeInTheDocument();
  });
});
