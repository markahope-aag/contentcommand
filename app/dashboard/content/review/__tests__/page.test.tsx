// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/supabase/queries", () => ({
  getContentQueue: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

import ReviewPage from "@/app/dashboard/content/review/page";
import { getContentQueue } from "@/lib/supabase/queries";

const mockQueueItem = {
  id: "c-1",
  title: "Article Title",
  status: "generated",
  word_count: 1200,
  ai_model_used: "claude-3-sonnet",
  quality_score: 82,
  content_briefs: { target_keyword: "seo tools" },
};

describe("ReviewPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page heading", async () => {
    (getContentQueue as jest.Mock).mockResolvedValue({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("Review Queue")).toBeInTheDocument();
  });

  it("renders empty state when queue is empty", async () => {
    (getContentQueue as jest.Mock).mockResolvedValue({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("Review queue is empty")).toBeInTheDocument();
  });

  it("renders Back to Content link", async () => {
    (getContentQueue as jest.Mock).mockResolvedValue({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByRole("link", { name: /back to content/i })).toBeInTheDocument();
  });

  it("renders content title in table when items exist", async () => {
    (getContentQueue as jest.Mock)
      .mockResolvedValueOnce({ data: [mockQueueItem] })
      .mockResolvedValueOnce({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("Article Title")).toBeInTheDocument();
  });

  it("renders content keyword in table", async () => {
    (getContentQueue as jest.Mock)
      .mockResolvedValueOnce({ data: [mockQueueItem] })
      .mockResolvedValueOnce({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("seo tools")).toBeInTheDocument();
  });

  it("renders quality score badge when available", async () => {
    (getContentQueue as jest.Mock)
      .mockResolvedValueOnce({ data: [mockQueueItem] })
      .mockResolvedValueOnce({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("renders dash when quality score is not available", async () => {
    const itemNoScore = { ...mockQueueItem, quality_score: null };
    (getContentQueue as jest.Mock)
      .mockResolvedValueOnce({ data: [itemNoScore] })
      .mockResolvedValueOnce({ data: [] });
    const page = await ReviewPage();
    render(page);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders table header columns", async () => {
    (getContentQueue as jest.Mock)
      .mockResolvedValueOnce({ data: [mockQueueItem] })
      .mockResolvedValueOnce({ data: [] });
    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Keyword")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("calls getContentQueue with both status filters", async () => {
    (getContentQueue as jest.Mock).mockResolvedValue({ data: [] });
    await ReviewPage();
    expect(getContentQueue).toHaveBeenCalledWith({ status: "generated" });
    expect(getContentQueue).toHaveBeenCalledWith({ status: "reviewing" });
  });

  it("combines items from both generated and reviewing queues", async () => {
    const generatedItem = { ...mockQueueItem, id: "c-1", status: "generated", title: "Generated Article" };
    const reviewingItem = { ...mockQueueItem, id: "c-2", status: "reviewing", title: "Reviewing Article" };

    (getContentQueue as jest.Mock)
      .mockResolvedValueOnce({ data: [generatedItem] })
      .mockResolvedValueOnce({ data: [reviewingItem] });

    const page = await ReviewPage();
    render(page);
    expect(screen.getByText("Generated Article")).toBeInTheDocument();
    expect(screen.getByText("Reviewing Article")).toBeInTheDocument();
  });
});
