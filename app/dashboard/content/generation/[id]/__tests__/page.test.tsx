// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("@/lib/supabase/queries", () => ({
  getGeneratedContent: jest.fn(),
  getQualityAnalysis: jest.fn(),
  getContentBrief: jest.fn(),
}));

jest.mock("@/components/content/content-editor", () => ({
  ContentEditor: ({ content }: { content: any }) => (
    <div data-testid="content-editor">{content.body_text || "No body"}</div>
  ),
}));

jest.mock("@/components/content/quality-score-display", () => ({
  QualityScoreDisplay: ({ analysis }: { analysis: any }) => (
    <div data-testid="quality-score">{analysis ? "Has score" : "No score"}</div>
  ),
}));

jest.mock("@/components/content/review-panel", () => ({
  ReviewPanel: ({ contentId }: { contentId: string }) => (
    <div data-testid="review-panel" data-content-id={contentId}>Review Panel</div>
  ),
}));

jest.mock("@/components/ui/submit-button", () => ({
  SubmitButton: ({ children }: { children: React.ReactNode }) => (
    <button type="submit">{children}</button>
  ),
}));

import GenerationPage from "@/app/dashboard/content/generation/[id]/page";
import { getGeneratedContent, getQualityAnalysis, getContentBrief } from "@/lib/supabase/queries";

const mockContent = {
  id: "content-1",
  title: "SEO Guide 2024",
  body_text: "This is the content body.",
  status: "generated",
  brief_id: "brief-1",
  word_count: 1200,
  ai_model_used: "claude-3-sonnet",
};

const mockBrief = {
  id: "brief-1",
  title: "SEO Content Brief",
  target_keyword: "seo tools",
};

const mockParams = Promise.resolve({ id: "content-1" });

describe("GenerationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getQualityAnalysis as jest.Mock).mockResolvedValue(null);
    (getContentBrief as jest.Mock).mockResolvedValue(null);
  });

  it("renders content title as heading", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue(mockContent);
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByText("SEO Guide 2024")).toBeInTheDocument();
  });

  it("renders fallback title when content title is absent", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue({ ...mockContent, title: null });
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByText("Generated Content")).toBeInTheDocument();
  });

  it("renders ContentEditor component", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue(mockContent);
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByTestId("content-editor")).toBeInTheDocument();
  });

  it("renders QualityScoreDisplay component", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue(mockContent);
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByTestId("quality-score")).toBeInTheDocument();
  });

  it("calls notFound when content does not exist", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue(null);
    await expect(GenerationPage({ params: mockParams })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders brief info when brief is available", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue(mockContent);
    (getContentBrief as jest.Mock).mockResolvedValue(mockBrief);
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByText(/SEO Content Brief/)).toBeInTheDocument();
    expect(screen.getByText(/seo tools/)).toBeInTheDocument();
  });

  it("renders Review Panel when content status is generated", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue({ ...mockContent, status: "generated" });
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByTestId("review-panel")).toBeInTheDocument();
  });

  it("renders Review Panel when content status is reviewing", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue({ ...mockContent, status: "reviewing" });
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByTestId("review-panel")).toBeInTheDocument();
  });

  it("does not render Review Panel for published content", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue({ ...mockContent, status: "published" });
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.queryByTestId("review-panel")).not.toBeInTheDocument();
  });

  it("renders Back to Content link", async () => {
    (getGeneratedContent as jest.Mock).mockResolvedValue(mockContent);
    const page = await GenerationPage({ params: mockParams });
    render(page);
    expect(screen.getByRole("link", { name: /back to content/i })).toHaveAttribute("href", "/dashboard/content");
  });
});
