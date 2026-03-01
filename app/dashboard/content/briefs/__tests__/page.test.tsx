// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/supabase/queries", () => ({
  getAllContentBriefs: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("@/components/content/brief-card", () => ({
  BriefCard: ({ brief }: { brief: any }) => (
    <div data-testid="brief-card">{brief.title}</div>
  ),
}));

import BriefsPage from "@/app/dashboard/content/briefs/page";
import { getAllContentBriefs } from "@/lib/supabase/queries";

const mockBrief = {
  id: "b-1",
  title: "SEO Guide",
  target_keyword: "seo",
  status: "draft",
  priority_level: "high",
  content_type: "blog_post",
};

describe("BriefsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page heading", async () => {
    (getAllContentBriefs as jest.Mock).mockResolvedValue({ data: [] });
    const page = await BriefsPage();
    render(page);
    expect(screen.getByText("Content Briefs")).toBeInTheDocument();
  });

  it("renders New Brief button link", async () => {
    (getAllContentBriefs as jest.Mock).mockResolvedValue({ data: [] });
    const page = await BriefsPage();
    render(page);
    expect(screen.getByRole("link", { name: /new brief/i })).toHaveAttribute("href", "/dashboard/content/briefs/new");
  });

  it("renders empty state when no briefs exist", async () => {
    (getAllContentBriefs as jest.Mock).mockResolvedValue({ data: [] });
    const page = await BriefsPage();
    render(page);
    expect(screen.getByText("No content briefs")).toBeInTheDocument();
  });

  it("renders brief cards when briefs exist", async () => {
    (getAllContentBriefs as jest.Mock).mockResolvedValue({ data: [mockBrief] });
    const page = await BriefsPage();
    render(page);
    expect(screen.getByTestId("brief-card")).toBeInTheDocument();
    expect(screen.getByText("SEO Guide")).toBeInTheDocument();
  });

  it("renders multiple brief cards", async () => {
    const briefs = [
      { ...mockBrief, id: "b-1", title: "Brief One" },
      { ...mockBrief, id: "b-2", title: "Brief Two" },
    ];
    (getAllContentBriefs as jest.Mock).mockResolvedValue({ data: briefs });
    const page = await BriefsPage();
    render(page);
    expect(screen.getAllByTestId("brief-card")).toHaveLength(2);
  });
});
